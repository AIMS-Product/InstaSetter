import { z } from 'zod'
import {
  BLOCK_TYPES,
  TRIGGER_MODES,
} from '@/app/dashboard/flows/[flowId]/types'

export const CaptureOverrideSchema = z
  .object({
    label: z.string().trim(),
    variable: z.string().trim(),
  })
  .strict()

export const BranchOverrideSchema = z
  .object({
    label: z.string().trim(),
    when: z.string().trim(),
    target: z.enum(BLOCK_TYPES),
  })
  .strict()

export const TriggerOverrideSchema = z
  .object({
    name: z.string().trim(),
    afterMinutes: z.number().int().min(1),
    cancelOnReply: z.boolean(),
    mode: z.enum(TRIGGER_MODES),
    target: z.enum(BLOCK_TYPES),
  })
  .strict()

export const BlockOverridesSchema = z
  .object({
    activeBlockType: z.enum(BLOCK_TYPES),
    // .trim() normalises whitespace-only input to '' so compile-block.ts's
    // empty-string fallback applies consistently regardless of client padding.
    goal: z.string().trim().optional(),
    guidance: z.string().trim().optional(),
    captures: z.array(CaptureOverrideSchema).optional(),
    branches: z.array(BranchOverrideSchema).optional(),
    triggers: z.array(TriggerOverrideSchema).optional(),
  })
  .strict()

export type CaptureOverride = z.infer<typeof CaptureOverrideSchema>
export type BranchOverride = z.infer<typeof BranchOverrideSchema>
export type TriggerOverride = z.infer<typeof TriggerOverrideSchema>
export type BlockOverrides = z.infer<typeof BlockOverridesSchema>
