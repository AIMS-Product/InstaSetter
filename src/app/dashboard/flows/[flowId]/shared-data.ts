import type {
  BlockCatalogEntry,
  BlockType,
  Flow,
  Turn,
  Variable,
} from './types'

export const BLOCK_CATALOG: BlockCatalogEntry[] = [
  {
    type: 'opening',
    label: 'Opening',
    blurb: 'First-touch hook, intent detect',
    hue: 18,
  },
  {
    type: 'qualifier',
    label: 'Qualifier',
    blurb: 'Collect location + motivation',
    hue: 42,
  },
  {
    type: 'objection',
    label: 'Objection',
    blurb: 'Acknowledge, probe, respond',
    hue: 354,
  },
  {
    type: 'booking',
    label: 'Booking',
    blurb: 'Send link, confirm booked',
    hue: 152,
  },
  {
    type: 'email',
    label: 'Email Capture',
    blurb: 'Pair email ask with booking link',
    hue: 198,
  },
  {
    type: 'followup',
    label: 'Follow-up',
    blurb: '48h silence check, re-engage',
    hue: 220,
  },
  {
    type: 'escalation',
    label: 'Escalation',
    blurb: 'Hand off to human closer',
    hue: 12,
  },
  {
    type: 'summary',
    label: 'Summary',
    blurb: 'End-of-conversation write to leads',
    hue: 260,
  },
]

export const BLOCK_BY_TYPE: Record<BlockType, BlockCatalogEntry> =
  Object.fromEntries(BLOCK_CATALOG.map((b) => [b.type, b])) as Record<
    BlockType,
    BlockCatalogEntry
  >

export const blockColor = (
  type: BlockType,
  { l = 0.68, c = 0.12 }: { l?: number; c?: number } = {}
): string => {
  const b = BLOCK_BY_TYPE[type]
  if (!b) return `oklch(${l} 0 0)`
  return `oklch(${l} ${c} ${b.hue})`
}

export const blockTint = (type: BlockType): string =>
  `oklch(0.97 0.022 ${BLOCK_BY_TYPE[type]?.hue ?? 40})`

export const blockInk = (type: BlockType): string =>
  `oklch(0.38 0.09 ${BLOCK_BY_TYPE[type]?.hue ?? 40})`

export const FLOW: Flow = {
  id: 'ig-organic-dm',
  brand: 'VendingPreneurs',
  name: 'IG Organic DM',
  channel: 'Instagram — Organic DM',
  draft: 13,
  published: 12,
  nodes: [
    {
      id: 'opening',
      type: 'opening',
      name: 'Opening',
      goal: 'Hook with warmth, detect initial interest and location.',
      guidance:
        "Match the prospect's energy. Don't interrogate. Ask ONE question — start with area.",
      examples: [
        "That's what's up, glad you've been digging into it. What area are you in?",
        'Appreciate you reaching out. Whereabouts are you thinking of getting started?',
      ],
      captures: [
        { label: 'Location from first reply', variable: 'contact.location' },
      ],
      branches: [
        {
          id: 'b1',
          label: 'Has location',
          target: 'qualifier',
          when: 'contact.location is set',
        },
        {
          id: 'b2',
          label: 'Raises objection',
          target: 'objection',
          when: 'last message seems like an objection',
        },
      ],
      pos: { x: 0, y: 0 },
    },
    {
      id: 'qualifier',
      type: 'qualifier',
      name: 'Qualifier',
      goal: 'Collect motivation. Location already known.',
      guidance: 'Weave the question naturally. Never ask budget before value.',
      examples: [
        'Are you thinking side income to start, or going bigger?',
        'What caught your attention about vending — side hustle or full-time move?',
      ],
      captures: [{ label: 'Motivation', variable: 'contact.motivation' }],
      branches: [
        {
          id: 'b3',
          label: 'Qualified',
          target: 'booking',
          when: 'location AND motivation are set',
        },
        {
          id: 'b4',
          label: 'Raises objection',
          target: 'objection',
          when: 'seems like an objection',
        },
      ],
      pos: { x: 0, y: 1 },
    },
    {
      id: 'objection',
      type: 'objection',
      name: 'Objection Handler',
      goal: 'Acknowledge, probe, respond. Never skip to resolution.',
      guidance:
        'Structure every reply as Acknowledge → Probe → Respond. One question at a time.',
      examples: [
        'Totally get it. Is it more that life is slammed, or want to make sure this is the right fit?',
        'Makes sense. Have you got some saved up already, or starting from zero?',
      ],
      captures: [
        { label: 'Objection type', variable: 'conversation.last_objection' },
      ],
      branches: [
        {
          id: 'b5',
          label: 'Handled',
          target: 'qualifier',
          when: 'engagement recovers',
        },
        {
          id: 'b6',
          label: 'Price + post-call',
          target: 'escalation',
          when: 'objection is price AND call occurred',
        },
      ],
      pos: { x: 1, y: 1 },
    },
    {
      id: 'booking',
      type: 'booking',
      name: 'Booking Handoff',
      goal: 'Send booking link + capture email in the same turn.',
      guidance:
        'Mirror what we know, then drop the link. Ask for email in the same message.',
      examples: [
        "You're in {{contact.location}}, looking to {{contact.motivation}}. Here's a time: {{brand.booking_url}}",
      ],
      captures: [{ label: 'Email', variable: 'contact.email' }],
      branches: [
        {
          id: 'b7',
          label: 'Booked',
          target: 'summary',
          when: 'prospect confirms booking',
        },
        {
          id: 'b8',
          label: 'Silent 24h',
          target: 'followup',
          when: 'silent for 24 hours',
        },
      ],
      pos: { x: 0, y: 2 },
    },
    {
      id: 'followup',
      type: 'followup',
      name: 'Post-Call Follow-up',
      goal: '48h post-call silence re-engage.',
      guidance: 'Warm, curious, not pushy. One touch only.',
      examples: [
        'Hey {{contact.name}}, hope the call was helpful — how did it go?',
      ],
      captures: [],
      branches: [
        {
          id: 'b9',
          label: 'Positive',
          target: 'summary',
          when: 'seems positive',
        },
        {
          id: 'b10',
          label: 'Price',
          target: 'escalation',
          when: 'mentions price',
        },
      ],
      pos: { x: 1, y: 2 },
    },
    {
      id: 'escalation',
      type: 'escalation',
      name: 'Escalation',
      goal: 'Hand off to human closer cleanly.',
      guidance:
        'Never handle pricing alone post-call. Flag + pass best contact method.',
      examples: [
        "That's a fair concern. Let me flag this for the team — what's the best way to reach you?",
      ],
      captures: [
        {
          label: 'Preferred contact method',
          variable: 'contact.preferred_contact',
        },
      ],
      branches: [
        {
          id: 'b11',
          label: 'Handed off',
          target: 'summary',
          when: 'human closer assigned',
        },
      ],
      pos: { x: 2, y: 2 },
    },
    {
      id: 'summary',
      type: 'summary',
      name: 'Summary',
      goal: 'End-of-conversation write to leads.',
      guidance: 'Not visible to prospect. Fires generate_summary tool.',
      examples: [],
      captures: [],
      branches: [],
      pos: { x: 0, y: 3 },
    },
  ],
}

