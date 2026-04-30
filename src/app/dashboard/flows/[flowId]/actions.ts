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
  createVersion,
  listVersions,
  recordAudit,
  restoreVersion,
  type FlowDraftVersionRow,
} from '@/lib/services/flow-draft-versions'
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

const flowVersionsKeySchema = z
  .object({
    brand: nonEmptyString,
    flowId: nonEmptyString,
  })
  .strict()

const reasonSchema = z.string().trim().max(240).optional()
const optionalActorEmailSchema = z.string().trim().email().nullable().optional()
const changedFieldIdsSchema = z
  .array(z.string().trim().min(1).max(200))
  .max(200)

const createVersionSchema = flowVersionsKeySchema.extend({
  state: persistedFlowDraftSchema,
  reason: reasonSchema,
  changedFieldIds: changedFieldIdsSchema.default([]),
  actorEmail: optionalActorEmailSchema,
  action: z.enum(['autosave', 'manual_save']).default('manual_save'),
})

const restoreVersionSchema = flowVersionsKeySchema.extend({
  versionNumber: z.number().int().positive(),
  reason: reasonSchema,
  actorEmail: optionalActorEmailSchema,
})

const recordAuditSchema = flowVersionsKeySchema.extend({
  action: z.enum(['discard_modal']),
  reason: reasonSchema,
  changedFieldIds: changedFieldIdsSchema.default([]),
  actorEmail: optionalActorEmailSchema,
  versionNumber: z.number().int().positive().nullable().optional(),
})

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function listFlowDraftVersionsAction(args: {
  brand: string
  flowId: string
}): Promise<ActionResult<FlowDraftVersionRow[]>> {
  const parsed = flowVersionsKeySchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' }
  }
  try {
    const data = await listVersions(parsed.data)
    return { success: true, data }
  } catch (error) {
    console.error('listFlowDraftVersionsAction failed', {
      brand: parsed.data.brand,
      flow_id: parsed.data.flowId,
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: 'Could not load version history' }
  }
}

export async function createFlowDraftVersionAction(args: {
  brand: string
  flowId: string
  state: PersistedFlowDraft
  reason?: string
  changedFieldIds: string[]
  actorEmail: string | null
  action?: 'autosave' | 'manual_save'
}): Promise<ActionResult<{ versionNumber: number }>> {
  const parsed = createVersionSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' }
  }
  try {
    const data = await createVersion({
      brand: parsed.data.brand,
      flowId: parsed.data.flowId,
      state: parsed.data.state as unknown as PersistedFlowDraft,
      reason: parsed.data.reason,
      changedFieldIds: parsed.data.changedFieldIds,
      actorEmail: parsed.data.actorEmail ?? null,
      action: parsed.data.action,
    })
    return { success: true, data }
  } catch (error) {
    console.error('createFlowDraftVersionAction failed', {
      brand: parsed.data.brand,
      flow_id: parsed.data.flowId,
      message: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: 'Could not save this version' }
  }
}

export async function restoreFlowDraftVersionAction(args: {
  brand: string
  flowId: string
  versionNumber: number
  reason?: string
  actorEmail: string | null
}): Promise<
  ActionResult<{ restored: PersistedFlowDraft; newVersionNumber: number }>
> {
  const parsed = restoreVersionSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' }
  }
  try {
    const data = await restoreVersion({
      brand: parsed.data.brand,
      flowId: parsed.data.flowId,
      versionNumber: parsed.data.versionNumber,
      reason: parsed.data.reason,
      actorEmail: parsed.data.actorEmail ?? null,
    })
    return { success: true, data }
  } catch (error) {
    console.error('restoreFlowDraftVersionAction failed', {
      brand: parsed.data.brand,
      flow_id: parsed.data.flowId,
      version_number: parsed.data.versionNumber,
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not restore the selected version',
    }
  }
}

export async function recordFlowDraftDiscardAction(args: {
  brand: string
  flowId: string
  reason?: string
  changedFieldIds: string[]
  actorEmail: string | null
  versionNumber?: number | null
}): Promise<ActionResult<true>> {
  const parsed = recordAuditSchema.safeParse({
    ...args,
    action: 'discard_modal',
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid request' }
  }
  await recordAudit({
    brand: parsed.data.brand,
    flowId: parsed.data.flowId,
    action: 'discard_modal',
    reason: parsed.data.reason,
    changedFieldIds: parsed.data.changedFieldIds,
    actorEmail: parsed.data.actorEmail ?? null,
    versionNumber: parsed.data.versionNumber ?? null,
  })
  return { success: true, data: true }
}
