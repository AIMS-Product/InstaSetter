import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// Load ANTHROPIC_API_KEY from .env.local
// ---------------------------------------------------------------------------

function loadApiKey(): string {
  const envPath = join(process.cwd(), '.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  } catch {
    // fall through
  }

  // Fall back to environment variable
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY

  console.error(
    '\n❌ ANTHROPIC_API_KEY not found.\n' +
      'Add it to .env.local:\n' +
      '  ANTHROPIC_API_KEY=sk-ant-...\n' +
      'Or export it: export ANTHROPIC_API_KEY=sk-ant-...\n'
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null

export function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: loadApiKey() })
  }
  return _client
}

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
export const SONNET_MODEL = 'claude-sonnet-4-6'

// ---------------------------------------------------------------------------
// Rate-limited sequential call helper
// ---------------------------------------------------------------------------

const MIN_DELAY_MS = 1200 // ~50 req/min

export async function callClaude(opts: {
  model: string
  system: string
  userMessage: string
  maxTokens?: number
}): Promise<string> {
  const client = getClient()
  const start = Date.now()

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: 'user', content: opts.userMessage }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  return text
}

// ---------------------------------------------------------------------------
// Retry wrapper with exponential backoff
// ---------------------------------------------------------------------------

export async function callClaudeWithRetry(
  opts: Parameters<typeof callClaude>[0],
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callClaude(opts)
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Anthropic.RateLimitError ||
        (err instanceof Error && err.message.includes('429'))

      if (!isRateLimit || attempt === maxRetries) throw err

      const backoff = Math.pow(2, attempt + 1) * 1000 // 2s, 4s, 8s
      console.log(`  Rate limited, backing off ${backoff / 1000}s...`)
      await sleep(backoff)
    }
  }
  throw new Error('Unreachable')
}

// ---------------------------------------------------------------------------
// Batch API helpers
// ---------------------------------------------------------------------------

export async function createBatch(
  requests: Anthropic.Messages.Batches.BatchCreateParams.Request[]
): Promise<string> {
  const client = getClient()
  const batch = await client.messages.batches.create({ requests })
  console.log(`  Batch created: ${batch.id} (${requests.length} requests)`)
  return batch.id
}

export async function pollBatch(
  batchId: string,
  intervalMs = 30_000
): Promise<void> {
  const client = getClient()

  while (true) {
    const batch = await client.messages.batches.retrieve(batchId)
    const counts = batch.request_counts

    console.log(
      `  Batch ${batchId}: ${batch.processing_status} ` +
        `(succeeded=${counts.succeeded} failed=${counts.errored} processing=${counts.processing})`
    )

    if (batch.processing_status === 'ended') return

    await sleep(intervalMs)
  }
}

export async function* streamBatchResults(
  batchId: string
): AsyncGenerator<{ customId: string; result: Anthropic.Messages.Message }> {
  const client = getClient()
  const decoder = await client.messages.batches.results(batchId)

  for await (const entry of decoder) {
    if (entry.result.type === 'succeeded') {
      yield {
        customId: entry.custom_id,
        result: entry.result.message,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
