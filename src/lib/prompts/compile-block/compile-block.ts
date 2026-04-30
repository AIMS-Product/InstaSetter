import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import type {
  BlockOverrides,
  BranchOverride,
  CaptureOverride,
  TriggerOverride,
} from '@/lib/prompts/compile-block/schemas'
import type { PostEmailBehavior } from '@/lib/prompts/post-email-behavior'
import type { BrandGuardrail } from '@/lib/prompts/brand-guardrails'
import {
  BLOCK_GOALS,
  BLOCK_GUIDANCE,
} from '@/app/dashboard/flows/[flowId]/directions/b-stage/block-sections'
import { BLOCK_BY_TYPE } from '@/app/dashboard/flows/[flowId]/shared-data'
import { describeTriggerMode } from '@/app/dashboard/flows/[flowId]/directions/b-stage/simulator-overrides'

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
  const lines = [
    '## Active Block Directive',
    '',
    `Block: ${label}`,
    `Goal: ${goal}`,
    `Guidance: ${guidance}`,
  ]

  appendCaptureLines(lines, input.overrides.captures)
  appendBranchLines(lines, input.overrides.branches)
  appendTriggerLines(lines, input.overrides.triggers)
  appendPostEmailBehaviorLines(lines, input.overrides.postEmailBehavior)
  appendBrandGuardrailLines(lines, input.overrides.brandGuardrails)

  // Directive is appended as a suffix. Effective for blocks whose source
  // sections are thin or conditional (Opening, Booking, Email, Follow-up,
  // Escalation). Less effective for blocks with dense prescriptive content
  // (Qualifier, Objection, Summary) because the earlier section instructions
  // outweigh an end-of-prompt directive. The v2 plan is section replacement —
  // see docs/flow-builder/FUTURE.md.
  return `${baseline}\n\n${lines.join('\n')}\n`
}

function appendBrandGuardrailLines(
  lines: string[],
  guardrails: BrandGuardrail[] | undefined
): void {
  if (!guardrails || guardrails.length === 0) return
  lines.push('', 'Sandbox-only Brand Guardrails:')
  for (const guardrail of guardrails) {
    const trimmedNote = guardrail.note?.trim()
    const noteSuffix = trimmedNote ? ` — note: ${trimmedNote}` : ''
    lines.push(`- Never say "${guardrail.phrase}"${noteSuffix}`)
  }
}

function appendPostEmailBehaviorLines(
  lines: string[],
  behavior: PostEmailBehavior | undefined
): void {
  if (!behavior) return
  lines.push(
    '',
    'Post-email behavior:',
    `- Confirmation: ${behavior.confirmationMessage}`,
    `- Delivery mode: ${behavior.deliveryMode}`,
    `- Resource: ${behavior.resourceLabel ?? 'none'}`,
    `- Next step: ${behavior.nextStep}`,
    `- Email subject: ${behavior.emailTemplate.subject}`,
    `- Email body: ${behavior.emailTemplate.body}`,
    behavior.emailTemplate.attachment
      ? `- Attachment: ${behavior.emailTemplate.attachment.fileName} (${behavior.emailTemplate.attachment.url})`
      : '- Attachment: none'
  )
}

function appendCaptureLines(
  lines: string[],
  captures: CaptureOverride[] | undefined
): void {
  if (!captures) return
  lines.push('', 'Captures:')
  if (captures.length === 0) {
    lines.push('- none')
    return
  }
  for (const capture of captures) {
    lines.push(
      `- ${capture.label || '(unnamed capture)'} -> ${
        capture.variable || '(missing variable)'
      }`
    )
  }
}

function appendBranchLines(
  lines: string[],
  branches: BranchOverride[] | undefined
): void {
  if (!branches) return
  lines.push('', 'Routes:')
  if (branches.length === 0) {
    lines.push('- none')
    return
  }
  for (const branch of branches) {
    lines.push(
      `- ${branch.label || '(unnamed route)'} -> ${
        BLOCK_BY_TYPE[branch.target].label
      } when ${branch.when || '(no condition provided)'}`
    )
  }
}

function appendTriggerLines(
  lines: string[],
  triggers: TriggerOverride[] | undefined
): void {
  if (!triggers) return
  lines.push('', 'Ambient triggers:')
  if (triggers.length === 0) {
    lines.push('- none')
    return
  }
  for (const trigger of triggers) {
    lines.push(
      `- ${trigger.name || '(unnamed trigger)'}: after ${
        trigger.afterMinutes
      } minutes, ${
        trigger.cancelOnReply ? 'cancel on reply' : 'keep running after reply'
      }, send ${describeTriggerMode(trigger.mode)}, then ${
        BLOCK_BY_TYPE[trigger.target].label
      }`
    )
  }
}
