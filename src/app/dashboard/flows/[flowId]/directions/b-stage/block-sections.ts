import { buildCompanyContext } from '@/lib/prompts/sections/company-context'
import { buildDecisionRouting } from '@/lib/prompts/sections/decision-routing'
import { buildEmailCapture } from '@/lib/prompts/sections/email-capture'
import { buildLocationGate } from '@/lib/prompts/sections/location-gate'
import { buildMessageConstraints } from '@/lib/prompts/sections/message-constraints'
import { buildObjectionHandling } from '@/lib/prompts/sections/objections'
import { buildPersona } from '@/lib/prompts/sections/persona'
import { buildQualificationCriteria } from '@/lib/prompts/sections/qualification'
import { buildSummaryGeneration } from '@/lib/prompts/sections/summary-generation'

import type {
  BlockConfig,
  BlockType,
  Branch,
  Capture,
  EmailTrigger,
  ExamplePair,
  Guardrail,
  ObjectionHandler,
  QualifierEntry,
  QualifierThreshold,
  SummaryField,
} from '../../types'

export interface SectionRationale {
  stat?: string
  insights: string[]
}

export interface PromptSection {
  id: string
  title: string
  source: string
  text: string
  primaryFor?: string
  rationale?: SectionRationale
}

export interface BlockPromptPlan {
  primary: PromptSection[]
  global: PromptSection[]
}

const sections = (
  brand: string,
  bookingUrl?: string
): Record<string, PromptSection> => ({
  persona: {
    id: 'persona',
    title: 'Persona',
    source: 'src/lib/prompts/sections/persona.ts',
    text: buildPersona(brand),
    primaryFor: 'Who the bot is and how it speaks',
    rationale: {
      stat: '3,619 analyzed conversations',
      insights: [
        'Generic affirmations ("Nice man", "Okay smooth") kill rapport',
        'Repeated canned phrases signal automation and erode trust',
        'Peer-mentor tone outperforms salesperson tone 3:1 on bookings',
        'Identity-verification standoffs caused trust collapse in 15+ convos',
      ],
    },
  },
  'company-context': {
    id: 'company-context',
    title: 'Company Context',
    source: 'src/lib/prompts/sections/company-context.ts',
    text: buildCompanyContext(brand),
    primaryFor: 'What the business does and key facts',
    rationale: {
      insights: [
        'Prospects had zero context on pricing, program structure, or team roles',
        'Third-party pricing fraud ($27/$47/$197) created trust breakdowns',
        'Framing masterclass value proactively prevents objections',
        'Prospects arrive algorithm-driven with zero vending knowledge',
      ],
    },
  },
  'location-gate': {
    id: 'location-gate',
    title: 'Location Gate',
    source: 'src/lib/prompts/sections/location-gate.ts',
    text: buildLocationGate(brand),
    primaryFor: 'Hard filter for supported markets (US/CA)',
    rationale: {
      insights: [
        'Only US and Canada are currently supported — no exceptions',
        'Out-of-region prospects must be declined warmly, flagged out_of_area',
        'Runs BEFORE qualification so ineligible leads never reach booking',
      ],
    },
  },
  qualification: {
    id: 'qualification',
    title: 'Qualification Criteria',
    source: 'src/lib/prompts/sections/qualification.ts',
    text: buildQualificationCriteria(),
    primaryFor: 'What to collect and in what order',
    rationale: {
      insights: [
        'Zero qualification attempted in many conversations that died at value delivery',
        'Budget asked before value established killed conversations consistently',
        'Location is the highest-rapport qualifier and easiest entry point',
        'Volunteered hesitations ("money and time") were ignored as signals',
        'Minimum 2 qualifiers before booking link prevents calendar flooding',
      ],
    },
  },
  objections: {
    id: 'objections',
    title: 'Objection Handling',
    source: 'src/lib/prompts/sections/objections.ts',
    text: buildObjectionHandling(brand),
    primaryFor: 'Acknowledge → probe → respond for every objection type',
    rationale: {
      stat: '5,438 classified conversations · 9 objection types · 11-31% resolution',
      insights: [
        'Top three: timing (381×, 23%), no-capital (356×, 22%), location (186×, 12%)',
        'Objections ignored, deflected, or escalated without probing → lost leads',
        'Acknowledge-Probe-Respond structure outperforms all other patterns',
        'Budget questions before value = conversation death',
      ],
    },
  },
  'email-capture': {
    id: 'email-capture',
    title: 'Email Capture',
    source: 'src/lib/prompts/sections/email-capture.ts',
    text: buildEmailCapture(bookingUrl),
    primaryFor: 'When and how to ask for email',
    rationale: {
      stat: '20 emails captured across 5,438 conversations (0.4%)',
      insights: [
        '14+ conversations had zero email request at any point',
        'Post-booking is the highest-acceptance-probability trigger point',
        'Value exchange framing ("prep materials") outperforms bare asks',
        'Explicit confirmation loop validates the data',
      ],
    },
  },
  'decision-routing': {
    id: 'decision-routing',
    title: 'Decision Routing',
    source: 'src/lib/prompts/sections/decision-routing.ts',
    text: buildDecisionRouting(bookingUrl),
    primaryFor:
      'Gates that guard every action (booking, follow-up, escalation)',
    rationale: {
      stat: '2,147 went silent (39.5%)',
      insights: [
        'Systemic failure to re-engage after content delivery',
        'Booking links sent after zero qualification flooded the calendar',
        'No post-call follow-up branch existed — conversations dropped after call',
        'Post-call price objections handled by AI instead of escalated to closer',
        'Premature loop closure — link-send treated as conversation-complete',
      ],
    },
  },
  'summary-generation': {
    id: 'summary-generation',
    title: 'Summary Generation',
    source: 'src/lib/prompts/sections/summary-generation.ts',
    text: buildSummaryGeneration(),
    primaryFor: 'Structured lead data written at end of conversation',
    rationale: {
      insights: [
        'No prospect summaries generated in any historical conversations',
        'Qualification data gathered through rapport was never synthesized',
        'Mirroring back gathered info before booking creates personalized close',
        'Closers received zero context — cold handoff every time',
        'Under-qualified leads hitting the calendar wasted team time',
      ],
    },
  },
  'message-constraints': {
    id: 'message-constraints',
    title: 'Message Constraints',
    source: 'src/lib/prompts/sections/message-constraints.ts',
    text: buildMessageConstraints(bookingUrl),
    primaryFor: 'Format rules: 2 sentences max, no markdown',
    rationale: {
      insights: [
        'Multiple consecutive short messages without waiting for replies (2-4 stacks)',
        'Raw automation text surfaced visibly ("You sent a private reply...")',
        'Bare URLs sent as final messages with no CTA',
        'Top-of-funnel automations fired at post-booking prospects',
        'Identical canned phrases repeated verbatim in the same conversation',
      ],
    },
  },
})

