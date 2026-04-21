import { z } from 'zod'
import type { BlockType } from '@/app/dashboard/flows/[flowId]/types'

const BLOCK_TYPES: readonly [BlockType, ...BlockType[]] = [
  'opening',
  'qualifier',
  'objection',
  'booking',
  'email',
  'followup',
  'escalation',
  'summary',
]

export const BlockOverridesSchema = z
  .object({
    activeBlockType: z.enum(BLOCK_TYPES),
    // .trim() normalises whitespace-only input to '' so compile-block.ts's
    // empty-string fallback applies consistently regardless of client padding.
    goal: z.string().trim().optional(),
    guidance: z.string().trim().optional(),
  })
  .strict()

export type BlockOverrides = z.infer<typeof BlockOverridesSchema>