export const VARIABLES: Variable[] = [
  { scope: 'brand', key: 'brand_name', value: 'VendingPreneurs', kind: 'text' },
  {
    scope: 'brand',
    key: 'booking_url',
    value: 'book.vendingpreneurs.com/AK-DM',
    kind: 'url',
  },
  { scope: 'brand', key: 'timezone', value: 'America/Chicago', kind: 'text' },
  { scope: 'contact', key: 'name', value: null, kind: 'text' },
  {
    scope: 'contact',
    key: 'location',
    value: 'Dallas',
    capturedBy: 'opening',
    kind: 'text',
  },
  {
    scope: 'contact',
    key: 'motivation',
    value: 'side income',
    capturedBy: 'qualifier',
    kind: 'text',
  },
  { scope: 'contact', key: 'email', value: null, kind: 'email' },
  { scope: 'contact', key: 'budget', value: 7000, kind: 'number' },
  { scope: 'conversation', key: 'last_objection', value: null, kind: 'text' },
  { scope: 'conversation', key: 'message_count', value: 4, kind: 'number' },
]

export const CONVERSATION: Turn[] = [
  {
    role: 'prospect',
    text: "hey I've been watching your stuff about vending for a minute",
    t: '2m',
  },
  {
    role: 'bot',
    block: 'opening',
    text: "That's what's up, glad you've been digging into it. What area are you in?",
    t: '2m',
  },
  {
    role: 'prospect',
    text: 'Dallas, got about 7K saved. ready to get going',
    t: '1m',
  },
  {
    role: 'bot',
    block: 'qualifier',
    text: 'Dallas is a strong market, 7K is a solid start. Side income or going bigger?',
    t: '1m',
  },
  {
    role: 'prospect',
    text: 'side income to start, maybe more if it works',
    t: 'now',
  },
  {
    role: 'bot',
    block: 'booking',
    text: "So you're in Dallas looking to build side income — here's a time: book.vendingpreneurs.com/AK-DM",
    t: 'now',
  },
]

export const SERIF_FAMILY =
  "var(--font-instrument-serif, 'Instrument Serif'), Georgia, serif"
export const SANS_FAMILY =
  "var(--font-inter, 'Inter'), system-ui, -apple-system, sans-serif"
export const MONO_FAMILY =
  "var(--font-jetbrains-mono, 'JetBrains Mono'), ui-monospace, monospace"
