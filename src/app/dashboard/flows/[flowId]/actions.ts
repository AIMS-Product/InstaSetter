'use server'

import { z } from 'zod'
import {
  countConversationsStartedSince,
  getConversation,
  listConversations,
  type ConversationDetail,
  type ConversationListItem,
  type ListConversationsOptions,
} from '@/lib/services/conversation-viewer'
import {
  loadFlowDraft,
  saveFlowDraft,
  type FlowDraftKey,
  type SaveFlowDraftArgs,
} from '@/lib/services/flow-drafts'
import {
  getFlowRuntimeControl,
  setFlowRuntimePause,
  type FlowRuntimeControl,
} from '@/lib/services/flow-runtime'
import {
  listFlowVersions,
  publishFlow,
  rollbackPublishedFlow,
  DEFAULT_FLOW_CHANNEL,
  type FlowVersionListItem,
  type PublishFlowResult,
} from '@/lib/services/published-flows'
import type { PersistedFlowDraft } from './draft-persistence'

const nonEmptyString = z.string().trim().min(1).max(200)
const looseObject = z.record(z.string(), z.unknown())

const flowDraftKeySchema = z
  .object({
    brand: nonEmptyString,
    flowId: nonEmptyString,
    bookingUrl: z.string().url().optional(),
  })
  .strict()

const persistedFlowDraftSchema = z
  .object({
    flow: z
      .object({
        id: nonEmptyString,
        brand: nonEmptyString,
        name: z.string(),
        channel: z.string(),
        draft: z.number(),
        published: z.number(),
        nodes: z.array(looseObject),
      })
      .passthrough(),
    triggers: z.array(looseObject),
    bot: z
      .object({
        name: z.string(),
        persona: z.string(),
        messageConstraints: z.string(),
        forbiddenPhrases: z.array(z.string()),
      })
      .passthrough(),
    variables: z.array(looseObject),
    versions: z.array(looseObject),
    publishedVersion: z.number().int().nonnegative(),
    draftVersion: z.number().int().nonnegative(),
    dirtySincePublish: z.boolean(),
  })
  .strict()

const saveFlowDraftArgsSchema = flowDraftKeySchema.extend({
  state: persistedFlowDraftSchema,
})

const flowRunsFilterSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
    flowId: z.string().trim().min(1).max(200).optional(),
    search: z.string().trim().max(80).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    status: z.enum(['all', 'active', 'stalled', 'completed']).optional(),
  })
  .strict()

export async function fetchFlowRunsAction(
  args: number | ListConversationsOptions = 50
): Promise<ConversationListItem[]> {
  if (typeof args === 'number') return listConversations(args)
  const parsed = flowRunsFilterSchema.safeParse(args)
  if (!parsed.success) return []
  return listConversations(parsed.data)
}

export async function fetchConversationAction(
  id: string
): Promise<ConversationDetail | null> {
  return getConversation(id)
}

export async function fetchTodayConversationCountAction(): Promise<number> {
  // Use the user's local midnight so the badge matches what "today" means
  // to the operator looking at the dashboard.
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  return countConversationsStartedSince(startOfDay.toISOString())
}

const flowRuntimeSchema = z
  .object({
    flowId: nonEmptyString,
  })
  .strict()

const setFlowRuntimeSchema = flowRuntimeSchema.extend({
  paused: z.boolean(),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 7)
    .optional(),
})

export async function fetchFlowRuntimeAction(args: {
  flowId: string
}): Promise<FlowRuntimeControl | null> {
  const parsed = flowRuntimeSchema.safeParse(args)
  if (!parsed.success) return null
  return getFlowRuntimeControl(parsed.data.flowId)
}

export async function setFlowRuntimeAction(args: {
  flowId: string
  paused: boolean
  durationMinutes?: number
}): Promise<FlowRuntimeControl | null> {
  const parsed = setFlowRuntimeSchema.safeParse(args)
  if (!parsed.success) return null
  return setFlowRuntimePause(parsed.data)
}

export async function loadFlowDraftAction(
  key: FlowDraftKey
): Promise<PersistedFlowDraft | null> {
  const parsed = flowDraftKeySchema.safeParse(key)
  if (!parsed.success) return null
  return loadFlowDraft(parsed.data)
}

export async function saveFlowDraftAction(
  args: SaveFlowDraftArgs
): Promise<boolean> {
  const parsed = saveFlowDraftArgsSchema.safeParse(args)
  if (!parsed.success) return false
  return saveFlowDraft(parsed.data as unknown as SaveFlowDraftArgs)
}

const publishFlowArgsSchema = z
  .object({
    brand: nonEmptyString,
    flowId: nonEmptyString,
    note: z.string().trim().max(500).optional(),
    actor: nonEmptyString.optional(),
  })
  .strict()

const rollbackFlowArgsSchema = z
  .object({
    brand: nonEmptyString,
    flowId: nonEmptyString,
    versionId: nonEmptyString,
    note: z.string().trim().max(500).optional(),
    actor: nonEmptyString.optional(),
  })
  .strict()

const listFlowVersionsArgsSchema = z
  .object({
    brand: nonEmptyString,
    flowId: nonEmptyString,
  })
  .strict()

/**
 * Resolve the publishing actor. Today the dashboard is gated by Vercel basic
 * auth + IP allowlist (see `feat(proxy): remove dashboard basic auth gate`),
 * so the operator email is not yet wired through the session. The action
 * accepts an explicit `actor` override and falls back to a deterministic
 * label so the audit log is never empty. Once Supabase Auth lands for the
 * dashboard, replace this with `supabase.auth.getUser()`.
 */
function resolvePublishActor(actor: string | undefined): string {
  return actor?.trim() || 'system:dashboard'
}

export async function publishFlowAction(args: {
  brand: string
  flowId: string
  note?: string
  actor?: string
}): Promise<PublishFlowResult> {
  const parsed = publishFlowArgsSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const draft = await loadFlowDraft({
    brand: parsed.data.brand,
    flowId: parsed.data.flowId,
  })
  if (!draft) {
    return { success: false, error: 'No draft to publish' }
  }

  return publishFlow({
    brand: parsed.data.brand,
    flowId: parsed.data.flowId,
    channel: DEFAULT_FLOW_CHANNEL,
    draft,
    publishedBy: resolvePublishActor(parsed.data.actor),
    note: parsed.data.note,
  })
}

export async function rollbackFlowAction(args: {
  brand: string
  flowId: string
  versionId: string
  note?: string
  actor?: string
}): Promise<PublishFlowResult> {
  const parsed = rollbackFlowArgsSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  return rollbackPublishedFlow({
    brand: parsed.data.brand,
    flowId: parsed.data.flowId,
    channel: DEFAULT_FLOW_CHANNEL,
    versionId: parsed.data.versionId,
    publishedBy: resolvePublishActor(parsed.data.actor),
    note: parsed.data.note,
  })
}

export async function listFlowVersionsAction(args: {
  brand: string
  flowId: string
}): Promise<{ versions: FlowVersionListItem[] }> {
  const parsed = listFlowVersionsArgsSchema.safeParse(args)
  if (!parsed.success) {
    return { versions: [] }
  }

  return listFlowVersions({
    brand: parsed.data.brand,
    flowId: parsed.data.flowId,
    channel: DEFAULT_FLOW_CHANNEL,
  })
}
