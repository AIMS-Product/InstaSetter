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
    closeSyncStatus: z
      .enum(['sent', 'failed', 'pending', 'not_synced', 'any'])
      .optional(),
    sourceId: z.string().trim().min(1).max(200).optional(),
    utmSource: z.string().trim().min(1).max(200).optional(),
    utmMedium: z.string().trim().min(1).max(200).optional(),
    utmCampaign: z.string().trim().min(1).max(200).optional(),
    utmContent: z.string().trim().min(1).max(200).optional(),
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
