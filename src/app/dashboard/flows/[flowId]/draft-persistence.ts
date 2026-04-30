import { isGlobalGuardrailSource } from './directions/b-stage/block-sections'
import {
  DEFAULT_POST_EMAIL_BEHAVIOR,
  PostEmailBehaviorSchema,
} from '@/lib/prompts/post-email-behavior'
import {
  BrandGuardrailSchema,
  DEFAULT_BRAND_GUARDRAILS,
  type BrandGuardrail,
} from '@/lib/prompts/brand-guardrails'
import type { AmbientTrigger, Flow, FlowNode, Variable } from './types'

export interface BotSettings {
  name: string
  persona: string
  messageConstraints: string
  forbiddenPhrases: string[]
  /**
   * Operator-curated forbidden phrases (P1.04). Stack on top of the
   * data-locked persona-level Forbidden Phrases section. Default `[]`.
   */
  brandGuardrails: BrandGuardrail[]
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

// Bumping this would discard every existing operator draft. The brandGuardrails
// addition is a purely additive shape change — the normalizer backfills `[]`
// for older drafts — so the schema version stays at 4.
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

function normalizeBotBrandGuardrails(bot: BotSettings): BotSettings {
  const raw = (bot.brandGuardrails ?? DEFAULT_BRAND_GUARDRAILS) as unknown
  const list = Array.isArray(raw) ? raw : DEFAULT_BRAND_GUARDRAILS
  // Validate each entry individually — drop invalid rows so a single corrupt
  // guardrail doesn't tank the whole panel. Cap defensively at 50 (schema
  // upper bound).
  const valid: BrandGuardrail[] = []
  for (const entry of list) {
    const parsed = BrandGuardrailSchema.safeParse(entry)
    if (parsed.success) valid.push(parsed.data)
    if (valid.length >= 50) break
  }

  if (valid === bot.brandGuardrails) return bot
  return { ...bot, brandGuardrails: valid }
}

export function normalizePersistedFlowDraft(
  state: Partial<PersistedFlowDraft>
): Partial<PersistedFlowDraft> {
  const next: Partial<PersistedFlowDraft> = { ...state }

  if (state.flow) {
    next.flow = normalizeFlowDraft(state.flow)
  }

  if (state.bot) {
    next.bot = normalizeBotBrandGuardrails(state.bot)
  }

  if (state.versions) {
    next.versions = state.versions.map((version) => ({
      ...version,
      snapshot: {
        ...version.snapshot,
        flow: normalizeFlowDraft(version.snapshot.flow),
        bot: normalizeBotBrandGuardrails(version.snapshot.bot),
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