const BLOCK_PRIMARY_SECTIONS: Record<BlockType, string[]> = {
  opening: ['location-gate'],
  qualifier: ['qualification', 'location-gate'],
  objection: ['objections'],
  booking: ['decision-routing', 'email-capture'],
  email: ['email-capture'],
  followup: ['decision-routing'],
  escalation: ['decision-routing'],
  summary: ['summary-generation'],
}

const GLOBAL_IDS = ['persona', 'company-context', 'message-constraints']

export function getBlockPromptPlan(
  brand: string,
  type: BlockType,
  opts: { bookingUrl?: string } = {}
): BlockPromptPlan {
  const bank = sections(brand, opts.bookingUrl)
  const primary = BLOCK_PRIMARY_SECTIONS[type].map((id) => bank[id]!)
  const global = GLOBAL_IDS.map((id) => bank[id]!)
  return { primary, global }
}

export function countLines(text: string): number {
  return text.split('\n').length
}

// ---------------------------------------------------------------------------
// Example-pair extraction — lifted from prompt-render so the inspector can
// render good/bad pairs without duplicating the parser.
// ---------------------------------------------------------------------------

export function extractExamples(sectionText: string): ExamplePair[] {
  const lines = sectionText.split('\n')
  const out: ExamplePair[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i]!.trim() !== '<examples>') {
      i++
      continue
    }
    i++
    while (i < lines.length && lines[i]!.trim() !== '</examples>') {
      if (lines[i]!.trim() === '<example>') {
        const pair: ExamplePair = {}
        i++
        while (i < lines.length && lines[i]!.trim() !== '</example>') {
          const raw = lines[i]!.trim()
          const m = raw.match(/^<(prospect|good_reply|bad_reply)>(.*)<\/\1>$/)
          if (m) {
            const tag = m[1]
            const content = m[2]
            if (tag === 'prospect') pair.prospect = content
            else if (tag === 'good_reply') pair.good = content
            else if (tag === 'bad_reply') pair.bad = content
          }
          i++
        }
        out.push(pair)
      }
      i++
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Persona parser — splits the compiled persona text by its `###` sub-headings
// into named panels for the Bot page.
// ---------------------------------------------------------------------------

export type PersonaSectionKey =
  | 'voice'
  | 'messageLength'
  | 'affirmation'
  | 'forbidden'
  | 'offTopic'
  | 'identity'
  | 'continuity'

export interface PersonaSection {
  key: PersonaSectionKey
  heading: string
  body: string
  locked: boolean
  why: string
}

const PERSONA_HEADING_MAP: Array<{
  match: RegExp
  key: PersonaSectionKey
  locked: boolean
  why: string
}> = [
  {
    match: /^Identity/i,
    key: 'identity',
    locked: true,
    why: 'Hard-locked: the IG account is a shared team inbox, never a named person.',
  },
  {
    match: /^Voice/i,
    key: 'voice',
    locked: false,
    why: 'Tone is customisable per brand. Peer-mentor beats salesperson 3:1.',
  },
  {
    match: /^Message Length/i,
    key: 'messageLength',
    locked: true,
    why: 'Platform constraint — Instagram DMs that exceed 2 sentences tank engagement.',
  },
  {
    match: /^Affirmation/i,
    key: 'affirmation',
    locked: false,
    why: 'Generic praise kills rapport. Customise, but every affirmation must reflect something the prospect said.',
  },
  {
    match: /^Forbidden/i,
    key: 'forbidden',
    locked: true,
    why: 'Data-driven guardrail — these phrases correlate with lost leads.',
  },
  {
    match: /^Continuity/i,
    key: 'continuity',
    locked: false,
    why: 'Reference prior messages. Customisable.',
  },
  {
    match: /^Off-Topic/i,
    key: 'offTopic',
    locked: true,
    why: 'Compliance — inbound cold pitches must route to HUMAN_REVIEW_NEEDED.',
  },
]

export function parsePersonaSections(personaText: string): PersonaSection[] {
  const lines = personaText.split('\n')
  const out: PersonaSection[] = []
  let current: { heading: string; body: string[] } | null = null
  const flush = () => {
    if (!current) return
    const map = PERSONA_HEADING_MAP.find((m) => m.match.test(current!.heading))
    if (map) {
      out.push({
        key: map.key,
        heading: current.heading,
        body: current.body.join('\n').trim(),
        locked: map.locked,
        why: map.why,
      })
    }
    current = null
  }
  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush()
      current = { heading: line.slice(4).trim(), body: [] }
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      continue
    }
    if (current) current.body.push(line)
  }
  flush()
  return out
}

