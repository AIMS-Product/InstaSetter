import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import type {
  BlockOverrides,
  BranchOverride,
  CaptureOverride,
  TriggerOverride,
} from '@/lib/prompts/compile-block/schemas'
import type {
  EmailAttachment,
  PostEmailBehavior,
} from '@/lib/prompts/post-email-behavior'
import {
  BLOCK_GOALS,
  BLOCK_GUIDANCE,
} from '@/app/dashboard/flows/[flowId]/directions/b-stage/block-sections'
import { BLOCK_BY_TYPE } from '@/app/dashboard/flows/[flowId]/shared-data'
import { describeTriggerMode } from '@/app/dashboard/flows/[flowId]/directions/b-stage/simulator-overrides'

/**
 * Resolver signature for stored-asset URL lookup. Tests inject a stub;
 * production injects `resolveStoredAssetUrl` from `email-assets.ts`.
 *
 * Throws on resolution failure — the caller is wrapped in the engine's
 * try/catch (ROLLOUT.md invariant #5), so a Storage outage degrades to
 * a logged error, not a prompt-rendering crash that breaks the bot.
 */
export type StoredAssetUrlResolver = (assetId: string) => Promise<string>

export interface CompileBlockInput {
  brand: string
  bookingUrl?: string
  overrides?: BlockOverrides | undefined
  /**
   * Test-only injection point. Defaults to the production resolver.
   */
  resolveStoredAssetUrl?: StoredAssetUrlResolver
}

export async function compileBlock(input: CompileBlockInput): Promise<string> {
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
  await appendPostEmailBehaviorLines(
    lines,
    input.overrides.postEmailBehavior,
    input.resolveStoredAssetUrl ?? loadDefaultResolver
  )

  // Directive is appended as a suffix. Effective for blocks whose source
  // sections are thin or conditional (Opening, Booking, Email, Follow-up,
  // Escalation). Less effective for blocks with dense prescriptive content
  // (Qualifier, Objection, Summary) because the earlier section instructions
  // outweigh an end-of-prompt directive. The v2 plan is section replacement —
  // see docs/flow-builder/FUTURE.md.
  return `${baseline}\n\n${lines.join('\n')}\n`
}

async function appendPostEmailBehaviorLines(
  lines: string[],
  behavior: PostEmailBehavior | undefined,
  resolve: StoredAssetUrlResolver
): Promise<void> {
  if (!behavior) return

  const attachmentLine = await renderAttachmentLine(
    behavior.emailTemplate.attachment,
    resolve
  )

  lines.push(
    '',
    'Post-email behavior:',
    `- Confirmation: ${behavior.confirmationMessage}`,
    `- Delivery mode: ${behavior.deliveryMode}`,
    `- Resource: ${behavior.resourceLabel ?? 'none'}`,
    `- Next step: ${behavior.nextStep}`,
    `- Email subject: ${behavior.emailTemplate.subject}`,
    `- Email body: ${behavior.emailTemplate.body}`,
    attachmentLine
  )
}

async function renderAttachmentLine(
  attachment: EmailAttachment | null,
  resolve: StoredAssetUrlResolver
): Promise<string> {
  if (!attachment) return '- Attachment: none'

  // Discriminated union: `kind` is set to 'url' when absent (default in
  // the legacy schema branch), or 'asset' for the new stored variant.
  if (attachment.kind === 'asset') {
    const url = await resolve(attachment.assetId)
    return `- Attachment: ${attachment.fileName} (${url})`
  }

  return `- Attachment: ${attachment.fileName} (${attachment.url})`
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

/**
 * Lazy import for the production resolver. Importing
 * `@/lib/services/email-assets` at module scope pulls in
 * `service-role.ts` -> `config.ts`, which throws at import time when
 * `NEXT_PUBLIC_SUPABASE_URL` is unset (e.g. unit test environments
 * that never touch a stored attachment). Deferring the import until
 * the resolver is actually invoked keeps the contract test green
 * without a Supabase env in jsdom.
 */
async function loadDefaultResolver(assetId: string): Promise<string> {
  const mod = await import('@/lib/services/email-assets')
  return mod.resolveStoredAssetUrl(assetId)
}
