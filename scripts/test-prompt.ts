/**
 * Live prompt test — sends realistic conversation scenarios through the
 * setter-v2 prompt and checks Claude's responses against v2 rules.
 *
 * Usage:
 *   npx tsx scripts/test-prompt.ts
 *   npx tsx scripts/test-prompt.ts --scenario cold-open
 *   npx tsx scripts/test-prompt.ts --verbose
 */

import Anthropic from '@anthropic-ai/sdk'
import { getClient, SONNET_MODEL } from './lib/claude-client'

// ---------------------------------------------------------------------------
// Prompt builder (inline to avoid Next.js import issues in scripts)
// ---------------------------------------------------------------------------

import { join } from 'node:path'

async function loadPrompt(): Promise<string> {
  const sectionsDir = join(process.cwd(), 'src/lib/prompts/sections')

  const [
    persona,
    company,
    qualification,
    objections,
    emailCapture,
    routing,
    summary,
    constraints,
  ] = await Promise.all([
    import(join(sectionsDir, 'persona')),
    import(join(sectionsDir, 'company-context')),
    import(join(sectionsDir, 'qualification')),
    import(join(sectionsDir, 'objections')),
    import(join(sectionsDir, 'email-capture')),
    import(join(sectionsDir, 'decision-routing')),
    import(join(sectionsDir, 'summary-generation')),
    import(join(sectionsDir, 'message-constraints')),
  ])

  const sections = [
    persona.buildPersona('VendingPreneurs'),
    company.buildCompanyContext('VendingPreneurs'),
    qualification.buildQualificationCriteria(),
    objections.buildObjectionHandling('VendingPreneurs'),
    emailCapture.buildEmailCapture(),
    routing.buildDecisionRouting(),
    summary.buildSummaryGeneration(),
    constraints.buildMessageConstraints(),
  ]

  return `[setter-v2]\n\n${sections.join('\n\n')}`
}

