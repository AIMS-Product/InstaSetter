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

/**
 * Returns the list of changed field paths between two persisted drafts in
 * dot-notation. Each path is a leaf path; container differences are not
 * reported when their children are stable. Used by the P4.04 warning
 * system to drive the high-impact gate via
 * `resolveLockIdForFieldPath` on each path.
 *
 * Special handling for `flow.nodes`: the function indexes nodes by their
 * `id` rather than array position so reordering doesn't show every node as
 * dirty. Likewise for `triggers` (by `id`) and `variables`
 * (by `${scope}.${key}`).
 *
 * Bag-only fields (`versions`, internal counters, status booleans) are
 * intentionally excluded — they're persistence bookkeeping, not user
 * intent.
 */
export function diffFlowDraft(
  prev: PersistedFlowDraft,
  next: PersistedFlowDraft
): string[] {
  const changes: string[] = []
  if (prev === next) return changes

  // Flow + nodes — node id keyed.
  if (prev.flow !== next.flow) {
    if (prev.flow.id !== next.flow.id) changes.push('flow.id')
    if (prev.flow.brand !== next.flow.brand) changes.push('flow.brand')
    if (prev.flow.name !== next.flow.name) changes.push('flow.name')
    if (prev.flow.channel !== next.flow.channel) changes.push('flow.channel')

    const prevNodes = new Map(prev.flow.nodes.map((node) => [node.id, node]))
    const nextNodes = new Map(next.flow.nodes.map((node) => [node.id, node]))
    const allIds = new Set([...prevNodes.keys(), ...nextNodes.keys()])
    for (const id of allIds) {
      const prevNode = prevNodes.get(id)
      const nextNode = nextNodes.get(id)
      const path = `flow.nodes.${id}`
      if (!prevNode) {
        changes.push(`${path}.__added__`)
        continue
      }
      if (!nextNode) {
        changes.push(`${path}.__removed__`)
        continue
      }
      if (prevNode === nextNode) continue
      diffObjectInto(prevNode, nextNode, path, changes)
    }
  }

  // Triggers — id keyed.
  if (prev.triggers !== next.triggers) {
    const prevById = new Map(prev.triggers.map((t) => [t.id, t]))
    const nextById = new Map(next.triggers.map((t) => [t.id, t]))
    const allIds = new Set([...prevById.keys(), ...nextById.keys()])
    for (const id of allIds) {
      const a = prevById.get(id)
      const b = nextById.get(id)
      const path = `triggers.${id}`
      if (!a) {
        changes.push(`${path}.__added__`)
        continue
      }
      if (!b) {
        changes.push(`${path}.__removed__`)
        continue
      }
      diffObjectInto(a, b, path, changes)
    }
  }

  // Bot — top-level fields, plus forbidden phrases as a list.
  if (prev.bot !== next.bot) {
    diffObjectInto(prev.bot, next.bot, 'bot', changes)
  }

  // Variables — keyed by scope.key.
  if (prev.variables !== next.variables) {
    const prevByKey = new Map(
      prev.variables.map((v) => [`${v.scope}.${v.key}`, v])
    )
    const nextByKey = new Map(
      next.variables.map((v) => [`${v.scope}.${v.key}`, v])
    )
    const allKeys = new Set([...prevByKey.keys(), ...nextByKey.keys()])
    for (const key of allKeys) {
      const a = prevByKey.get(key)
      const b = nextByKey.get(key)
      const path = `variables.${key}`
      if (!a) {
        changes.push(`${path}.__added__`)
        continue
      }
      if (!b) {
        changes.push(`${path}.__removed__`)
        continue
      }
      diffObjectInto(a, b, path, changes)
    }
  }

  return changes
}

function diffObjectInto(
  a: unknown,
  b: unknown,
  prefix: string,
  changes: string[]
): void {
  if (a === b) return
  if (a === null || b === null) {
    changes.push(prefix)
    return
  }
  if (typeof a !== typeof b) {
    changes.push(prefix)
    return
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    changes.push(prefix)
    return
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!arraysEqual(a, b)) changes.push(prefix)
    return
  }

  const keys = new Set([
    ...Object.keys(a as Record<string, unknown>),
    ...Object.keys(b as Record<string, unknown>),
  ])
  for (const key of keys) {
    const av = (a as Record<string, unknown>)[key]
    const bv = (b as Record<string, unknown>)[key]
    diffObjectInto(av, bv, `${prefix}.${key}`, changes)
  }
}

function arraysEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (!deepEqual(a[i], b[i])) return false
  }
  return true
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    return arraysEqual(a, b)
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)])
  for (const key of keys) {
    if (!deepEqual(ao[key], bo[key])) return false
  }
  return true
}
