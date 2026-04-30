import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import type { BlockCatalogEntry, BlockType } from './types'

// Two label vocabularies coexist in this catalog because they serve two
// different consumers:
//
// - `label` feeds the compiled prompt directive (`compile-block.ts`) and is
//   asserted byte-for-byte by `compile-block.contract.test.ts`. NEVER swap
//   these for the operator-facing display catalog without coordinating with
//   the prompt-side test owners — divergence is a P0 regression.
// - `blurb` is shown in the palette drawer and other UI surfaces. It reads
//   from the operator-facing flow-builder-labels catalog so marketers see
//   plain-English descriptions.
export const BLOCK_CATALOG: BlockCatalogEntry[] = [
  {
    type: 'opening',
    label: 'Opening',
    blurb: FLOW_BUILDER_LABELS.blocks.opening.blurb,
    hue: 18,
  },
  {
    type: 'qualifier',
    label: 'Questions',
    blurb: FLOW_BUILDER_LABELS.blocks.qualifier.blurb,
    hue: 42,
  },
  {
    type: 'objection',
    label: 'Concerns',
    blurb: FLOW_BUILDER_LABELS.blocks.objection.blurb,
    hue: 354,
  },
  {
    type: 'booking',
    label: 'Booking',
    blurb: FLOW_BUILDER_LABELS.blocks.booking.blurb,
    hue: 152,
  },
  {
    type: 'email',
    label: 'Email Capture',
    blurb: FLOW_BUILDER_LABELS.blocks.email.blurb,
    hue: 198,
  },
  {
    type: 'followup',
    label: 'Follow-up',
    blurb: FLOW_BUILDER_LABELS.blocks.followup.blurb,
    hue: 220,
  },
  {
    type: 'escalation',
    label: 'Human Help',
    blurb: FLOW_BUILDER_LABELS.blocks.escalation.blurb,
    hue: 12,
  },
  {
    type: 'summary',
    label: 'Summary',
    blurb: FLOW_BUILDER_LABELS.blocks.summary.blurb,
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
