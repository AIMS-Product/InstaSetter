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
