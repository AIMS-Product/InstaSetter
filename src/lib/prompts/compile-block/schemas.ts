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
    goal: z.string().optional(),
    guidance: z.string().optional(),
  })
  .strict()

export type BlockOverrides = z.infer<typeof BlockOverridesSchema>
