/**
 * Phase 4: Synthesize
 *
 * Aggregates classification + deep analysis results into a final pattern report
 * with actionable recommendations for each system prompt section.
 *
 * Mostly local computation + 1 Sonnet call for qualitative synthesis.
 *
 * Usage: npx tsx scripts/synthesize.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  ClassificationResult,
  DeepAnalysisResult,
  PatternReport,
  GoldenPath,
  AntiPattern,
  ObjectionAnalysis,
  PromptRecommendation,
} from './types.js'
import { SONNET_MODEL, callClaudeWithRetry } from './lib/claude-client.js'

const OUTPUT_DIR = join(process.cwd(), 'scripts/output')
const CLASSIFICATIONS_PATH = join(OUTPUT_DIR, 'classifications.json')
const DEEP_ANALYSIS_PATH = join(OUTPUT_DIR, 'deep-analysis.json')
const REPORT_JSON_PATH = join(OUTPUT_DIR, 'pattern-report.json')
const REPORT_MD_PATH = join(OUTPUT_DIR, 'pattern-report.md')

// ---------------------------------------------------------------------------
// Distribution helpers
// ---------------------------------------------------------------------------

function countBy<T>(
  items: T[],
  key: (item: T) => string
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const k = key(item)
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

function topN(items: string[], n: number): { value: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const item of items) {
    counts[item] = (counts[item] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}

// ---------------------------------------------------------------------------
// Golden path extraction
// ---------------------------------------------------------------------------

function extractGoldenPaths(analyses: DeepAnalysisResult[]): GoldenPath[] {
  const booked = analyses.filter(
    (a) => a.classification.outcome === 'booked_call'
  )

  // Group by simplified flow pattern (first 8 steps as signature)
  const flowGroups = new Map<string, DeepAnalysisResult[]>()
  for (const a of booked) {
    const sig = a.conversationFlow.slice(0, 8).join(' → ')
    const group = flowGroups.get(sig) ?? []
    group.push(a)
    flowGroups.set(sig, group)
  }

  const paths: GoldenPath[] = []
  for (const [pattern, group] of flowGroups) {
    if (group.length < 2) continue // need at least 2 examples
    paths.push({
      pattern,
      exampleConversationIds: group.map((g) => g.conversationId).slice(0, 5),
      frequency: group.length,
      avgMessagesToBooking: Math.round(
        group.reduce((s, g) => s + g.conversationFlow.length, 0) / group.length
      ),
    })
  }

  return paths.sort((a, b) => b.frequency - a.frequency)
}

// ---------------------------------------------------------------------------
// Anti-pattern extraction
// ---------------------------------------------------------------------------

function extractAntiPatterns(analyses: DeepAnalysisResult[]): AntiPattern[] {
  const failed = analyses.filter(
    (a) =>
      a.classification.outcome === 'went_silent' ||
      a.classification.outcome === 'objection_unresolved' ||
      a.classification.outcome === 'opted_out'
  )

  // Group by stage where it failed
  const stageGroups = new Map<string, DeepAnalysisResult[]>()
  for (const a of failed) {
    const stage = a.classification.stageReached
    const group = stageGroups.get(stage) ?? []
    group.push(a)
    stageGroups.set(stage, group)
  }

  const patterns: AntiPattern[] = []
  for (const [stage, group] of stageGroups) {
    // Find the most common ineffective techniques in this stage
    const allIneffective = group.flatMap((g) => g.ineffectiveTechniques)
    const topIssues = topN(allIneffective, 3)

    patterns.push({
      pattern: `Conversations dying at ${stage} stage. Top issues: ${topIssues.map((t) => `"${t.value.slice(0, 80)}..." (${t.count}x)`).join('; ')}`,
      exampleConversationIds: group
        .sort((a, b) => a.goldenPathScore - b.goldenPathScore)
        .map((g) => g.conversationId)
        .slice(0, 5),
      frequency: group.length,
      stageWhereItFails: stage as AntiPattern['stageWhereItFails'],
    })
  }

  return patterns.sort((a, b) => b.frequency - a.frequency)
}

// ---------------------------------------------------------------------------
// Objection analysis
// ---------------------------------------------------------------------------

function analyzeObjections(
  classifications: ClassificationResult[],
  analyses: DeepAnalysisResult[]
): ObjectionAnalysis[] {
  // Collect all objection types
  const allObjections = classifications.flatMap((c) => c.objectionTypes)
  const objectionCounts = countBy(allObjections, (o) => o)

  const analysisMap = new Map(analyses.map((a) => [a.conversationId, a]))

  const results: ObjectionAnalysis[] = []

  for (const [objType, frequency] of Object.entries(objectionCounts)) {
    if (frequency < 3) continue // need meaningful sample

    // Find conversations with this objection
    const convosWithObjection = classifications.filter((c) =>
      c.objectionTypes.includes(objType)
    )

    // Resolution = booked_call or email_captured
    const resolved = convosWithObjection.filter(
      (c) => c.outcome === 'booked_call' || c.outcome === 'email_captured'
    )

    // Find best/worst responses from deep analysis
    const bestResponses: string[] = []
    const worstResponses: string[] = []

    for (const c of convosWithObjection) {
      const analysis = analysisMap.get(c.conversationId)
      if (!analysis) continue

      if (c.outcome === 'booked_call' || c.outcome === 'email_captured') {
        bestResponses.push(
          ...analysis.effectiveTechniques
            .filter(
              (t) =>
                t.toLowerCase().includes('objection') ||
                t.toLowerCase().includes(objType)
            )
            .slice(0, 2)
        )
      } else {
        worstResponses.push(
          ...analysis.ineffectiveTechniques
            .filter(
              (t) =>
                t.toLowerCase().includes('objection') ||
                t.toLowerCase().includes(objType)
            )
            .slice(0, 2)
        )
      }
    }

    results.push({
      objectionType: objType,
      frequency,
      resolutionRate: resolved.length / convosWithObjection.length,
      bestResponses: [...new Set(bestResponses)].slice(0, 5),
      worstResponses: [...new Set(worstResponses)].slice(0, 5),
    })
  }

  return results.sort((a, b) => b.frequency - a.frequency)
}

// ---------------------------------------------------------------------------
// Aggregate prompt recommendations locally
// ---------------------------------------------------------------------------

function aggregatePromptRecommendations(
  analyses: DeepAnalysisResult[]
): Record<string, { observations: string[]; improvements: string[] }> {
  const sections: Record<
    string,
    { observations: string[]; improvements: string[] }
  > = {}

  for (const a of analyses) {
    for (const ps of a.promptSections) {
      if (!sections[ps.section]) {
        sections[ps.section] = { observations: [], improvements: [] }
      }
      sections[ps.section].observations.push(ps.observation)
      if (ps.suggestedImprovement) {
        sections[ps.section].improvements.push(ps.suggestedImprovement)
      }
    }
  }

  return sections
}

// ---------------------------------------------------------------------------
// Synthesize with Claude — final qualitative pass
// ---------------------------------------------------------------------------

async function synthesizeWithClaude(
  report: Omit<PatternReport, 'promptRecommendations'>,
  rawSections: Record<
    string,
    { observations: string[]; improvements: string[] }
  >,
  neverSayList: string[],
  effectiveList: string[],
  toneInsights: string[]
): Promise<PromptRecommendation[]> {
  const prompt = `You are synthesizing conversation analysis data into specific, actionable system prompt recommendations for an AI Instagram DM appointment setter for a vending machine business (VendingPreneurs).

Below is aggregated data from ${report.totalConversations} classified conversations and deep analysis of the highest-value subset. Your job is to produce ONE definitive recommendation per prompt section.

## Outcome Distribution
${Object.entries(report.outcomeDistribution)
  .sort((a, b) => (b[1] as number) - (a[1] as number))
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

## Golden Paths (most common booking flows)
${report.goldenPaths
  .slice(0, 5)
  .map(
    (g) =>
      `- ${g.pattern} (${g.frequency} conversations, avg ${g.avgMessagesToBooking} messages)`
  )
  .join('\n')}

## Anti-Patterns (what kills conversations)
${report.antiPatterns
  .slice(0, 5)
  .map((a) => `- ${a.pattern} (${a.frequency} conversations)`)
  .join('\n')}

## Objection Analysis
${report.objectionAnalysis
  .slice(0, 10)
  .map(
    (o) =>
      `- ${o.objectionType}: ${o.frequency} occurrences, ${(o.resolutionRate * 100).toFixed(0)}% resolution rate`
  )
  .join('\n')}

## Top 30 "Never Say" Rules
${neverSayList
  .slice(0, 30)
  .map((ns, i) => `${i + 1}. ${ns}`)
  .join('\n')}

## Top 30 Effective Techniques
${effectiveList
  .slice(0, 30)
  .map((e, i) => `${i + 1}. ${e}`)
  .join('\n')}

## Tone Insights
${toneInsights
  .slice(0, 15)
  .map((t, i) => `${i + 1}. ${t}`)
  .join('\n')}

## Raw Observations & Improvements by Prompt Section
${Object.entries(rawSections)
  .map(([section, data]) => {
    const topObs = topN(data.observations, 5)
    const topImp = topN(data.improvements, 5)
    return `### ${section}
Top observations (by frequency):
${topObs.map((o) => `- (${o.count}x) ${o.value.slice(0, 200)}`).join('\n')}
Top improvements (by frequency):
${topImp.map((i) => `- (${i.count}x) ${i.value.slice(0, 200)}`).join('\n')}`
  })
  .join('\n\n')}

---

Return a JSON array of prompt recommendations. Each recommendation must have:
- "section": one of "persona", "company_context", "qualification_criteria", "objection_handling", "email_capture", "decision_routing", "summary_generation", "message_constraints"
- "current_behavior": what the current prompt does (or fails to do) based on the data
- "suggested_change": the SPECIFIC, CONCRETE change to make — write the actual prompt language where possible
- "evidence": array of 3-5 specific data points from above that justify this change
- "priority": "high" | "medium" | "low"

Guidelines:
- Every section MUST get a recommendation
- "high" priority = directly impacts booking rate or causes conversation death
- Include the "never say" rules in the relevant section recommendations
- Include effective technique language in persona and qualification sections
- Be specific — don't say "improve objection handling", say exactly WHAT to say and WHEN
- Write actual system prompt language the developer can copy-paste into the prompt builder

Return ONLY the JSON array, no markdown.`

  const response = await callClaudeWithRetry({
    model: SONNET_MODEL,
    system: 'You are a system prompt engineer. Return only valid JSON arrays.',
    userMessage: prompt,
    maxTokens: 8192,
  })

  const cleaned = response
    .replace(/```json?\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  const parsed = JSON.parse(cleaned)

  return parsed.map((r: Record<string, unknown>) => ({
    section: r.section as string,
    currentBehavior: r.current_behavior as string,
    suggestedChange: r.suggested_change as string,
    evidence: r.evidence as string[],
    priority: r.priority as 'high' | 'medium' | 'low',
  }))
}

// ---------------------------------------------------------------------------
// Generate markdown report
// ---------------------------------------------------------------------------

function generateMarkdown(
  report: PatternReport,
  neverSayList: string[],
  keyMomentsSummary: string[]
): string {
  const lines: string[] = []

  lines.push('# InstaSetter Conversation Analysis — Pattern Report')
  lines.push(``)
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Total conversations classified: ${report.totalConversations}`)
  lines.push(``)

  // Outcome distribution
  lines.push('## Outcome Distribution')
  lines.push('| Outcome | Count | % |')
  lines.push('|---------|-------|---|')
  const total = Object.values(report.outcomeDistribution).reduce(
    (s, n) => s + n,
    0
  )
  for (const [outcome, count] of Object.entries(
    report.outcomeDistribution
  ).sort((a, b) => b[1] - a[1])) {
    lines.push(
      `| ${outcome} | ${count} | ${((count / total) * 100).toFixed(1)}% |`
    )
  }
  lines.push('')

  // Golden paths
  lines.push('## Golden Paths (What Leads to Bookings)')
  for (const gp of report.goldenPaths.slice(0, 10)) {
    lines.push(
      `### Pattern (${gp.frequency} conversations, avg ${gp.avgMessagesToBooking} msgs)`
    )
    lines.push(`\`${gp.pattern}\``)
    lines.push(`Examples: ${gp.exampleConversationIds.join(', ')}`)
    lines.push('')
  }

  // Anti-patterns
  lines.push('## Anti-Patterns (What Kills Conversations)')
  for (const ap of report.antiPatterns) {
    lines.push(
      `### ${ap.stageWhereItFails} stage (${ap.frequency} conversations)`
    )
    lines.push(ap.pattern)
    lines.push(`Examples: ${ap.exampleConversationIds.join(', ')}`)
    lines.push('')
  }

  // Objection analysis
  lines.push('## Objection Analysis')
  lines.push('| Objection | Count | Resolution Rate |')
  lines.push('|-----------|-------|-----------------|')
  for (const oa of report.objectionAnalysis) {
    lines.push(
      `| ${oa.objectionType} | ${oa.frequency} | ${(oa.resolutionRate * 100).toFixed(0)}% |`
    )
  }
  lines.push('')

  for (const oa of report.objectionAnalysis.slice(0, 10)) {
    if (oa.bestResponses.length > 0 || oa.worstResponses.length > 0) {
      lines.push(
        `### ${oa.objectionType} (${(oa.resolutionRate * 100).toFixed(0)}% resolved)`
      )
      if (oa.bestResponses.length > 0) {
        lines.push('**What works:**')
        oa.bestResponses.forEach((r) => lines.push(`- ${r}`))
      }
      if (oa.worstResponses.length > 0) {
        lines.push('**What fails:**')
        oa.worstResponses.forEach((r) => lines.push(`- ${r}`))
      }
      lines.push('')
    }
  }

  // Never say list
  lines.push('## Never Say (Forbidden Phrases & Patterns)')
  neverSayList.slice(0, 50).forEach((ns, i) => lines.push(`${i + 1}. ${ns}`))
  lines.push('')

  // Key moments
  lines.push('## Key Moments (Turning Points)')
  keyMomentsSummary.slice(0, 30).forEach((m) => lines.push(`- ${m}`))
  lines.push('')

  // Prompt recommendations
  lines.push('## System Prompt Recommendations')
  for (const pr of report.promptRecommendations) {
    lines.push(`### [${pr.priority.toUpperCase()}] ${pr.section}`)
    lines.push(`**Current:** ${pr.currentBehavior}`)
    lines.push('')
    lines.push(`**Change:** ${pr.suggestedChange}`)
    lines.push('')
    lines.push('**Evidence:**')
    pr.evidence.forEach((e) => lines.push(`- ${e}`))
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Phase 4: Synthesize')
  console.log('===================\n')

  // Load data
  console.log('Loading classifications...')
  const classifications: ClassificationResult[] = JSON.parse(
    readFileSync(CLASSIFICATIONS_PATH, 'utf-8')
  )
  console.log(`  ${classifications.length} classifications`)

  console.log('Loading deep analyses...')
  const analyses: DeepAnalysisResult[] = JSON.parse(
    readFileSync(DEEP_ANALYSIS_PATH, 'utf-8')
  )
  console.log(`  ${analyses.length} deep analyses\n`)

  // Compute distributions
  console.log('Computing distributions...')
  const outcomeDistribution = countBy(classifications, (c) => c.outcome)
  const engagementDistribution = countBy(
    classifications,
    (c) => c.engagementLevel
  )
  const stageDistribution = countBy(classifications, (c) => c.stageReached)

  // Extract patterns
  console.log('Extracting golden paths...')
  const goldenPaths = extractGoldenPaths(analyses)
  console.log(`  Found ${goldenPaths.length} distinct booking patterns`)

  console.log('Extracting anti-patterns...')
  const antiPatterns = extractAntiPatterns(analyses)
  console.log(`  Found ${antiPatterns.length} failure patterns`)

  console.log('Analyzing objections...')
  const objectionAnalysis = analyzeObjections(classifications, analyses)
  console.log(`  Found ${objectionAnalysis.length} objection types`)

  // Aggregate never-say rules
  const allNeverSay = analyses.flatMap((a) => a.neverSay ?? [])
  const neverSayRanked = topN(allNeverSay, 100)
  console.log(
    `  ${allNeverSay.length} total never-say entries, ${neverSayRanked.length} unique`
  )

  // Aggregate effective techniques
  const allEffective = analyses.flatMap((a) => a.effectiveTechniques)
  const effectiveRanked = topN(allEffective, 50)

  // Aggregate tone insights
  const toneInsights = analyses
    .filter((a) => a.toneAnalysis?.toneNotes)
    .map((a) => a.toneAnalysis.toneNotes)
  const toneRanked = topN(toneInsights, 20)

  // Key moments summary
  const keyMoments = analyses.flatMap((a) =>
    (a.keyMoments ?? []).map((m) => ({
      ...m,
      convId: a.conversationId,
      outcome: a.classification.outcome,
    }))
  )
  const positiveMoments = keyMoments
    .filter((m) => m.impact === 'positive')
    .map(
      (m) =>
        `[${m.outcome}] ${m.moment}: "${m.mikeSaid?.slice(0, 80)}" — ${m.lesson?.slice(0, 120)}`
    )
  const negativeMoments = keyMoments
    .filter((m) => m.impact === 'negative')
    .map(
      (m) =>
        `[${m.outcome}] ${m.moment}: "${m.mikeSaid?.slice(0, 80)}" — ${m.lesson?.slice(0, 120)}`
    )

  // Aggregate prompt section observations
  console.log('Aggregating prompt section data...')
  const rawSections = aggregatePromptRecommendations(analyses)

  // Build partial report
  const partialReport = {
    generatedAt: new Date().toISOString(),
    totalConversations: classifications.length,
    outcomeDistribution,
    engagementDistribution,
    stageDistribution,
    goldenPaths,
    antiPatterns,
    objectionAnalysis,
  }

  // Call Claude for final synthesis
  console.log('\nCalling Sonnet for final synthesis...')
  const promptRecommendations = await synthesizeWithClaude(
    partialReport,
    rawSections,
    neverSayRanked.map((n) => n.value),
    effectiveRanked.map((e) => e.value),
    toneRanked.map((t) => t.value)
  )
  console.log(`  Generated ${promptRecommendations.length} recommendations`)

  // Assemble final report
  const report: PatternReport = {
    ...partialReport,
    promptRecommendations,
  }

  // Write JSON
  writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2))
  console.log(`\n✅ Wrote ${REPORT_JSON_PATH}`)

  // Write markdown
  const md = generateMarkdown(
    report,
    neverSayRanked.map((n) => `${n.value} (${n.count}x)`),
    [...positiveMoments.slice(0, 15), ...negativeMoments.slice(0, 15)]
  )
  writeFileSync(REPORT_MD_PATH, md)
  console.log(`✅ Wrote ${REPORT_MD_PATH}`)

  // Print summary
  console.log('\n=== SUMMARY ===')
  console.log(`Conversations classified: ${classifications.length}`)
  console.log(`Deep analyses: ${analyses.length}`)
  console.log(`Golden paths found: ${goldenPaths.length}`)
  console.log(`Anti-patterns found: ${antiPatterns.length}`)
  console.log(`Objection types: ${objectionAnalysis.length}`)
  console.log(`Never-say rules: ${neverSayRanked.length}`)
  console.log(`Prompt recommendations: ${promptRecommendations.length}`)
  console.log(
    `\nBooking rate: ${(((outcomeDistribution['booked_call'] ?? 0) / classifications.length) * 100).toFixed(1)}%`
  )
  console.log(
    `Silent rate: ${(((outcomeDistribution['went_silent'] ?? 0) / classifications.length) * 100).toFixed(1)}%`
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