// ---------------------------------------------------------------------------
// Guardrail extraction — pulls bullets starting with "Never", "Always",
// "MAXIMUM", "HARD LIMIT" from a section's compiled text.
// ---------------------------------------------------------------------------

const GUARDRAIL_PREFIXES = [
  'Never',
  'Always',
  'MAXIMUM',
  'HARD LIMIT',
  'MANDATORY',
  'CRITICAL:',
  'Do NOT',
  'Do not',
  'MUST NOT',
  'You MUST',
  'This is non-negotiable',
]

export function extractGuardrails(
  sectionText: string,
  source: string,
  why: string
): Guardrail[] {
  const lines = sectionText.split('\n')
  const out: Guardrail[] = []
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    let body: string | null = null
    if (line.startsWith('- ') || line.startsWith('* ')) {
      body = line.slice(2)
    } else if (/^\d+\.\s/.test(line)) {
      body = line.replace(/^\d+\.\s/, '')
    } else if (
      line.startsWith('**') &&
      GUARDRAIL_PREFIXES.some((p) => line.includes(p))
    ) {
      body = line
    }
    if (!body) return
    if (!GUARDRAIL_PREFIXES.some((p) => body!.includes(p))) return
    out.push({
      id: `${source}:${idx}`,
      text: body.replace(/\*\*/g, '').trim(),
      why,
      source,
    })
  })
  return out
}

const GLOBAL_GUARDRAIL_SOURCES = [
  'src/lib/prompts/sections/persona.ts',
  'src/lib/prompts/sections/message-constraints.ts',
] as const

