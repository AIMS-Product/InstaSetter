import type {
  AmbientTrigger,
  Branch,
  BrandGuardrail,
  Capture,
  FlowNode,
} from '../../types'
import { deriveBlock } from './block-sections'
import { DEFAULT_POST_EMAIL_BEHAVIOR } from '@/lib/prompts/post-email-behavior'
import type {
  BlockOverrides,
  BranchOverride,
  CaptureOverride,
  TriggerOverride,
} from '@/lib/prompts/compile-block/schemas'

interface FlowCompileEnv {
  NEXT_PUBLIC_FLOW_COMPILE?: string
  NODE_ENV?: string
}

interface BuildSimulatorOverridesInput {
  selectedBlock: FlowNode | null
  brand: string
  bookingUrl?: string
  triggers: AmbientTrigger[]
  /**
   * Operator-curated brand guardrails (P1.04). Threaded into the simulator
   * compile-block path so previews honour the same forbidden-phrase rules the
   * live prompt would.
   */
  brandGuardrails?: BrandGuardrail[]
}

export function isFlowCompileEnabled(
  env: FlowCompileEnv = process.env
): boolean {
  if (env.NEXT_PUBLIC_FLOW_COMPILE === 'true') return true
  if (env.NEXT_PUBLIC_FLOW_COMPILE === 'false') return false
  return env.NODE_ENV === 'development'
}

export function buildSimulatorOverrides({
  selectedBlock,
  brand,
  bookingUrl,
  triggers,
  brandGuardrails,
}: BuildSimulatorOverridesInput): BlockOverrides | null {
  if (!selectedBlock) return null

  const baseline = deriveBlock(brand, selectedBlock.type, { bookingUrl })
  const overrides: BlockOverrides = {
    activeBlockType: selectedBlock.type,
  }

  const goal = selectedBlock.goal.trim()
  if (goal && goal !== baseline.goal.trim()) {
    overrides.goal = selectedBlock.goal
  }

  const guidance = selectedBlock.guidance.trim()
  if (guidance && guidance !== baseline.guidance.trim()) {
    overrides.guidance = selectedBlock.guidance
  }

  const captures = toCaptureOverrides(selectedBlock.captures)
  if (
    !areListsEqual(captures, toCaptureOverrides(baseline.captures), isCapture)
  ) {
    overrides.captures = captures
  }

  const branches = toBranchOverrides(selectedBlock.branches)
  if (
    !areListsEqual(branches, toBranchOverrides(baseline.branches), isBranch)
  ) {
    overrides.branches = branches
  }

  const blockTriggers = toTriggerOverrides(
    triggers.filter((trigger) => trigger.whenBlock === selectedBlock.id)
  )
  if (blockTriggers.length > 0) {
    overrides.triggers = blockTriggers
  }

  if (
    selectedBlock.blockConfig?.kind === 'email' &&
    !isPostEmailBehaviorEqual(
      selectedBlock.blockConfig.postEmailBehavior,
      DEFAULT_POST_EMAIL_BEHAVIOR
    )
  ) {
    overrides.postEmailBehavior = selectedBlock.blockConfig.postEmailBehavior
  }

  // Brand guardrails are bot-scoped (not block-scoped), so include them
  // whenever the operator has any configured. An empty list is the default —
  // omit it so compileBlock's empty-list path kicks in.
  if (brandGuardrails && brandGuardrails.length > 0) {
    overrides.brandGuardrails = brandGuardrails
  }

  return overrides
}

function toCaptureOverrides(captures: Capture[]): CaptureOverride[] {
  return captures.map(({ label, variable }) => ({ label, variable }))
}

function toBranchOverrides(branches: Branch[]): BranchOverride[] {
  return branches.map(({ label, when, target }) => ({
    label,
    when,
    target,
  }))
}

function toTriggerOverrides(triggers: AmbientTrigger[]): TriggerOverride[] {
  return triggers.map(
    ({ name, afterMinutes, cancelOnReply, mode, target }) => ({
      name,
      afterMinutes,
      cancelOnReply,
      mode,
      target,
    })
  )
}

function areListsEqual<T>(
  left: T[],
  right: T[],
  compare: (a: T, b: T) => boolean
): boolean {
  return (
    left.length === right.length &&
    left.every((item, index) => compare(item, right[index]!))
  )
}

function isCapture(left: CaptureOverride, right: CaptureOverride): boolean {
  return left.label === right.label && left.variable === right.variable
}

function isBranch(left: BranchOverride, right: BranchOverride): boolean {
  return (
    left.label === right.label &&
    left.when === right.when &&
    left.target === right.target
  )
}

function isPostEmailBehaviorEqual(
  left: NonNullable<BlockOverrides['postEmailBehavior']>,
  right: NonNullable<BlockOverrides['postEmailBehavior']>
): boolean {
  return (
    left.confirmationMessage === right.confirmationMessage &&
    left.deliveryMode === right.deliveryMode &&
    left.resourceLabel === right.resourceLabel &&
    left.nextStep === right.nextStep &&
    left.emailTemplate.subject === right.emailTemplate.subject &&
    left.emailTemplate.body === right.emailTemplate.body &&
    isEmailAttachmentEqual(
      left.emailTemplate.attachment,
      right.emailTemplate.attachment
    )
  )
}

function isEmailAttachmentEqual(
  left: NonNullable<
    BlockOverrides['postEmailBehavior']
  >['emailTemplate']['attachment'],
  right: NonNullable<
    BlockOverrides['postEmailBehavior']
  >['emailTemplate']['attachment']
): boolean {
  if (!left || !right) return left === right
  if (left.kind !== right.kind) return false
  if (left.fileName !== right.fileName) return false
  if (left.description !== right.description) return false
  if (left.kind === 'asset' && right.kind === 'asset') {
    return left.assetId === right.assetId
  }
  if (left.kind === 'url' && right.kind === 'url') {
    return left.url === right.url
  }
  return false
}

export function describeTriggerMode(mode: TriggerOverride['mode']): string {
  switch (mode) {
    case 'in_window_only':
      return 'only within the 24h window'
    case 'human_agent_tag':
      return 'with the HUMAN_AGENT tag'
    case 'wait_for_next_window':
      return 'when the next window opens'
  }
}
