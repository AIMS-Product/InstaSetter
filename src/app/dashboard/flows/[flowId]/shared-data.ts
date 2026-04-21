import type { BlockCatalogEntry, BlockType } from './types'

export const BLOCK_CATALOG: BlockCatalogEntry[] = [
  {
    type: 'opening',
    label: 'Opening',
    blurb: 'First-touch hook, location gate',
    hue: 18,
  },
  {
    type: 'qualifier',
    label: 'Qualifier',
    blurb: 'Collect 2 of 5 before booking',
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
    blurb: 'Mirror, send link, ask email',
    hue: 152,
  },
  {
    type: 'email',
    label: 'Email Capture',
    blurb: 'Mandatory at booking confirmation',
    hue: 198,
  },
  {
    type: 'followup',
    label: 'Follow-up',
    blurb: '48h post-call re-engage',
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
    blurb: 'generate_summary at end',
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

export const SERIF_FAMILY =
  "var(--font-instrument-serif, 'Instrument Serif'), Georgia, serif"
export const SANS_FAMILY =
  "var(--font-inter, 'Inter'), system-ui, -apple-system, sans-serif"
export const MONO_FAMILY =
  "var(--font-jetbrains-mono, 'JetBrains Mono'), ui-monospace, monospace"