const GLOBAL_GUARDRAIL_SOURCE_SET = new Set<string>(GLOBAL_GUARDRAIL_SOURCES)

export function isGlobalGuardrailSource(source: string): boolean {
  return GLOBAL_GUARDRAIL_SOURCE_SET.has(source)
}

export function extractBotGuardrails({
  personaText,
  messageConstraintsText,
}: {
  personaText: string
  messageConstraintsText: string
}): Guardrail[] {
  return [
    ...extractGuardrails(
      messageConstraintsText,
      'src/lib/prompts/sections/message-constraints.ts',
      'Instagram DM format constraint — universal across every block.'
    ),
    ...extractGuardrails(
      personaText,
      'src/lib/prompts/sections/persona.ts',
      'Persona-level identity/voice rule — shared team inbox, never a named person.'
    ),
  ]
}

// ---------------------------------------------------------------------------
// Qualifier parser — extracts the 5 numbered qualifiers from qualification.ts.
// ---------------------------------------------------------------------------

const QUALIFIER_META: Array<{
  priority: number
  key: QualifierEntry['key']
  locked: boolean
}> = [
  { priority: 1, key: 'location', locked: true },
  { priority: 2, key: 'motivation', locked: false },
  { priority: 3, key: 'experience', locked: false },
  { priority: 4, key: 'capital', locked: true },
  { priority: 5, key: 'timeline', locked: false },
]

function parseQualifiers(qualText: string): QualifierEntry[] {
  const lines = qualText.split('\n')
  const entries: QualifierEntry[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!.trim()
    const m = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*:?\s*(.*)$/)
    if (!m) {
      i++
      continue
    }
    const priority = Number(m[1])
    const label = m[2]!.trim()
    const trailer = m[3]!.trim()
    const askLines: string[] = []
    const rules: string[] = []
    i++
    while (i < lines.length) {
      const raw = lines[i]!
      const t = raw.trim()
      if (/^\d+\.\s+\*\*/.test(t)) break
      if (t.startsWith('### ') || t.startsWith('## ')) break
      if (t.startsWith('"')) {
        // Handle lines that stack multiple quoted alternatives:
        //   "Whereabouts are you located?" or "What area are you..."
        // Take only the first quoted span; fall back to whole line minus quotes
        // if the regex doesn't match (defensive).
        const firstQuoted = t.match(/^"([^"]+)"/)
        if (firstQuoted) {
          askLines.push(firstQuoted[1]!)
        }
      } else if (
        t.startsWith('- ') &&
        (t.includes('NEVER') || t.includes('Frame') || t.includes('Always'))
      ) {
        rules.push(t.slice(2))
      }
      i++
    }
    const meta = QUALIFIER_META.find((q) => q.priority === priority)
    if (meta) {
      entries.push({
        priority,
        key: meta.key,
        label,
        ask: askLines[0] ?? trailer,
        rules,
        locked: meta.locked,
      })
    }
  }
  return entries
}

function parseQualifierThresholds(qualText: string): QualifierThreshold[] {
  const out: QualifierThreshold[] = []
  const lines = qualText.split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    const m = line.match(/^-\s+\*\*(Hot|Warm|Cold)\*\*:\s*(.+)$/i)
    if (!m) continue
    const name = m[1]!.toLowerCase() as 'hot' | 'warm' | 'cold'
    out.push({ name, criteria: m[2]!.trim() })
  }
  return out
}

// ---------------------------------------------------------------------------
// Objection parser — extracts the 9 typed handlers + their stats from
// objections.ts.
// ---------------------------------------------------------------------------

const OBJECTION_TYPE_MAP: Record<string, ObjectionHandler['type']> = {
  TIMING: 'timing',
  'NO CAPITAL': 'no_capital',
  'LOCATION / SMALL MARKET': 'location',
  'NEEDS TO THINK': 'needs_to_think',
  PRICE: 'price',
  'BAD CREDIT': 'bad_credit',
  TRUST: 'trust',
  'SPOUSE APPROVAL': 'spouse_approval',
  'ALREADY HAS MACHINES': 'already_has_machines',
}

