import type { BlockCatalogEntry, BlockType } from './types'

export const BLOCK_CATALOG: BlockCatalogEntry[] = [
  {
    type: 'opening',
    label: 'Opening',
    blurb: 'Start the chat and confirm location',
    hue: 18,
  },
  {
    type: 'qualifier',
    label: 'Questions',
    blurb: 'Collect enough details before booking',
    hue: 42,
  },
  {
    type: 'objection',
    label: 'Concerns',
    blurb: 'Answer common hesitations',
    hue: 354,
  },
  {
    type: 'booking',
    label: 'Booking',
    blurb: 'Summarize, send link, ask email',
    hue: 152,
  },
  {
    type: 'email',
    label: 'Email Capture',
    blurb: 'Ask for email after booking',
    hue: 198,
  },
  {
    type: 'followup',
    label: 'Follow-up',
    blurb: 'Check in after the call',
    hue: 220,
  },
  {
    type: 'escalation',
    label: 'Human Help',
    blurb: 'Hand off to a person',
    hue: 12,
  },
  {
    type: 'summary',
    label: 'Summary',
    blurb: 'Create the handoff notes',
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
