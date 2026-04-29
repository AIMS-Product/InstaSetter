import { isGlobalGuardrailSource } from './directions/b-stage/block-sections'
import {
  DEFAULT_POST_EMAIL_BEHAVIOR,
  PostEmailBehaviorSchema,
} from '@/lib/prompts/post-email-behavior'
import type { AmbientTrigger, Flow, FlowNode, Variable } from './types'

export interface BotSettings {
  name: string
  persona: string
  messageConstraints: string
  forbiddenPhrases: string[]
}

export interface VersionSnapshot {
  flow: Flow
  triggers: AmbientTrigger[]
  bot: BotSettings
  variables: Variable[]
}

export interface VersionEntry {
  v: number
  at: string
  note?: string
  status: 'draft' | 'live' | 'archived'
  snapshot: VersionSnapshot
}

export interface PersistedFlowDraft {
  flow: Flow
  triggers: AmbientTrigger[]
  bot: BotSettings
  variables: Variable[]
  versions: VersionEntry[]
  publishedVersion: number
  draftVersion: number
  dirtySincePublish: boolean
}

export const FLOW_DRAFT_SCHEMA = 4

export function extractPersistedFlowDraft(
  source: PersistedFlowDraft
): PersistedFlowDraft {
  return {
    flow: source.flow,
    triggers: source.triggers,
    bot: source.bot,
    variables: source.variables,
    versions: source.versions,
    publishedVersion: source.publishedVersion,
    draftVersion: source.draftVersion,
    dirtySincePublish: source.dirtySincePublish,
  }
}

function stripBotLevelGuardrails(flow: Flow): Flow {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      if (!node.guardrails) return node

      const guardrails = node.guardrails.filter(
        (guardrail) => !isGlobalGuardrailSource(guardrail.source)
      )

      return guardrails.length === node.guardrails.length
        ? node
        : { ...node, guardrails }
    }),
  }
}

function normalizeEmailPostBehavior(node: FlowNode): FlowNode {
  if (node.blockConfig?.kind !== 'email') return node

  const parsed = PostEmailBehaviorSchema.safeParse(
    node.blockConfig.postEmailBehavior
  )

  if (parsed.success) {
    return node.blockConfig.postEmailBehavior === parsed.data
      ? node
      : {
          ...node,
          blockConfig: {
            ...node.blockConfig,
            postEmailBehavior: parsed.data,
          },
        }
  }

  return {
    ...node,
    blockConfig: {
      ...node.blockConfig,
      postEmailBehavior: DEFAULT_POST_EMAIL_BEHAVIOR,
    },
  }
}

function normalizeFlowDraft(flow: Flow): Flow {
  const withoutBotGuardrails = stripBotLevelGuardrails(flow)
  const nodes = withoutBotGuardrails.nodes.map(normalizeEmailPostBehavior)

  return nodes.every(
    (node, index) => node === withoutBotGuardrails.nodes[index]
  )
    ? withoutBotGuardrails
    : { ...withoutBotGuardrails, nodes }
}

export function normalizePersistedFlowDraft(
  state: Partial<PersistedFlowDraft>
): Partial<PersistedFlowDraft> {
  const next: Partial<PersistedFlowDraft> = { ...state }

  if (state.flow) {
    next.flow = normalizeFlowDraft(state.flow)
  }

  if (state.versions) {
    next.versions = state.versions.map((version) => ({
      ...version,
      snapshot: {
        ...version.snapshot,
        flow: normalizeFlowDraft(version.snapshot.flow),
      },
    }))
  }

  return next
}

export function isSuspectFlowDraft(
  state: Partial<PersistedFlowDraft>,
  { brand }: { brand: string }
): boolean {
  if (state.bot?.name === 'Mike') return true

  if (Array.isArray(state.variables)) {
    const suspiciousVariable = state.variables.some(
      (variable) =>
        (variable.scope === 'contact' && variable.value === 'Dallas') ||
        (variable.scope === 'contact' && variable.value === 7000)
    )

    if (suspiciousVariable) return true
  }

  if (state.flow?.brand && state.flow.brand !== brand) return true

  if (state.flow?.nodes?.some((node) => node.guidance?.includes('Dallas'))) {
    return true
  }

  return false
}
