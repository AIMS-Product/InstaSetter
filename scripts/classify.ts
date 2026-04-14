/**
 * Phase 2: Classify
 *
 * Classifies conversations using Claude Haiku.
 * --sample N : run N conversations through direct API for validation (default: 50)
 * No flag    : run all shallow+deep conversations through Batch API
 *
 * Usage:
 *   npx tsx scripts/classify.ts --sample 50   # Validation run
 *   npx tsx scripts/classify.ts               # Full batch run
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import type { NormalizedConversation, ClassificationResult } from './types.js'
import { formatConversationForClaude } from './lib/instagram.js'
import {
  HAIKU_MODEL,
  callClaudeWithRetry,
  getClient,
  createBatch,
  pollBatch,
  streamBatchResults,
} from './lib/claude-client.js'
import { loadProgress, saveProgress } from './lib/progress.js'

const OUTPUT_DIR = join(process.cwd(), 'scripts/output')
const NORMALIZED_PATH = join(OUTPUT_DIR, 'normalized.json')
const CLASSIFICATIONS_PATH = join(OUTPUT_DIR, 'classifications.json')
const SAMPLE_PATH = join(OUTPUT_DIR, 'sample-classifications.json')
const BATCH_ID_PATH = join(OUTPUT_DIR, 'classify-batch-id.json')

const CLASSIFICATION_SYSTEM_PROMPT = `You are a conversation analyst. Classify this Instagram DM conversation between a vending machine business (Mike Hoffmann / VendingPreneurs) and a prospect.

Return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "outcome": one of ["booked_call", "email_captured", "qualified_warm", "masterclass_delivered", "objection_unresolved", "went_silent", "opted_out", "spam_or_irrelevant", "too_short"],
  "engagement_level": one of ["high", "medium", "low", "none"],
  "stage_reached": one of ["opener_only", "rapport", "qualification", "objection_handling", "value_delivery", "call_booking", "post_booking", "follow_up"],
  "prospect_temperature": one of ["hot", "warm", "cold"],
  "objection_types": string array (e.g. ["price", "timing", "trust", "already_has_machines", "needs_to_think", "spouse_approval", "no_capital", "bad_credit", "location_concern"]),
  "dropoff_point": string or null (describe what was happening when the conversation died or ended),
  "tags": string array (freeform, capture anything notable about this conversation)
}

Classification rules:
- "booked_call" = conversation contains a booking/scheduling link AND prospect engaged with it
- "email_captured" = an email address was shared by the prospect (not just asked for)
- "masterclass_delivered" = a masterclass/blueprint/course link was sent and prospect acknowledged
- "qualified_warm" = real qualification questions were asked and answered, but no booking or email
- "objection_unresolved" = prospect raised concern that was not successfully resolved
- "went_silent" = prospect stopped responding after Mike's message
- "opted_out" = prospect explicitly said stop/not interested/unsubscribe
- "spam_or_irrelevant" = not a real sales conversation (spam, random, off-topic)
- "too_short" = too few messages to meaningfully classify

Stage progression: opener_only → rapport → qualification → objection_handling → value_delivery → call_booking → post_booking → follow_up

Be conservative with "hot" — only if there are strong buying signals (asked about pricing, has capital, wants to start soon, booked a call).`

// ---------------------------------------------------------------------------
// Sample mode — direct API calls for validation
// ---------------------------------------------------------------------------

async function runSample(
  conversations: NormalizedConversation[],
  sampleSize: number
) {
  console.log(
    `\nSample mode: classifying ${sampleSize} conversations via direct API\n`
  )

  // Select a diverse sample
  const sample = selectDiverseSample(conversations, sampleSize)
  console.log(`Selected ${sample.length} conversations:`)
  console.log(
    `  with booking links: ${sample.filter((c) => c.meta.hasBookingLink).length}`
  )
  console.log(`  with emails: ${sample.filter((c) => c.meta.hasEmail).length}`)
  console.log(
    `  deep tier: ${sample.filter((c) => c.meta.tier === 'deep').length}`
  )
  console.log(
    `  shallow tier: ${sample.filter((c) => c.meta.tier === 'shallow').length}\n`
  )

  const results: ClassificationResult[] = []

  for (let i = 0; i < sample.length; i++) {
    const conv = sample[i]
    const formatted = formatConversationForClaude(conv)

    console.log(
      `  [${i + 1}/${sample.length}] ${conv.meta.id} (${conv.meta.substantiveMessageCount} msgs)...`
    )

    try {
      const response = await callClaudeWithRetry({
        model: HAIKU_MODEL,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        userMessage: formatted,
        maxTokens: 512,
      })

      const parsed = parseClassification(conv.meta.id, response)
      if (parsed) {
        results.push(parsed)
        console.log(
          `    → ${parsed.outcome} | ${parsed.engagementLevel} | ${parsed.stageReached}`
        )
      } else {
        console.log(`    → ⚠️ Failed to parse response`)
      }
    } catch (err) {
      console.error(
        `    → ❌ Error: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  // Write sample results with the conversation text included for review
  const reviewData = sample.map((conv, i) => ({
    conversation: {
      id: conv.meta.id,
      title: conv.meta.title,
      messageCount: conv.meta.substantiveMessageCount,
      tier: conv.meta.tier,
      signals: {
        hasBookingLink: conv.meta.hasBookingLink,
        hasEmail: conv.meta.hasEmail,
        mentionsMasterclass: conv.meta.mentionsMasterclass,
        mentionsPartnerCall: conv.meta.mentionsPartnerCall,
      },
      text: formatConversationForClaude(conv),
    },
    classification:
      results.find((r) => r.conversationId === conv.meta.id) ?? null,
  }))

  saveProgress(SAMPLE_PATH, reviewData)
  console.log(`\n✅ Wrote ${SAMPLE_PATH}`)
  console.log(`   ${results.length}/${sample.length} successfully classified`)
  console.log(
    `\n📋 Review the sample results, then run without --sample for full batch.`
  )
}

function selectDiverseSample(
  conversations: NormalizedConversation[],
  size: number
): NormalizedConversation[] {
  const eligible = conversations.filter((c) => c.meta.tier !== 'skip')

  // Prioritize diversity: booking links, emails, deep conversations, different lengths
  const withBooking = eligible.filter((c) => c.meta.hasBookingLink)
  const withEmail = eligible.filter(
    (c) => c.meta.hasEmail && !c.meta.hasBookingLink
  )
  const deepNoSignal = eligible.filter(
    (c) => c.meta.tier === 'deep' && !c.meta.hasBookingLink && !c.meta.hasEmail
  )
  const shallow = eligible.filter((c) => c.meta.tier === 'shallow')

  const sample: NormalizedConversation[] = []
  const targetPerGroup = Math.ceil(size / 4)

  // Take from each group
  sample.push(...withBooking.slice(0, targetPerGroup))
  sample.push(...withEmail.slice(0, targetPerGroup))
  sample.push(...deepNoSignal.slice(0, targetPerGroup))
  sample.push(...shuffle(shallow).slice(0, targetPerGroup))

  // Deduplicate and trim to size
  const seen = new Set<string>()
  const unique = sample.filter((c) => {
    if (seen.has(c.meta.id)) return false
    seen.add(c.meta.id)
    return true
  })

  return unique.slice(0, size)
}

// ---------------------------------------------------------------------------
// Full batch mode
// ---------------------------------------------------------------------------

async function runFullBatch(conversations: NormalizedConversation[]) {
  const eligible = conversations.filter((c) => c.meta.tier !== 'skip')
  console.log(`\nFull batch mode: ${eligible.length} conversations\n`)

  // Check for existing batch
  const existingBatchId = loadProgress<{ batchId: string }>(BATCH_ID_PATH)
  if (existingBatchId) {
    console.log(`Resuming existing batch: ${existingBatchId.batchId}`)
    await collectBatchResults(existingBatchId.batchId, eligible)
    return
  }

  // Build batch requests (custom_id max 64 chars — truncate + hash if needed)
  const requests: Anthropic.Messages.Batches.BatchCreateParams.Request[] =
    eligible.map((conv) => ({
      custom_id: truncateId(conv.meta.id),
      params: {
        model: HAIKU_MODEL,
        max_tokens: 512,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        messages: [
          { role: 'user' as const, content: formatConversationForClaude(conv) },
        ],
      },
    }))

  // Submit batch
  const batchId = await createBatch(requests)
  saveProgress(BATCH_ID_PATH, { batchId })

  // Poll until done
  console.log('  Polling for completion...')
  await pollBatch(batchId)

  // Collect results
  await collectBatchResults(batchId, eligible)
}

async function collectBatchResults(
  batchId: string,
  conversations: NormalizedConversation[]
) {
  const idMap = buildIdMap(conversations)
  const results: ClassificationResult[] = []
  let failures = 0

  for await (const { customId, result } of streamBatchResults(batchId)) {
    const originalId = idMap.get(customId) ?? customId
    const text = result.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = parseClassification(originalId, text)
    if (parsed) {
      results.push(parsed)
    } else {
      failures++
    }
  }

  console.log(
    `\n  Collected ${results.length} results (${failures} parse failures)`
  )

  // Print outcome distribution
  const outcomes: Record<string, number> = {}
  for (const r of results) {
    outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1
  }
  console.log('\nOutcome distribution:')
  for (const [outcome, count] of Object.entries(outcomes).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${outcome}: ${count}`)
  }

  saveProgress(CLASSIFICATIONS_PATH, results)
  console.log(`\n✅ Wrote ${CLASSIFICATIONS_PATH}`)
}

// ---------------------------------------------------------------------------
// Parse classification JSON from Claude response
// ---------------------------------------------------------------------------

function parseClassification(
  conversationId: string,
  text: string
): ClassificationResult | null {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    const parsed = JSON.parse(cleaned)

    return {
      conversationId,
      outcome: parsed.outcome,
      engagementLevel: parsed.engagement_level,
      stageReached: parsed.stage_reached,
      prospectTemperature: parsed.prospect_temperature,
      objectionTypes: parsed.objection_types ?? [],
      dropoffPoint: parsed.dropoff_point ?? null,
      tags: parsed.tags ?? [],
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateId(id: string): string {
  if (id.length <= 64) return id
  // Keep first 56 chars + 8 char hash for uniqueness
  const hash = simpleHash(id)
  return id.slice(0, 55) + '_' + hash
}

function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).slice(0, 8).padStart(8, '0')
}

// Build reverse lookup: truncated ID → original ID
function buildIdMap(
  conversations: NormalizedConversation[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const conv of conversations) {
    map.set(truncateId(conv.meta.id), conv.meta.id)
  }
  return map
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Phase 2: Classify')
  console.log('=================\n')

  // Load normalized data
  console.log(`Loading ${NORMALIZED_PATH}...`)
  const raw = readFileSync(NORMALIZED_PATH, 'utf-8')
  const conversations: NormalizedConversation[] = JSON.parse(raw)
  console.log(`Loaded ${conversations.length} conversations`)

  // Check for --sample flag
  const sampleArg = process.argv.indexOf('--sample')
  if (sampleArg !== -1) {
    const size = parseInt(process.argv[sampleArg + 1] ?? '50', 10)
    await runSample(conversations, size)
  } else {
    await runFullBatch(conversations)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
