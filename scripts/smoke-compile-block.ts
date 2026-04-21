/**
 * Smoke-test every block type's directive override against the live Claude API.
 *
 * For each of the 8 block types:
 * 1. Compile a system prompt with a distinctive goal override.
 * 2. Send a contextually-appropriate conversation history.
 * 3. Check whether the reply reflects the override marker.
 *
 * Usage:
 *   npx tsx scripts/smoke-compile-block.ts
 *   npx tsx scripts/smoke-compile-block.ts --verbose
 *
 * Exits 0 if every block reflects its marker; 1 otherwise.
 */

import Anthropic from '@anthropic-ai/sdk'
import { getClient, SONNET_MODEL } from './lib/claude-client'
import { compileBlock } from '../src/lib/prompts/compile-block/compile-block'
import type { BlockType } from '../src/app/dashboard/flows/[flowId]/types'

interface SmokeCase {
  block: BlockType
  label: string
  goalOverride: string
  marker: RegExp
  history: Anthropic.Messages.MessageParam[]
}

const CASES: SmokeCase[] = [
  {
    block: 'opening',
    label: 'Opening',
    goalOverride:
      'Greet warmly and immediately ask which city they are in. Use the exact word "city" in your first question.',
    marker: /city/i,
    history: [
      {
        role: 'user',
        content: 'hey, saw your vending stuff — interested in learning more',
      },
    ],
  },
  {
    block: 'qualifier',
    label: 'Qualifier',
    goalOverride:
      'Ask specifically about their weekly working hours. Use the exact phrase "weekly working hours" in your reply.',
    marker: /weekly working hours/i,
    history: [
      { role: 'user', content: 'hey — curious about your vending setup' },
      { role: 'assistant', content: 'Glad to hear it! Where are you based?' },
      { role: 'user', content: "I'm in Atlanta, just getting started" },
    ],
  },
  {
    block: 'objection',
    label: 'Objection',
    goalOverride:
      'After acknowledging and probing the prospect\'s concern, offer a quick 10-minute team chat as the next step. Use the exact phrase "10-minute team chat" somewhere in your reply.',
    marker: /10-minute team chat/i,
    history: [
      { role: 'user', content: 'thinking about getting into vending' },
      {
        role: 'assistant',
        content: 'Nice — where are you located?',
      },
      {
        role: 'user',
        content: "Chicago. Honestly it feels expensive and I'm not sure",
      },
    ],
  },
  {
    block: 'booking',
    label: 'Booking',
    goalOverride:
      'When the prospect is qualified, drop the booking link and explicitly mention that the booking page shows "live availability" — use those exact words.',
    marker: /live availability/i,
    history: [
      { role: 'user', content: 'interested in vending, 7K saved up' },
      {
        role: 'assistant',
        content: 'Nice, where are you located?',
      },
      {
        role: 'user',
        content:
          "Dallas. I've got some retail experience too and want extra income",
      },
    ],
  },
  {
    block: 'email',
    label: 'Email Capture',
    goalOverride:
      'When asking for email, phrase the request around a "starter kit PDF" — use the exact phrase "starter kit PDF" in your reply.',
    marker: /starter kit pdf/i,
    history: [
      { role: 'user', content: 'yeah I booked a time, 2pm Thursday works' },
    ],
  },
  {
    block: 'followup',
    label: 'Follow-up',
    goalOverride:
      'Open the 48-hour follow-up with a reference to "Vending Pulse weekly" — use those exact words.',
    marker: /vending pulse weekly/i,
    history: [
      {
        role: 'user',
        content: "Hey, any update after our call? It's been two days.",
      },
    ],
  },
  {
    block: 'escalation',
    label: 'Escalation',
    goalOverride:
      'When escalating, tell the prospect that the handoff will include a "closer briefing dossier" — use those exact words.',
    marker: /closer briefing dossier/i,
    history: [
      {
        role: 'user',
        content:
          'Just got off the call. The $8K thing feels off, I need to think about price.',
      },
    ],
  },
  {
    block: 'summary',
    label: 'Summary',
    goalOverride:
      'At natural end points, include the phrase "summary checkpoint" somewhere in the reply before generating the tool call.',
    marker: /summary checkpoint/i,
    history: [
      { role: 'user', content: 'hey, interested in vending' },
      { role: 'assistant', content: 'Nice, where are you based?' },
      { role: 'user', content: "I'm in Phoenix, I've got about 10K to start" },
      {
        role: 'assistant',
        content:
          "Phoenix is a strong market. Here's the link to grab a time with the team: https://booking.vendingpreneurs.com/demo. What email should I send your confirmation to?",
      },
      {
        role: 'user',
        content:
          "emma@example.com. Thanks, I've got to run now, talk next week.",
      },
    ],
  },
]

function colour(s: string, c: 'red' | 'green' | 'yellow' | 'dim'): string {
  const codes = { red: 31, green: 32, yellow: 33, dim: 90 } as const
  return `\x1b[${codes[c]}m${s}\x1b[0m`
}

async function runOne(
  client: Anthropic,
  kase: SmokeCase,
  verbose: boolean
): Promise<{ passed: boolean; reply: string; error?: string }> {
  const systemPrompt = compileBlock({
    brand: 'VendingPreneurs',
    overrides: {
      activeBlockType: kase.block,
      goal: kase.goalOverride,
    },
  })

  if (verbose) {
    console.log(colour(`\n--- ${kase.label} system tail ---`, 'dim'))
    console.log(colour(systemPrompt.slice(-500), 'dim'))
  }

  try {
    const response = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: kase.history,
    })
    const reply =
      response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n') || '<no text reply>'
    const passed = kase.marker.test(reply)
    return { passed, reply }
  } catch (err) {
    return {
      passed: false,
      reply: '',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  const verbose = process.argv.includes('--verbose')
  const client = getClient()

  console.log(
    colour(
      `\nSmoke-testing ${CASES.length} block types against live Claude\n`,
      'yellow'
    )
  )

  const results = await Promise.all(
    CASES.map((kase) => runOne(client, kase, verbose))
  )

  let passed = 0
  for (let i = 0; i < CASES.length; i++) {
    const kase = CASES[i]!
    const res = results[i]!
    const icon = res.passed ? colour('✓', 'green') : colour('✗', 'red')
    console.log(`${icon} ${kase.label.padEnd(16)} marker: ${kase.marker}`)
    if (res.error) {
      console.log(colour(`    ERROR: ${res.error}`, 'red'))
    } else {
      console.log(colour(`    reply: ${res.reply.slice(0, 200)}`, 'dim'))
    }
    if (res.passed) passed++
  }

  console.log(
    colour(
      `\n${passed}/${CASES.length} blocks reflected their directive override`,
      passed === CASES.length ? 'green' : 'yellow'
    )
  )

  process.exit(passed === CASES.length ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
