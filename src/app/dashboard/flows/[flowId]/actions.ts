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
  archiveAsset,
  listAssetsForFlow,
  uploadAsset,
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type AssetRecord,
} from '@/lib/services/email-assets'
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

const flowVersionsKeySchema = z
  .object({
    brand: nonEmptyString,
    flowId: nonEmptyString,
  })
  .strict()

// `listFlowVersionsArgsSchema` (p2-02) shares the same shape as
// `flowVersionsKeySchema` (p4-04). Alias to keep both naming conventions
// readable at the call sites without duplicating the underlying schema.
const listFlowVersionsArgsSchema = flowVersionsKeySchema

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

// ---------- Email-asset Server Actions (P2.03) ----------

const allowedContentTypeSchema = z.enum([
  ALLOWED_CONTENT_TYPES[0],
  ...ALLOWED_CONTENT_TYPES.slice(1),
] as [string, ...string[]])

const archiveAssetArgsSchema = z.object({ assetId: z.string().uuid() }).strict()

const listAssetsArgsSchema = z
  .object({ brand: nonEmptyString, flowId: nonEmptyString })
  .strict()

export type UploadEmailAssetActionResult =
  | {
      success: true
      assetId: string
      fileName: string
      sizeBytes: number
      storagePath: string
    }
  | { success: false; error: string }

/**
 * FormData fields:
 *  - file: File (required)
 *  - brand: string (required)
 *  - flowId: string (required)
 *  - description: string | null (optional)
 *  - blockId: string (optional, defaults 'email')
 */
export async function uploadEmailAssetAction(
  formData: FormData
): Promise<UploadEmailAssetActionResult> {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, error: 'File is required' }
  }
  if (file.size === 0) {
    return { success: false, error: 'File is empty' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      success: false,
      error: `File too large (max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`,
    }
  }

  const declaredType = file.type
  const ctParsed = allowedContentTypeSchema.safeParse(declaredType)
  if (!ctParsed.success) {
    return {
      success: false,
      error: `Unsupported content type: ${declaredType || 'unknown'}`,
    }
  }

  const brand = formData.get('brand')
  const flowId = formData.get('flowId')
  if (typeof brand !== 'string' || !brand.trim()) {
    return { success: false, error: 'brand is required' }
  }
  if (typeof flowId !== 'string' || !flowId.trim()) {
    return { success: false, error: 'flowId is required' }
  }

  const description = formData.get('description')
  const blockId = formData.get('blockId')

  const arrayBuf = await file.arrayBuffer()
  const result = await uploadAsset({
    brand: brand.trim(),
    flowId: flowId.trim(),
    blockId:
      typeof blockId === 'string' && blockId.trim()
        ? blockId.trim()
        : undefined,
    fileName: file.name,
    contentType: ctParsed.data,
    fileBody: new Uint8Array(arrayBuf),
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : null,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return {
    success: true,
    assetId: result.data.assetId,
    fileName: result.data.fileName,
    sizeBytes: result.data.sizeBytes,
    storagePath: result.data.storagePath,
  }
}

export async function archiveEmailAssetAction(args: {
  assetId: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = archiveAssetArgsSchema.safeParse(args)
  if (!parsed.success) {
    return { success: false, error: 'Invalid asset id' }
  }
  return archiveAsset({ assetId: parsed.data.assetId })
}

export async function listEmailAssetsAction(args: {
  brand: string
  flowId: string
}): Promise<AssetRecord[]> {
  const parsed = listAssetsArgsSchema.safeParse(args)
  if (!parsed.success) return []
  return listAssetsForFlow(parsed.data)
}