function parseObjectionHandlers(objText: string): ObjectionHandler[] {
  const lines = objText.split('\n')
  const handlers: ObjectionHandler[] = []
  let current: {
    type: ObjectionHandler['type']
    label: string
    occurrences: number
    resolutionPct: number
    opener: string
    followUps: string[]
  } | null = null

  const commit = () => {
    if (!current) return
    handlers.push({ ...current })
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const line = raw.trim()
    const headerMatch = line.match(/^\*\*([A-Z /]+)\*\*\s*(?:\(([^)]+)\))?/)
    if (headerMatch) {
      commit()
      const label = headerMatch[1]!.trim()
      const statText = headerMatch[2] ?? ''
      const occMatch = statText.match(/(\d+)\s*occurrences?/)
      const pctMatch = statText.match(/(\d+)\s*%\s*resolved/)
      const type = OBJECTION_TYPE_MAP[label]
      if (!type) continue
      current = {
        type,
        label,
        occurrences: occMatch ? Number(occMatch[1]) : 0,
        resolutionPct: pctMatch ? Number(pctMatch[1]) : 0,
        opener: '',
        followUps: [],
      }
      continue
    }
    if (!current) continue
    if (line.startsWith('"') && line.endsWith('"')) {
      if (!current.opener) current.opener = line.slice(1, -1)
      continue
    }
    if (line.startsWith('- ')) {
      current.followUps.push(line.slice(2))
    }
  }
  commit()
  return handlers.sort((a, b) => b.occurrences - a.occurrences)
}

// ---------------------------------------------------------------------------
// Email trigger parser — pulls Primary / Backup / Secondary triggers from
// email-capture.ts.
// ---------------------------------------------------------------------------

function parseEmailTriggers(text: string): EmailTrigger[] {
  const lines = text.split('\n')
  const triggers: EmailTrigger[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!.trim()
    const headerMatch = line.match(
      /^###\s+(Primary|Backup|Secondary)\s+Trigger:\s*(.+)$/i
    )
    if (!headerMatch) {
      i++
      continue
    }
    const priority = headerMatch[1]!.toLowerCase() as EmailTrigger['priority']
    const when = headerMatch[2]!.replace(/—\s*MANDATORY/i, '').trim()
    const mandatory = /MANDATORY/i.test(headerMatch[2]!)
    const scriptLines: string[] = []
    i++
    while (i < lines.length) {
      const raw = lines[i]!.trim()
      if (raw.startsWith('###') || raw.startsWith('## ')) break
      if (raw.startsWith('"') && raw.endsWith('"')) {
        scriptLines.push(raw.slice(1, -1))
        break
      }
      i++
    }
    triggers.push({
      priority,
      when,
      script: scriptLines[0] ?? '',
      mandatory,
    })
  }
  return triggers
}

function parseConfirmationScript(text: string): string {
  const lines = text.split('\n')
  let inConf = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('### Confirmation')) {
      inConf = true
      continue
    }
    if (inConf && line.startsWith('"') && line.endsWith('"')) {
      return line.slice(1, -1)
    }
    if (inConf && line.startsWith('### ')) break
  }
  return ''
}

function parseHesitationScript(text: string): string {
  const m = text.match(/hesitates?:?\s*"([^"]+)"/i)
  return m ? m[1]! : ''
}

// ---------------------------------------------------------------------------
// Summary parser — required / optional fields + trigger words.
// ---------------------------------------------------------------------------

const REQUIRED_FIELD_KEYS = new Set([
  'instagram_handle',
  'qualification_status',
  'call_booked',
])

function parseSummaryFields(text: string): {
  required: SummaryField[]
  optional: SummaryField[]
} {
  const lines = text.split('\n')
  const required: SummaryField[] = []
  const optional: SummaryField[] = []
  for (const raw of lines) {
    const line = raw.trim()
    const m = line.match(/^\|\s*([a-z_]+)\s*\|\s*(Yes|No)\s*\|\s*(.+?)\s*\|$/i)
    if (!m) continue
    const key = m[1]!
    const field: SummaryField = {
      key,
      label: key.replace(/_/g, ' '),
      notes: m[3]!.trim(),
    }
    if (REQUIRED_FIELD_KEYS.has(key) || m[2] === 'Yes') {
      required.push(field)
    } else {
      optional.push(field)
    }
  }
  return { required, optional }
}