// ---------------------------------------------------------------------------
// Tools (same as claude.ts)
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'capture_email',
    description:
      "Capture the lead's email address once they provide it in conversation.",
    input_schema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'The email address provided by the lead',
        },
      },
      required: ['email'],
    },
  },
  {
    name: 'qualify_lead',
    description: 'Record qualification signals gathered during conversation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        machine_count: { type: 'number' },
        location_type: { type: 'string' },
        revenue_range: { type: 'string' },
      },
    },
  },
  {
    name: 'generate_summary',
    description: 'Generate a structured summary of the lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        instagram_handle: { type: 'string' },
        qualification_status: { type: 'string', enum: ['hot', 'warm', 'cold'] },
        call_booked: { type: 'boolean' },
        name: { type: 'string' },
        email: { type: 'string' },
        machine_count: { type: 'number' },
        location_type: { type: 'string' },
        revenue_range: { type: 'string' },
        key_notes: { type: 'string' },
        recommended_action: { type: 'string' },
      },
      required: ['instagram_handle', 'qualification_status', 'call_booked'],
    },
  },
  {
    name: 'book_call',
    description: 'Initiate or confirm a call booking.',
    input_schema: {
      type: 'object' as const,
      properties: {
        calendly_slot: { type: 'string' },
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

interface Scenario {
  name: string
  description: string
  messages: Anthropic.Messages.MessageParam[]
  checks: Check[]
}

interface Check {
  label: string
  test: (response: string, toolCalls: ToolCallResult[]) => boolean
}

interface ToolCallResult {
  name: string
  input: Record<string, unknown>
}

const SCENARIOS: Scenario[] = [
  {
    name: 'cold-open',
    description:
      'Prospect replies to a comment trigger — AI should build rapport and ask location first',
    messages: [
      {
        role: 'user',
        content:
          'Yeah I saw your post about vending machines, sounds interesting!',
      },
    ],
    checks: [
      {
        label:
          'Asks about location, motivation, or what caught their eye (not budget)',
        test: (r) =>
          /where|location|area|what.*caught|what.*interest|what.*stood out|what.*got you/i.test(
            r
          ) && !/budget|invest|capital|\$.*k/i.test(r),
      },
      {
        label: 'No forbidden phrases',
        test: (r) =>
          !r.includes('just popping in here real quick') &&
          !r.includes('Still with me'),
      },
      {
        label: 'Under 2000 characters',
        test: (r) => r.length <= 2000,
      },
      {
        label: 'No markdown formatting',
        test: (r) => !/^#{1,3}\s|^\*\*|\[.*\]\(.*\)/m.test(r),
      },
    ],
  },
  {
    name: 'qualification-flow',
    description:
      'Prospect shares location — AI should ask about goal/motivation next, NOT budget',
    messages: [
      {
        role: 'user',
        content: 'Hey! Saw your reel about vending. Really interested.',
      },
      {
        role: 'assistant',
        content:
          "That's awesome — what specifically caught your eye about vending?",
      },
      {
        role: 'user',
        content:
          "I'm in Jacksonville, FL and I've been looking for a side business that doesn't take all my time.",
      },
    ],
    checks: [
      {
        label: 'Does NOT ask budget immediately after location',
        test: (r) =>
          !/how much.*invest|budget|capital.*get started|\$.*k.*get started/i.test(
            r
          ),
      },
      {
        label: 'Validates Jacksonville specifically (locally aware)',
        test: (r) => /jacksonville/i.test(r),
      },
      {
        label: 'Asks about goal, experience, or timeline (not budget)',
        test: (r) =>
          /goal|looking to|experience|tried|familiar|timeline|when.*start|side.*income|full.?time/i.test(
            r
          ),
      },
    ],
  },
  {
    name: 'objection-no-capital',
    description:
      "Prospect says they don't have money — AI should Acknowledge-Probe-Respond",
    messages: [
      { role: 'user', content: 'Hey saw your post about vending' },
      {
        role: 'assistant',
        content: 'Nice to meet you! What area are you based in?',
      },
      { role: 'user', content: "I'm in Atlanta" },
      {
        role: 'assistant',
        content:
          "Atlanta's a great market — tons of offices, gyms, apartment complexes. What got you interested in vending?",
      },
      {
        role: 'user',
        content:
          "I want to build passive income but honestly I don't have much money to start with right now",
      },
    ],
    checks: [
      {
        label: 'Acknowledges the concern (empathy before solution)',
        test: (r) =>
          /makes sense|totally get|understand|hear you|fair|appreciate|upfront|get that/i.test(
            r
          ),
      },
      {
        label: 'Does NOT immediately push budget question or dismiss',
        test: (r) =>
          !/how much do you have|what.*budget|you need at least/i.test(r),
      },
      {
        label:
          'Probes specifics OR mentions financing/creative options (Acknowledge-Probe-Respond)',
        test: (r) =>
          /financ|creative|options|less.*upfront|start.*less|how much.*saved|starting from.*zero|feel like enough|some saved/i.test(
            r
          ),
      },
    ],
  },
  {
    name: 'objection-needs-to-think',
    description:
      'Prospect says they need to think — AI should probe what they need to think about',
    messages: [
      { role: 'user', content: 'I saw your vending content, pretty cool' },
      { role: 'assistant', content: 'Thanks! Whereabouts are you located?' },
      { role: 'user', content: 'Denver area' },
      {
        role: 'assistant',
        content:
          "Denver's solid — great mix of office parks and gyms. Have you looked into vending before or is this new territory?",
      },
      {
        role: 'user',
        content: "It's new to me. I've been reading about it for a few months",
      },
      {
        role: 'assistant',
        content:
          "That's a good sign you've been doing your homework. Are you thinking side income or looking to go bigger with it?",
      },
      {
        role: 'user',
        content:
          'I need to think about it more. Not sure if now is the right time',
      },
    ],
    checks: [
      {
        label: 'Probes what they need to think about (not just accepts)',
        test: (r) =>
          /what.*think.*through|what.*hold|main.*thing|what.*concern|what.*hesitat/i.test(
            r
          ),
      },
      {
        label: 'Does NOT just say "no worries, let me know"',
        test: (r) =>
          !/^(no worries|no problem|all good|take your time)[.!]*$/i.test(
            r.trim()
          ),
      },
    ],
  },
  {
    name: 'email-capture-post-booking',
    description:
      'Prospect confirms booking — AI MUST ask for email with value exchange',
    messages: [
      { role: 'user', content: 'Hey interested in vending machines!' },
      { role: 'assistant', content: 'What area are you based in?' },
      {
        role: 'user',
        content:
          'Phoenix, AZ. I have about 8K saved up and want to start a route',
      },
      {
        role: 'assistant',
        content:
          "Phoenix is a great market and 8K is a solid starting point. Would you be open to a free 30-minute call with the team? They can map out exactly what getting started would look like for your situation. Here's the link: calendly.com/vendingpreneurs",
      },
      { role: 'user', content: 'Just booked for Thursday at 2pm!' },
    ],
    checks: [
      {
        label: 'Asks for email',
        test: (r) => /email/i.test(r),
      },
      {
        label:
          'Frames email ask with value exchange (prep materials, confirmation, resources)',
        test: (r) =>
          /prep|materials|confirmation|resources|send.*over/i.test(r),
      },
      {
        label: 'Calls capture_email or book_call tool',
        test: (_r, tools) =>
          tools.some(
            (t) => t.name === 'book_call' || t.name === 'capture_email'
          ),
      },
    ],
  },
  {
    name: 'trust-concern',
    description:
      'Prospect expresses skepticism — AI should stay warm and build credibility',
    messages: [
      {
        role: 'user',
        content:
          "Someone sent me here but honestly I'm skeptical. A lot of these vending programs are just scams.",
      },
    ],
    checks: [
      {
        label: 'Does NOT get defensive',
        test: (r) => !/we.?re not a scam|how dare|that.?s offensive/i.test(r),
      },
      {
        label: 'Validates the skepticism',
        test: (r) =>
          /fair|totally get|understand|makes sense|right to be|smart to be/i.test(
            r
          ),
      },
      {
        label: 'Offers transparency or credibility signal',
        test: (r) =>
          /open book|free|no.*charge|my own.*route|started.*myself|ask.*anything/i.test(
            r
          ),
      },
    ],
  },
  {
    name: 'third-party-fraud',
    description:
      'Prospect reports being charged — AI should follow fraud response protocol',
    messages: [
      {
        role: 'user',
        content:
          "Hey I already paid $47 for your vending masterclass but I never got access. What's going on?",
      },
    ],
    checks: [
      {
        label: 'Identifies as unauthorized third party',
        test: (r) => /unauthorized|third.?party/i.test(r),
      },
      {
        label: 'States everything starts free',
        test: (r) => /free|never charge|no cost/i.test(r),
      },
      {
        label: 'Apologizes and redirects to the real thing',
        test: (r) => /sorry|apologize/i.test(r) && /call|connect|real/i.test(r),
      },
    ],
  },
  {
    name: 'message-format',
    description:
      'Multi-turn check — AI should send single consolidated messages, no bare links',
    messages: [
      { role: 'user', content: 'Yo whats good, vending looks fire' },
      { role: 'assistant', content: "What's good! What area are you in?" },
      { role: 'user', content: 'LA baby. Got like 10K and ready to go' },
    ],
    checks: [
      {
        label: 'Single consolidated message (no line that is just a URL)',
        test: (r) => !/^https?:\/\/\S+$/m.test(r),
      },
      {
        label: 'Matches casual energy (short, direct)',
        test: (r) => r.length < 800,
      },
      {
        label: 'Validates LA market',
        test: (r) => /la|los angeles|angel/i.test(r),
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runScenario(
  client: Anthropic,
  systemPrompt: string,
  scenario: Scenario,
  verbose: boolean
): Promise<{ passed: number; failed: number; results: string[] }> {
  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: scenario.messages,
    tools: TOOLS,
  })

  // Extract text and tool calls
  const textParts: string[] = []
  const toolCalls: ToolCallResult[] = []

  for (const block of response.content) {
    if (block.type === 'text') {
      textParts.push(block.text)
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        input: block.input as Record<string, unknown>,
      })
    }
  }

  const replyText = textParts.join(' ')

  // Run checks
  let passed = 0
  let failed = 0
  const results: string[] = []

  for (const check of scenario.checks) {
    const ok = check.test(replyText, toolCalls)
    if (ok) {
      passed++
      results.push(`  ✓ ${check.label}`)
    } else {
      failed++
      results.push(`  ✗ ${check.label}`)
    }
  }

  if (verbose || failed > 0) {
    results.push('')
    results.push(`  Response (${replyText.length} chars):`)
    results.push(
      `  "${replyText.slice(0, 500)}${replyText.length > 500 ? '...' : ''}"`
    )
    if (toolCalls.length > 0) {
      results.push(`  Tools called: ${toolCalls.map((t) => t.name).join(', ')}`)
    }
  }

  return { passed, failed, results }
}

async function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose') || args.includes('-v')
  const scenarioFilter = args.find((a) => !a.startsWith('-'))

  const scenarios = scenarioFilter
    ? SCENARIOS.filter((s) => s.name === scenarioFilter)
    : SCENARIOS

  if (scenarios.length === 0) {
    console.error(`\nUnknown scenario: "${scenarioFilter}"`)
    console.error(`Available: ${SCENARIOS.map((s) => s.name).join(', ')}`)
    process.exit(1)
  }

  console.log('\n━━━ Setter v2 Prompt Test ━━━')
  console.log(`Scenarios: ${scenarios.length} | Model: ${SONNET_MODEL}\n`)

  // Build the prompt
  let systemPrompt: string
  try {
    systemPrompt = await loadPrompt()
    console.log(`Prompt loaded (${systemPrompt.length} chars)\n`)
  } catch (err) {
    console.error('Failed to load prompt:', err)
    process.exit(1)
  }

  const client = getClient()
  let totalPassed = 0
  let totalFailed = 0

  for (const scenario of scenarios) {
    console.log(`▸ ${scenario.name}`)
    console.log(`  ${scenario.description}`)

    try {
      const { passed, failed, results } = await runScenario(
        client,
        systemPrompt,
        scenario,
        verbose
      )

      totalPassed += passed
      totalFailed += failed

      for (const line of results) {
        console.log(line)
      }

      console.log(`  (${passed}/${passed + failed} checks passed)`)
    } catch (err) {
      console.log(`  ✗ API ERROR: ${err instanceof Error ? err.message : err}`)
      totalFailed += scenario.checks.length
    }

    console.log()
  }

  // Summary
  console.log('━━━ Summary ━━━')
  console.log(`Total: ${totalPassed + totalFailed} checks`)
  console.log(`Passed: ${totalPassed}`)
  console.log(`Failed: ${totalFailed}`)

  if (totalFailed > 0) {
    console.log('\n⚠ Some checks failed — review responses above.')
    process.exit(1)
  } else {
    console.log('\n✓ All checks passed.')
  }
}

main()
