/**
 * Generates a nicely formatted pattern report with embedded conversation examples.
 * Reads from pattern-report.json, deep-analysis.json, and normalized.json.
 *
 * Usage: npx tsx scripts/format-report.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  PatternReport,
  DeepAnalysisResult,
  NormalizedConversation,
} from './types.js'
import { formatConversationForClaude } from './lib/instagram.js'

const OUTPUT_DIR = join(process.cwd(), 'scripts/output')
const report: PatternReport = JSON.parse(
  readFileSync(join(OUTPUT_DIR, 'pattern-report.json'), 'utf-8')
)
const analyses: DeepAnalysisResult[] = JSON.parse(
  readFileSync(join(OUTPUT_DIR, 'deep-analysis.json'), 'utf-8')
)
const normalized: NormalizedConversation[] = JSON.parse(
  readFileSync(join(OUTPUT_DIR, 'normalized.json'), 'utf-8')
)

const convMap = new Map(normalized.map((c) => [c.meta.id, c]))
const analysisMap = new Map(analyses.map((a) => [a.conversationId, a]))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConversationText(id: string): string {
  const conv = convMap.get(id)
  if (!conv) return '*Conversation not found*'
  return formatConversationForClaude(conv)
}

function getAnalysis(id: string): DeepAnalysisResult | undefined {
  return analysisMap.get(id)
}

function indent(text: string, prefix = '> '): string {
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
}

function truncateConversation(text: string, maxLines = 25): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  const half = Math.floor(maxLines / 2)
  return [
    ...lines.slice(0, half),
    '',
    `*... ${lines.length - maxLines} messages omitted ...*`,
    '',
    ...lines.slice(-half),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Build the report
// ---------------------------------------------------------------------------

const md: string[] = []

// ── Title & Summary ──

md.push('# InstaSetter — Conversation Analysis Report')
md.push('')
md.push(
  `**Generated:** ${new Date(report.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
)
md.push('')
md.push('---')
md.push('')
md.push('## Executive Summary')
md.push('')
md.push(
  `We analysed **${report.totalConversations.toLocaleString()} Instagram DM conversations** from Mike Hoffmann's VendingPreneurs account. Of those, **580 high-value conversations** received deep analysis by Claude Sonnet 4.6 — every booked call, email capture, unresolved objection, and high-engagement thread was examined for patterns.`
)
md.push('')

const total = Object.values(report.outcomeDistribution).reduce(
  (s, n) => s + n,
  0
)
const booked = report.outcomeDistribution['booked_call'] ?? 0
const silent = report.outcomeDistribution['went_silent'] ?? 0
const masterclass = report.outcomeDistribution['masterclass_delivered'] ?? 0

md.push('**Key numbers:**')
md.push('')
md.push(
  `- **${booked} conversations** resulted in a booked call (${((booked / total) * 100).toFixed(1)}% conversion rate)`
)
md.push(
  `- **${silent} conversations** went silent (${((silent / total) * 100).toFixed(1)}% — the biggest opportunity)`
)
md.push(
  `- **${masterclass} conversations** delivered the masterclass but never progressed further`
)
md.push(
  `- **Email was captured in only 20 conversations** (0.4% — a critical gap)`
)
md.push('')
md.push('This report contains:')
md.push('')
md.push('1. What the booking funnel actually looks like (golden paths)')
md.push('2. Where and why conversations die (anti-patterns)')
md.push('3. How each objection type plays out, with real examples')
md.push('4. A "never say" list of 50 forbidden phrases')
md.push('5. Specific system prompt recommendations for each section')
md.push('')

// ── Outcome Distribution ──

md.push('---')
md.push('')
md.push('## 1. Outcome Distribution')
md.push('')
md.push('| Outcome | Count | % |')
md.push('|:--------|------:|---:|')
for (const [outcome, count] of Object.entries(report.outcomeDistribution).sort(
  (a, b) => b[1] - a[1]
)) {
  const pct = ((count / total) * 100).toFixed(1)
  md.push(`| ${outcome.replace(/_/g, ' ')} | ${count} | ${pct}% |`)
}
md.push('')

// ── Golden Paths ──

md.push('---')
md.push('')
md.push('## 2. Golden Paths — What Leads to Bookings')
md.push('')
md.push(
  'These are the most common message sequences that ended in a booked call. The flow is read left to right — each step is a conversation move.'
)
md.push('')

for (let i = 0; i < Math.min(report.goldenPaths.length, 5); i++) {
  const gp = report.goldenPaths[i]
  md.push(
    `### Path ${i + 1} — ${gp.frequency} conversations, avg ${gp.avgMessagesToBooking} messages`
  )
  md.push('')
  md.push('**Flow:**')
  md.push('')

  // Format flow as numbered steps
  const steps = gp.pattern.split(' → ')
  steps.forEach((step, j) => {
    md.push(`${j + 1}. ${step.replace(/_/g, ' ')}`)
  })
  md.push('')

  // Show one example conversation
  const exampleId = gp.exampleConversationIds[0]
  const analysis = getAnalysis(exampleId)
  if (analysis) {
    md.push(
      `**Example conversation** (\`${exampleId}\`, score: ${analysis.goldenPathScore}/100):`
    )
    md.push('')
    md.push('```')
    md.push(truncateConversation(getConversationText(exampleId), 30))
    md.push('```')
    md.push('')

    if (analysis.effectiveTechniques.length > 0) {
      md.push('**What worked:**')
      md.push('')
      analysis.effectiveTechniques.slice(0, 3).forEach((t) => {
        md.push(`- ${t}`)
      })
      md.push('')
    }
  }
}

// ── Anti-Patterns ──

md.push('---')
md.push('')
md.push('## 3. Anti-Patterns — What Kills Conversations')
md.push('')
md.push(
  'Grouped by the stage where the conversation died. The most damaging patterns are listed first.'
)
md.push('')

for (const ap of report.antiPatterns) {
  md.push(
    `### Dying at: ${ap.stageWhereItFails.replace(/_/g, ' ')} (${ap.frequency} conversations)`
  )
  md.push('')

  // Show one example conversation
  const exampleId = ap.exampleConversationIds[0]
  const analysis = getAnalysis(exampleId)
  if (analysis) {
    md.push(
      `**Example** (\`${exampleId}\`, score: ${analysis.goldenPathScore}/100):`
    )
    md.push('')
    md.push('```')
    md.push(truncateConversation(getConversationText(exampleId), 20))
    md.push('```')
    md.push('')

    if (analysis.ineffectiveTechniques.length > 0) {
      md.push('**What went wrong:**')
      md.push('')
      analysis.ineffectiveTechniques.slice(0, 3).forEach((t) => {
        md.push(`- ${t}`)
      })
      md.push('')
    }

    if (analysis.neverSay && analysis.neverSay.length > 0) {
      md.push('**Never say:**')
      md.push('')
      analysis.neverSay.slice(0, 2).forEach((t) => {
        md.push(`- ${t}`)
      })
      md.push('')
    }
  }
}

// ── Objection Analysis ──

md.push('---')
md.push('')
md.push('## 4. Objection Analysis')
md.push('')
md.push(
  'Every objection type we found, how often it appears, and how often Mike successfully resolved it.'
)
md.push('')
md.push('| Objection | Count | Resolution Rate |')
md.push('|:----------|------:|:---------------:|')
for (const oa of report.objectionAnalysis) {
  md.push(
    `| ${oa.objectionType.replace(/_/g, ' ')} | ${oa.frequency} | ${(oa.resolutionRate * 100).toFixed(0)}% |`
  )
}
md.push('')

for (const oa of report.objectionAnalysis.slice(0, 7)) {
  md.push(
    `### ${oa.objectionType.replace(/_/g, ' ')} — ${oa.frequency} occurrences, ${(oa.resolutionRate * 100).toFixed(0)}% resolved`
  )
  md.push('')

  if (oa.bestResponses.length > 0) {
    md.push('**What works:**')
    md.push('')
    oa.bestResponses.slice(0, 3).forEach((r) => {
      md.push(`- ${r}`)
    })
    md.push('')
  }

  if (oa.worstResponses.length > 0) {
    md.push('**What fails:**')
    md.push('')
    oa.worstResponses.slice(0, 3).forEach((r) => {
      md.push(`- ${r}`)
    })
    md.push('')
  }
}

// ── Never Say List ──

md.push('---')
md.push('')
md.push('## 5. Never Say — Forbidden Phrases & Patterns')
md.push('')
md.push(
  'These are specific phrases, patterns, and behaviours extracted from real conversations where they caused damage. Each one is a rule for the AI setter.'
)
md.push('')

// Get all never-say from analyses, deduplicate, take top 50
const allNeverSay = analyses.flatMap((a) => a.neverSay ?? [])
const nsCounts = new Map<string, number>()
for (const ns of allNeverSay) {
  nsCounts.set(ns, (nsCounts.get(ns) ?? 0) + 1)
}
const nsRanked = [...nsCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)

for (let i = 0; i < nsRanked.length; i++) {
  md.push(`${i + 1}. ${nsRanked[i][0]}`)
  md.push('')
}

// ── Prompt Recommendations ──

md.push('---')
md.push('')
md.push('## 6. System Prompt Recommendations')
md.push('')
md.push(
  'One recommendation per section of the system prompt, ordered by priority. Each includes the current behaviour, the recommended change (with actual prompt language), and the evidence behind it.'
)
md.push('')

for (const pr of report.promptRecommendations) {
  md.push(`### [${pr.priority.toUpperCase()}] ${pr.section.replace(/_/g, ' ')}`)
  md.push('')

  md.push('**Current behaviour:**')
  md.push('')
  md.push(pr.currentBehavior)
  md.push('')

  md.push('**Recommended change:**')
  md.push('')
  // Split long recommended changes into paragraphs at double-newlines or numbered lists
  const changeLines = pr.suggestedChange.split('\n')
  for (const line of changeLines) {
    md.push(line)
  }
  md.push('')

  md.push('**Evidence:**')
  md.push('')
  for (const e of pr.evidence) {
    md.push(`- ${e}`)
  }
  md.push('')

  // Find a relevant example conversation for this section
  const sectionAnalyses = analyses.filter((a) =>
    a.promptSections.some((ps) => ps.section === pr.section)
  )
  // Pick one with a high score for positive sections, low score for problem sections
  const sorted =
    pr.priority === 'high'
      ? sectionAnalyses.sort((a, b) => a.goldenPathScore - b.goldenPathScore)
      : sectionAnalyses.sort((a, b) => b.goldenPathScore - a.goldenPathScore)

  const example = sorted[0]
  if (example) {
    const obs = example.promptSections.find((ps) => ps.section === pr.section)
    if (obs) {
      md.push(
        `**Example** (\`${example.conversationId}\`, score: ${example.goldenPathScore}/100):`
      )
      md.push('')
      md.push('```')
      md.push(
        truncateConversation(getConversationText(example.conversationId), 15)
      )
      md.push('```')
      md.push('')
      md.push(`*Observation:* ${obs.observation}`)
      md.push('')
      if (obs.suggestedImprovement) {
        md.push(`*Fix:* ${obs.suggestedImprovement}`)
        md.push('')
      }
    }
  }
}

// ── Key Moments ──

md.push('---')
md.push('')
md.push('## 7. Key Moments — Turning Points in Real Conversations')
md.push('')
md.push(
  'These are the exact moments where conversations were won or lost. Each includes the real messages from both sides.'
)
md.push('')

// Get top positive and negative moments
const allMoments = analyses.flatMap((a) =>
  (a.keyMoments ?? []).map((m) => ({
    ...m,
    convId: a.conversationId,
    score: a.goldenPathScore,
    outcome: a.classification.outcome,
  }))
)

const positiveMoments = allMoments
  .filter((m) => m.impact === 'positive' && m.mikeSaid && m.prospectSaid)
  .sort((a, b) => b.score - a.score)
  .slice(0, 10)

const negativeMoments = allMoments
  .filter((m) => m.impact === 'negative' && m.mikeSaid)
  .sort((a, b) => a.score - b.score)
  .slice(0, 10)

md.push('### Moments that won the booking')
md.push('')

for (const m of positiveMoments) {
  md.push(`**${m.moment}** (\`${m.convId}\`, ${m.outcome.replace(/_/g, ' ')})`)
  md.push('')
  md.push(`> **Mike:** "${m.mikeSaid}"`)
  md.push('>')
  md.push(`> **Prospect:** "${m.prospectSaid}"`)
  md.push('')
  md.push(`*Lesson:* ${m.lesson}`)
  md.push('')
}

md.push('### Moments that killed the conversation')
md.push('')

for (const m of negativeMoments) {
  md.push(`**${m.moment}** (\`${m.convId}\`, ${m.outcome.replace(/_/g, ' ')})`)
  md.push('')
  md.push(`> **Mike:** "${m.mikeSaid}"`)
  if (m.prospectSaid) {
    md.push('>')
    md.push(`> **Prospect:** "${m.prospectSaid}"`)
  }
  md.push('')
  md.push(`*Lesson:* ${m.lesson}`)
  md.push('')
}

// ── Write ──

const output = md.join('\n')
const outPath = join(OUTPUT_DIR, 'pattern-report-formatted.md')
writeFileSync(outPath, output)
console.log(`✅ Wrote ${outPath}`)
console.log(
  `   ${output.split('\n').length} lines, ${(Buffer.byteLength(output) / 1024).toFixed(0)} KB`
)