function parseTriggerWords(text: string): string[] {
  const lines = text.split('\n')
  const out: string[] = []
  let inTriggerSection = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('### Summary Trigger Words')) {
      inTriggerSection = true
      continue
    }
    if (inTriggerSection && line.startsWith('### ')) break
    if (!inTriggerSection) continue
    if (!line.startsWith('- ')) continue
    // Extract quoted phrases from bullet
    const matches = line.match(/"([^"]+)"/g)
    if (matches) {
      for (const match of matches) out.push(match.slice(1, -1))
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Location gate parser.
// ---------------------------------------------------------------------------

function parseOutOfAreaScript(text: string): string {
  const m = text.match(
    /"([^"]*wish I could help[^"]*)"|"([^"]*only set up[^"]*)"/i
  )
  return m ? (m[1] ?? m[2] ?? '') : ''
}

// ---------------------------------------------------------------------------
// Booking parser from decision-routing Gate 1/2.
// ---------------------------------------------------------------------------

function parseBookingConfig(routingText: string): {
  mirrorTemplate: string
  linkPattern: string
  emailAskCombined: string
  reengagementScript: string
} {
  const lines = routingText.split('\n')
  let mirror = ''
  let reengage = ''
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (line.startsWith('"So you\'re in [location]')) {
      mirror = line.slice(1, -1)
    }
    if (line.startsWith('"Hey [name], did you get a chance to grab a time?')) {
      reengage = line.slice(1, -1)
    }
  }
  // Link pattern is the booking_url variable; surfaced as a placeholder.
  const linkPattern = '{{brand.booking_url}}'
  const emailAskCombined =
    "Here's the link to grab a time: {{brand.booking_url}}. What email should I send your confirmation and prep materials to?"
  return {
    mirrorTemplate: mirror,
    linkPattern,
    emailAskCombined,
    reengagementScript: reengage,
  }
}

function parseFollowupScript(routingText: string): string {
  const m = routingText.match(
    /"Hey \[name\], hope your call with the team was helpful![^"]*"/
  )
  return m ? m[0].slice(1, -1) : ''
}

function parseEscalationTriggers(routingText: string): string[] {
  const out: string[] = []
  const lines = routingText.split('\n')
  let inEsc = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('### Escalation Rules')) {
      inEsc = true
      continue
    }
    if (inEsc && line.startsWith('### ')) break
    if (!inEsc) continue
    if (line.startsWith('- ')) {
      const body = line.slice(2)
      const colon = body.indexOf(':')
      out.push(colon > 0 ? body.slice(0, colon).trim() : body)
    }
  }
  return out
}

function parseEscalationHandoff(routingText: string): string {
  const m = routingText.match(
    /"That's a fair concern\. Let me flag this for the team[^"]*"/
  )
  return m ? m[0].slice(1, -1) : ''
}

// ---------------------------------------------------------------------------
// Derived-block view model.
// ---------------------------------------------------------------------------

export interface DerivedBlock {
  goal: string
  guidance: string
  examples: string[]
  examplePairs: ExamplePair[]
  captures: Capture[]
  branches: Branch[]
  rationale: string[]
  stat?: string
  guardrails: Guardrail[]
  blockConfig: BlockConfig
  primarySectionIds: string[]
  globalSectionIds: string[]
}

const BLOCK_CAPTURES: Record<BlockType, Capture[]> = {
  opening: [
    { label: 'Location from first reply', variable: 'contact.location' },
  ],
  qualifier: [
    { label: 'Location', variable: 'contact.location' },
    { label: 'Motivation', variable: 'contact.motivation' },
    { label: 'Budget range', variable: 'contact.budget' },
    { label: 'Timeline', variable: 'contact.timeline' },
    { label: 'Experience level', variable: 'contact.experience' },
  ],
  objection: [
    { label: 'Objection type', variable: 'conversation.last_objection' },
  ],
  booking: [{ label: 'Email', variable: 'contact.email' }],
  email: [{ label: 'Email', variable: 'contact.email' }],
  followup: [],
  escalation: [
    {
      label: 'Preferred contact method',
      variable: 'contact.preferred_contact',
    },
  ],
  summary: [
    {
      label: 'Qualification status',
      variable: 'conversation.qualification_status',
    },
    { label: 'Call booked', variable: 'conversation.call_booked' },
  ],
}

