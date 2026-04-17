/**
 * Exercise the location gate against real Claude without touching the DB.
 *
 * Sends a short canned transcript ending in each test location, prints
 * Claude's reply and any tool calls, so you can visually confirm:
 *   - out-of-area → decline script + generate_summary with out_of_area status
 *   - in-region → normal follow-up qualification question, no decline
 *   - ambiguous → one clarifying question, no premature decline
 *
 * Usage:
 *   npx tsx scripts/test-location-gate.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../src/lib/prompts/setter-v2'
import {
  buildClaudeRequest,
  parseClaudeResponse,
} from '../src/lib/services/claude'

function loadEnv(key: string): string {
  const envPath = join(process.cwd(), '.env.local')
  try {
    const content = readFileSync(envPath, 'utf-8')
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'))
    if (match) return match[1].trim().replace(/^"(.*)"$/, '$1')
  } catch {
    /* fall through */
  }
  if (process.env[key]) return process.env[key]!
  console.error(`\n❌ ${key} not found in .env.local or environment.\n`)
  process.exit(1)
}

const ANTHROPIC_API_KEY = loadEnv('ANTHROPIC_API_KEY')
const BRAND_NAME = process.env.BRAND_NAME ?? 'VendingPreneurs'

const TEST_CASES: Array<{
  label: string
  expect: 'decline' | 'continue' | 'clarify'
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>
}> = [
  {
    label: 'Out-of-area: Sydney, Australia',
    expect: 'decline',
    transcript: [
      { role: 'user', content: 'Hey, saw your ad about vending machines' },
      {
        role: 'assistant',
        content:
          'Hey! What got you interested in vending? And whereabouts are you based?',
      },
      { role: 'user', content: "I'm in Sydney, Australia. Keen to learn more" },
    ],
  },
  {
    label: 'Out-of-area: London UK',
    expect: 'decline',
    transcript: [
      { role: 'user', content: 'Interested in getting into vending' },
      {
        role: 'assistant',
        content: 'Awesome, what area are you thinking of getting started in?',
      },
      { role: 'user', content: 'Based in London, UK' },
    ],
  },
  {
    label: 'In-region: Austin, Texas',
    expect: 'continue',
    transcript: [
      { role: 'user', content: 'Hey saw the reel, want to learn more' },
      {
        role: 'assistant',
        content: 'Hey! Whereabouts are you located?',
      },
      { role: 'user', content: 'Austin, Texas' },
    ],
  },
  {
    label: 'In-region: Calgary, Canada',
    expect: 'continue',
    transcript: [
      { role: 'user', content: 'interested in starting a vending business' },
      {
        role: 'assistant',
        content: 'Awesome, what area are you thinking about?',
      },
      { role: 'user', content: 'Calgary' },
    ],
  },
  {
    label: 'Ambiguous: Toronto (should clarify)',
    expect: 'clarify',
    transcript: [
      { role: 'user', content: 'Hey want to learn about vending' },
      {
        role: 'assistant',
        content: 'What area are you thinking of getting started in?',
      },
      { role: 'user', content: 'Toronto' },
    ],
  },
]

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

async function runOne(tc: (typeof TEST_CASES)[number]) {
  const systemPrompt = buildSystemPrompt({ brandName: BRAND_NAME })
  const request = buildClaudeRequest(systemPrompt, tc.transcript)
  const response = await anthropic.messages.create(
    request as Parameters<typeof anthropic.messages.create>[0]
  )
  const parsed = parseClaudeResponse(response as Anthropic.Messages.Message)

  console.log(`\n━━━ ${tc.label} (expect: ${tc.expect}) ━━━`)
  console.log(`  Reply: ${parsed.replyText.trim() || '(none)'}`)
  if (parsed.toolCalls.length) {
    for (const t of parsed.toolCalls) {
      console.log(`  Tool:  ${t.name}(${JSON.stringify(t.input)})`)
    }
  } else {
    console.log('  Tool:  (none)')
  }
}

async function main() {
  console.log('\n=== Location Gate Behavior Test ===')
  console.log(`Brand: ${BRAND_NAME}`)
  console.log(`Cases: ${TEST_CASES.length}\n`)

  for (const tc of TEST_CASES) {
    try {
      await runOne(tc)
    } catch (err) {
      console.error(`  ❌ ${tc.label}:`, err)
    }
  }

  console.log('\n=== Manual review checklist ===')
  console.log(
    '  decline  → reply should be the US/Canada decline + generate_summary with qualification_status="out_of_area"'
  )
  console.log(
    '  continue → reply should ask another qualifier (motivation/goal), NO decline language'
  )
  console.log(
    '  clarify  → reply should ask a single clarifying question (e.g. "is that Toronto, Canada?"), NO decline yet\n'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
