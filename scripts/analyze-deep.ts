/**
 * Phase 3: Deep Analysis
 *
 * Sends high-value conversations to Sonnet for detailed pattern extraction.
 * --sample : analyze only conversations from the sample classification run
 * No flag  : analyze all high-value conversations from full classification
 *
 * Usage:
 *   npx tsx scripts/analyze-deep.ts --sample     # Validation run
 *   npx tsx scripts/analyze-deep.ts              # Full run
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  NormalizedConversation,
  ClassificationResult,
  DeepAnalysisResult,
} from './types.js'
import { formatConversationForClaude } from './lib/instagram.js'
import { SONNET_MODEL, callClaudeWithRetry } from './lib/claude-client.js'
import { loadProgress, saveProgress } from './lib/progress.js'

const OUTPUT_DIR = join(process.cwd(), 'scripts/output')
const NORMALIZED_PATH = join(OUTPUT_DIR, 'normalized.json')
const CLASSIFICATIONS_PATH = join(OUTPUT_DIR, 'classifications.json')
const SAMPLE_CLASSIFICATIONS_PATH = join(
  OUTPUT_DIR,
  'sample-classifications.json'
)
const DEEP_ANALYSIS_PATH = join(OUTPUT_DIR, 'deep-analysis.json')
const SAMPLE_DEEP_PATH = join(OUTPUT_DIR, 'sample-deep-analysis.json')
const PROGRESS_PATH = join(OUTPUT_DIR, 'deep-progress.json')

const DEEP_ANALYSIS_SYSTEM_PROMPT = `You are an expert sales conversation analyst studying Instagram DM conversations for a vending machine business (VendingPreneurs / Mike Hoffmann). Your goal is to extract actionable patterns that will inform an AI appointment setter's system prompt. This analysis feeds directly into a real production system — be rigorous and specific.

Analyze this conversation and return ONLY a JSON object (no markdown, no explanation):
{
  "conversation_flow": string[] — ordered list of conversation moves. Use ONLY these standardized labels: "comment_trigger", "private_reply_opener", "prospect_initiated", "masterclass_offer", "prospect_confirms_interest", "content_link_sent", "qualification_question_location", "qualification_question_machines", "qualification_question_budget", "qualification_question_timeline", "qualification_question_credit", "qualification_question_experience", "prospect_shares_situation", "rapport_building", "objection_raised", "objection_handled", "objection_unresolved", "value_proposition", "partner_call_offer", "booking_link_sent", "prospect_books_call", "email_requested", "email_provided", "follow_up_sent", "prospect_went_silent", "re_engagement_attempt", "alternative_offer", "prospect_declines", "prospect_opts_out", "post_booking_resources", "booking_confirmed", "scheduling_friction", "support_request", "post_call_follow_up". Do NOT invent custom labels — map every move to the closest standard label.

  "effective_techniques": string[] — specific things Mike said or did that moved the conversation forward. ALWAYS quote his exact words in single quotes, then explain why it worked. Format: "'[exact quote]' — [why it worked]"

  "ineffective_techniques": string[] — things that stalled or killed momentum. ALWAYS quote his exact words in single quotes, then explain the damage. Format: "'[exact quote]' — [why it hurt]"

  "never_say": string[] — extract specific phrases, patterns, or approaches from this conversation that the AI must NEVER use. Be concrete: quote the bad language and state the rule. Example: "Never say 'what did we promise?' when a prospect complains about undelivered content — it sounds dismissive and destroys trust"

  "missed_opportunities": string[] — things Mike could have done but didn't, based on what the prospect revealed. Include what he SHOULD have said (provide example language).

  "tone_analysis": {
    "mike_tone": string — describe Mike's tone in this conversation (e.g. "casual and peer-like", "rushed and transactional", "warm but scripted"),
    "prospect_tone": string — describe the prospect's tone and energy level,
    "tone_match_quality": "matched" | "mismatched" | "partially_matched" — did Mike mirror the prospect's energy appropriately?,
    "tone_notes": string — specific observations about where tone helped or hurt
  },

  "prompt_sections": [{ "section": string, "observation": string, "suggested_improvement": string }] — section must be one of: "persona", "company_context", "qualification_criteria", "objection_handling", "email_capture", "decision_routing", "summary_generation", "message_constraints". Include ALL sections where you have ANY observation, even minor ones. Aim for at least 5 sections per analysis. For "company_context", note how Mike positions the business, what claims he makes, what the prospect seems to already know or assume.

  "golden_path_score": number 0-100 — Score on these weighted criteria:
    - Reached booking (0-30 points)
    - Email captured (0-10 points)
    - Qualification depth: gathered location, budget, timeline, experience (0-15 points)
    - Objections handled cleanly (0-15 points)
    - Natural conversation flow, not scripted-feeling (0-10 points)
    - One question at a time (0-10 points)
    - Tone matched prospect energy (0-10 points)

  "key_moments": [{ "moment": string, "mike_said": string, "prospect_said": string, "impact": "positive" | "negative" | "neutral", "lesson": string }] — the 3-5 most important turning points in the conversation. These are the moments where the outcome was decided. Quote exact words.

  "notes": string — freeform observations. Structure as: (1) one-sentence summary verdict, (2) what the AI should replicate from this conversation, (3) what the AI must avoid, (4) any systemic/operational issues revealed.
}

CRITICAL INSTRUCTIONS:
1. Quote Mike's EXACT words — do not paraphrase. Use single quotes around his messages.
2. For ineffective techniques, quote the EXACT bad language so we can build a forbidden phrases list
3. The message right BEFORE a prospect goes silent is the most important message in any went_silent conversation — always analyze it
4. When Mike asks multiple questions in one message, flag it as ineffective every time
5. Note when Mike ignores a prospect's question — this is always an ineffective technique
6. For objections, capture the prospect's exact phrasing too — we need to train pattern matching
7. "company_context" observations: how does Mike describe his business? What promises does he make? What expectations does he set about the call?
8. Scoring must be strict — a conversation that books a call but captures no email and does minimal qualification should not score above 75`

// ---------------------------------------------------------------------------
// Select conversations for deep analysis
// ---------------------------------------------------------------------------

function selectForDeepAnalysis(
  conversations: NormalizedConversation[],
  classifications: ClassificationResult[]
): string[] {
  const classMap = new Map(classifications.map((c) => [c.conversationId, c]))
  const selected = new Set<string>()

  // All booked calls
  for (const c of classifications) {
    if (c.outcome === 'booked_call') selected.add(c.conversationId)
  }

  // All email captures
  for (const c of classifications) {
    if (c.outcome === 'email_captured') selected.add(c.conversationId)
  }

  // High engagement that reached qualification or beyond
  const qualStages = new Set([
    'qualification',
    'objection_handling',
    'value_delivery',
    'call_booking',
    'post_booking',
    'follow_up',
  ])
  const qualified = classifications.filter(
    (c) => qualStages.has(c.stageReached) && !selected.has(c.conversationId)
  )
  // All high-engagement conversations that reached qualification or beyond — no cap
  for (const c of qualified) {
    selected.add(c.conversationId)
  }

  // All unresolved objections with substantive content — no cap
  const objections = classifications.filter(
    (c) =>
      c.outcome === 'objection_unresolved' && !selected.has(c.conversationId)
  )
  const convMap = new Map(conversations.map((c) => [c.meta.id, c]))
  const longObjections = objections.filter((c) => {
    const conv = convMap.get(c.conversationId)
    return conv && conv.meta.substantiveMessageCount >= 6
  })
  for (const c of longObjections) {
    selected.add(c.conversationId)
  }

  // All qualified_warm
  for (const c of classifications) {
    if (c.outcome === 'qualified_warm' && !selected.has(c.conversationId)) {
      selected.add(c.conversationId)
    }
  }

  // All masterclass_delivered with medium+ engagement (learn what stops progression)
  for (const c of classifications) {
    if (
      c.outcome === 'masterclass_delivered' &&
      (c.engagementLevel === 'medium' || c.engagementLevel === 'high') &&
      !selected.has(c.conversationId)
    ) {
      const conv = convMap.get(c.conversationId)
      if (conv && conv.meta.substantiveMessageCount >= 6) {
        selected.add(c.conversationId)
      }
    }
  }

  return [...selected]
}

// ---------------------------------------------------------------------------
// Analyze a single conversation
// ---------------------------------------------------------------------------

async function analyzeConversation(
  conv: NormalizedConversation,
  classification: ClassificationResult
): Promise<DeepAnalysisResult | null> {
  const formatted = formatConversationForClaude(conv)

  const contextHeader = [
    `Conversation ID: ${conv.meta.id}`,
    `Messages: ${conv.meta.substantiveMessageCount}`,
    `Duration: ${conv.meta.durationDays} days`,
    `Pre-classified as: outcome=${classification.outcome}, engagement=${classification.engagementLevel}, stage=${classification.stageReached}`,
    `Signals: booking_link=${conv.meta.hasBookingLink}, email=${conv.meta.hasEmail}, masterclass=${conv.meta.mentionsMasterclass}`,
    '',
    '--- CONVERSATION ---',
    formatted,
  ].join('\n')

  try {
    const response = await callClaudeWithRetry({
      model: SONNET_MODEL,
      system: DEEP_ANALYSIS_SYSTEM_PROMPT,
      userMessage: contextHeader,
      maxTokens: 8192,
    })

    const cleaned = response
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    const parsed = JSON.parse(cleaned)

    return {
      conversationId: conv.meta.id,
      classification,
      conversationFlow: parsed.conversation_flow ?? [],
      effectiveTechniques: parsed.effective_techniques ?? [],
      ineffectiveTechniques: parsed.ineffective_techniques ?? [],
      neverSay: parsed.never_say ?? [],
      missedOpportunities: parsed.missed_opportunities ?? [],
      toneAnalysis: {
        mikeTone: parsed.tone_analysis?.mike_tone ?? '',
        prospectTone: parsed.tone_analysis?.prospect_tone ?? '',
        toneMatchQuality:
          parsed.tone_analysis?.tone_match_quality ?? 'partially_matched',
        toneNotes: parsed.tone_analysis?.tone_notes ?? '',
      },
      promptSections: (parsed.prompt_sections ?? []).map(
        (s: Record<string, string>) => ({
          section: s.section,
          observation: s.observation,
          suggestedImprovement: s.suggested_improvement,
        })
      ),
      goldenPathScore: parsed.golden_path_score ?? 0,
      keyMoments: (parsed.key_moments ?? []).map(
        (m: Record<string, string>) => ({
          moment: m.moment,
          mikeSaid: m.mike_said,
          prospectSaid: m.prospect_said,
          impact: m.impact,
          lesson: m.lesson,
        })
      ),
      rawNotes: parsed.notes ?? '',
    }
  } catch (err) {
    console.error(`    ❌ Error: ${err instanceof Error ? err.message : err}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Sample mode
// ---------------------------------------------------------------------------

async function runSample(conversations: NormalizedConversation[]) {
  console.log(
    '\nSample mode: analyzing conversations from sample classification\n'
  )

  // Load sample classifications
  const sampleData = loadProgress<
    {
      conversation: { id: string }
      classification: ClassificationResult | null
    }[]
  >(SAMPLE_CLASSIFICATIONS_PATH)

  if (!sampleData) {
    console.error(
      '❌ No sample classifications found. Run classify.ts --sample first.'
    )
    process.exit(1)
  }

  const classified = sampleData.filter((d) => d.classification !== null)
  const convMap = new Map(conversations.map((c) => [c.meta.id, c]))

  // Only deep-analyze the interesting ones (not too_short, not spam)
  const interesting = classified.filter(
    (d) =>
      d.classification!.outcome !== 'too_short' &&
      d.classification!.outcome !== 'spam_or_irrelevant' &&
      d.classification!.engagementLevel !== 'none'
  )

  console.log(`  ${interesting.length} conversations worth deep-analyzing\n`)

  const results: DeepAnalysisResult[] = []

  for (let i = 0; i < interesting.length; i++) {
    const { classification } = interesting[i]
    const conv = convMap.get(classification!.conversationId)
    if (!conv) continue

    console.log(
      `  [${i + 1}/${interesting.length}] ${conv.meta.id} ` +
        `(${conv.meta.substantiveMessageCount} msgs, ${classification!.outcome})...`
    )

    const result = await analyzeConversation(conv, classification!)
    if (result) {
      results.push(result)
      console.log(
        `    → score: ${result.goldenPathScore}/100, flow: ${result.conversationFlow.length} steps`
      )
    }
  }

  // Write sample deep analysis with full context for review
  const reviewData = results.map((r) => ({
    ...r,
    conversationText: formatConversationForClaude(
      convMap.get(r.conversationId)!
    ),
  }))

  saveProgress(SAMPLE_DEEP_PATH, reviewData)
  console.log(`\n✅ Wrote ${SAMPLE_DEEP_PATH}`)
  console.log(`   ${results.length} conversations analyzed`)
}

// ---------------------------------------------------------------------------
// Full mode
// ---------------------------------------------------------------------------

async function runFull(conversations: NormalizedConversation[]) {
  console.log('\nFull mode: analyzing high-value conversations\n')

  // Load classifications
  const classifications =
    loadProgress<ClassificationResult[]>(CLASSIFICATIONS_PATH)
  if (!classifications) {
    console.error('❌ No classifications found. Run classify.ts first.')
    process.exit(1)
  }

  // Select conversations for deep analysis
  const selectedIds = selectForDeepAnalysis(conversations, classifications)
  console.log(`Selected ${selectedIds.length} conversations for deep analysis`)

  const convMap = new Map(conversations.map((c) => [c.meta.id, c]))
  const classMap = new Map(classifications.map((c) => [c.conversationId, c]))

  // Load progress (resume from checkpoint)
  const existing = loadProgress<DeepAnalysisResult[]>(DEEP_ANALYSIS_PATH) ?? []
  const completed = new Set(existing.map((r) => r.conversationId))
  const remaining = selectedIds.filter((id) => !completed.has(id))

  if (completed.size > 0) {
    console.log(
      `  Resuming: ${completed.size} already done, ${remaining.length} remaining`
    )
  }

  const results = [...existing]
  const CONCURRENCY = 10

  // Process in parallel batches
  for (
    let batchStart = 0;
    batchStart < remaining.length;
    batchStart += CONCURRENCY
  ) {
    const batch = remaining.slice(batchStart, batchStart + CONCURRENCY)
    const batchNum = Math.floor(batchStart / CONCURRENCY) + 1
    const totalBatches = Math.ceil(remaining.length / CONCURRENCY)

    console.log(
      `\n  Batch ${batchNum}/${totalBatches} (${batch.length} conversations)...`
    )

    const promises = batch.map(async (id) => {
      const conv = convMap.get(id)
      const classification = classMap.get(id)
      if (!conv || !classification) return null

      const result = await analyzeConversation(conv, classification)
      if (result) {
        console.log(`    ✓ ${id} → score: ${result.goldenPathScore}/100`)
      } else {
        console.log(`    ✗ ${id} — failed`)
      }
      return result
    })

    const batchResults = await Promise.all(promises)
    for (const r of batchResults) {
      if (r) results.push(r)
    }

    // Checkpoint after each batch
    saveProgress(DEEP_ANALYSIS_PATH, results)
    console.log(
      `  💾 Checkpoint: ${results.length}/${completed.size + remaining.length} total`
    )
  }

  saveProgress(DEEP_ANALYSIS_PATH, results)
  console.log(`\n✅ Wrote ${DEEP_ANALYSIS_PATH}`)
  console.log(`   ${results.length} total conversations analyzed`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Phase 3: Deep Analysis')
  console.log('======================\n')

  // Load normalized data
  console.log(`Loading ${NORMALIZED_PATH}...`)
  const raw = readFileSync(NORMALIZED_PATH, 'utf-8')
  const conversations: NormalizedConversation[] = JSON.parse(raw)
  console.log(`Loaded ${conversations.length} conversations`)

  if (process.argv.includes('--sample')) {
    await runSample(conversations)
  } else {
    await runFull(conversations)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