const BLOCK_BRANCHES: Record<BlockType, Branch[]> = {
  opening: [
    {
      id: 'op-1',
      label: 'Has location',
      target: 'qualifier',
      when: 'contact.location is set',
    },
    {
      id: 'op-2',
      label: 'Out of region',
      target: 'summary',
      when: 'location outside US/Canada',
    },
    {
      id: 'op-3',
      label: 'Raises objection',
      target: 'objection',
      when: 'message reads like an objection',
    },
  ],
  qualifier: [
    {
      id: 'q-1',
      label: 'Qualified (≥2 known)',
      target: 'booking',
      when: 'location AND motivation are set',
    },
    {
      id: 'q-2',
      label: 'Raises objection',
      target: 'objection',
      when: 'seems like an objection',
    },
  ],
  objection: [
    {
      id: 'o-1',
      label: 'Engagement recovers',
      target: 'qualifier',
      when: 'prospect re-engages',
    },
    {
      id: 'o-2',
      label: 'Post-call price',
      target: 'escalation',
      when: 'objection is price AND call occurred',
    },
  ],
  booking: [
    {
      id: 'b-1',
      label: 'Booked',
      target: 'summary',
      when: 'prospect confirms booking',
    },
    {
      id: 'b-2',
      label: 'Needs email',
      target: 'email',
      when: 'booking confirmed but email missing',
    },
    {
      id: 'b-3',
      label: 'Silent 24h',
      target: 'followup',
      when: 'silent for 24 hours',
    },
  ],
  email: [
    {
      id: 'e-1',
      label: 'Email captured',
      target: 'summary',
      when: 'email address provided',
    },
  ],
  followup: [
    {
      id: 'f-1',
      label: 'Positive',
      target: 'summary',
      when: 'response seems positive',
    },
    {
      id: 'f-2',
      label: 'Price objection',
      target: 'escalation',
      when: 'mentions price',
    },
  ],
  escalation: [
    {
      id: 'es-1',
      label: 'Handed off',
      target: 'summary',
      when: 'human closer assigned',
    },
  ],
  summary: [],
}

export const BLOCK_GOALS: Record<BlockType, string> = {
  opening:
    'Greet warmly, detect initial interest, and ask for location as the first qualifier.',
  qualifier:
    'Collect at least two of five qualifiers through natural conversation — location first, budget last.',
  objection: 'Acknowledge → probe → respond. Never skip to resolution.',
  booking:
    'Mirror back what you know, drop the booking link, and ask for email in the same message.',
  email:
    'Capture the email at the right moment (with the link, or immediately after booking confirmation).',
  followup:
    'After a 48-hour silence following a scheduled call, send one warm re-engagement message.',
  escalation:
    'Hand off to a human closer for post-call pricing, trust standoffs, and out-of-scope requests.',
  summary:
    'Write structured lead data to the closer via generate_summary at every natural end point.',
}

export const BLOCK_GUIDANCE: Record<BlockType, string> = {
  opening:
    "Match the prospect's energy. Don't interrogate. Ask ONE question — start with area. Run the location gate BEFORE qualification.",
  qualifier:
    'Weave questions into natural conversation. One at a time. Never ask budget before value is established.',
  objection:
    'Structure every reply as Acknowledge → Probe → Respond. One question at a time. Never handle post-call pricing alone.',
  booking:
    'Combine affirmation + link + email ask in a single message. Gate 1 (location + motivation) MUST be met first.',
  email:
    'Pair every email ask with a clear value exchange. Confirm receipt explicitly.',
  followup: 'Warm, curious, not pushy. One touch only, then rest.',
  escalation:
    'Stay warm. Never become defensive. Flag the real concern and pass the best contact method.',
  summary:
    'Always call generate_summary at conversation end. Extra summaries are fine; missing summaries are failures.',
}

const personaExamplesCache = new Map<string, ExamplePair[]>()

function getPersonaExamples(brand: string): ExamplePair[] {
  if (!personaExamplesCache.has(brand)) {
    personaExamplesCache.set(brand, extractExamples(buildPersona(brand)))
  }
  return personaExamplesCache.get(brand)!
}

const derivedBlockCache = new Map<string, DerivedBlock>()

