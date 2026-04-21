import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import type { BlockOverrides } from '@/lib/prompts/compile-block/schemas'
import {
  BLOCK_GOALS,
  BLOCK_GUIDANCE,
} from '@/app/dashboard/flows/[flowId]/directions/b-stage/block-sections'
import { BLOCK_BY_TYPE } from '@/app/dashboard/flows/[flowId]/shared-data'

export interface CompileBlockInput {
  brand: string
  bookingUrl?: string
  overrides?: BlockOverrides | undefined
}

export function compileBlock(input: CompileBlockInput): string {
  const baseline = buildSystemPrompt({
    brandName: input.brand,
    bookingUrl: input.bookingUrl,
  })

  if (!input.overrides) return baseline

  const { activeBlockType } = input.overrides
  const label = BLOCK_BY_TYPE[activeBlockType].label
  const goal = input.overrides.goal?.trim()
    ? input.overrides.goal
    : BLOCK_GOALS[activeBlockType]
  const guidance = input.overrides.guidance?.trim()
    ? input.overrides.guidance
    : BLOCK_GUIDANCE[activeBlockType]

  // Directive is appended as a suffix. Effective for blocks whose source
  // sections are thin or conditional (Opening, Booking, Email, Follow-up,
  // Escalation). Less effective for blocks with dense prescriptive content
  // (Qualifier, Objection, Summary) because the earlier section instructions
  // outweigh an end-of-prompt directive. The v2 plan is section replacement —
  // see docs/flow-builder/FUTURE.md.
  return `${baseline}\n\n## Active Block Directive\n\nBlock: ${label}\nGoal: ${goal}\nGuidance: ${guidance}\n`
}