export function deriveBlock(
  brand: string,
  type: BlockType,
  opts: { bookingUrl?: string } = {}
): DerivedBlock {
  const { bookingUrl } = opts
  const cacheKey = `${brand}:${type}:${bookingUrl ?? ''}`
  const cached = derivedBlockCache.get(cacheKey)
  if (cached) return cached

  const bank = sections(brand, bookingUrl)
  const primaryIds = BLOCK_PRIMARY_SECTIONS[type]
  const rationale = primaryIds
    .map((id) => bank[id]!.rationale?.insights ?? [])
    .flat()
  const statId = primaryIds.find((id) => bank[id]!.rationale?.stat)
  const stat = statId ? bank[statId]!.rationale!.stat : undefined

  const examplePairs = getPersonaExamples(brand)
  const examples = examplePairs
    .map((p) => p.good)
    .filter((s): s is string => Boolean(s))

  const blockConfig = deriveBlockConfig(brand, type, bank)
  const guardrails = derivePerBlockGuardrails(type, bank)

  const derived: DerivedBlock = {
    goal: BLOCK_GOALS[type],
    guidance: BLOCK_GUIDANCE[type],
    examples,
    examplePairs,
    captures: BLOCK_CAPTURES[type],
    branches: BLOCK_BRANCHES[type],
    rationale,
    ...(stat ? { stat } : {}),
    guardrails,
    blockConfig,
    primarySectionIds: primaryIds,
    globalSectionIds: GLOBAL_IDS,
  }
  derivedBlockCache.set(cacheKey, derived)
  return derived
}

function derivePerBlockGuardrails(
  type: BlockType,
  bank: Record<string, PromptSection>
): Guardrail[] {
  const out: Guardrail[] = []
  const primaryIds = BLOCK_PRIMARY_SECTIONS[type]
  for (const id of primaryIds) {
    const section = bank[id]!
    out.push(
      ...extractGuardrails(
        section.text,
        section.source,
        `Block-specific rule from ${section.title}.`
      )
    )
  }
  return out
}

function deriveBlockConfig(
  brand: string,
  type: BlockType,
  bank: Record<string, PromptSection>
): BlockConfig {
  switch (type) {
    case 'opening': {
      const qualifiers = parseQualifiers(bank.qualification!.text)
      const first =
        qualifiers[0]?.ask ?? 'Whereabouts are you thinking of getting started?'
      const gate = bank['location-gate']!.text
      return {
        kind: 'opening',
        firstQuestion: first,
        supportedMarkets: ['United States', 'Canada'],
        outOfAreaScript: parseOutOfAreaScript(gate),
      }
    }
    case 'qualifier': {
      const qualText = bank.qualification!.text
      return {
        kind: 'qualifier',
        minToBook: 2,
        qualifiers: parseQualifiers(qualText),
        thresholds: parseQualifierThresholds(qualText),
      }
    }
    case 'objection':
      return {
        kind: 'objection',
        structure: ['acknowledge', 'probe', 'respond'] as const,
        handlers: parseObjectionHandlers(bank.objections!.text),
      }
    case 'booking': {
      const booking = parseBookingConfig(bank['decision-routing']!.text)
      return {
        kind: 'booking',
        ...booking,
        reengagementAfterHours: 24,
        maxLinkSends: 2,
      }
    }
    case 'email': {
      const text = bank['email-capture']!.text
      return {
        kind: 'email',
        triggers: parseEmailTriggers(text),
        confirmationScript: parseConfirmationScript(text),
        hesitationScript: parseHesitationScript(text),
      }
    }
    case 'followup': {
      const routing = bank['decision-routing']!.text
      return {
        kind: 'followup',
        delayHours: 48,
        script: parseFollowupScript(routing),
        outcomes: [
          'Positive → close / next step with the team',
          'Price objection → acknowledge and escalate',
          'Silence → one more touch, then let it rest',
        ],
      }
    }
    case 'escalation': {
      const routing = bank['decision-routing']!.text
      return {
        kind: 'escalation',
        triggers: parseEscalationTriggers(routing),
        handoffScript: parseEscalationHandoff(routing),
        captureMethod: 'contact.preferred_contact',
      }
    }
    case 'summary': {
      const text = bank['summary-generation']!.text
      const { required, optional } = parseSummaryFields(text)
      const mirrorMatch = text.match(/"So you're in \[location\][^"]*"/)
      return {
        kind: 'summary',
        triggerWords: parseTriggerWords(text),
        requiredFields: required,
        optionalFields: optional,
        mirrorTemplate: mirrorMatch ? mirrorMatch[0].slice(1, -1) : '',
      }
    }
  }
}
