import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

/**
 * Durable email-attachment storage.
 *
 * Files live in the private Supabase Storage bucket `email-assets` at:
 *   {brand}/{flow_id}/{asset_id}/{file_name}
 *
 * Provenance rows live in `public.ins_email_assets`. Rows have a
 * soft-delete column (`archived_at`); past published flow versions can
 * still resolve the row even after the operator removes it from the
 * Email Capture inspector.
 *
 * Signed URLs are minted at send time (P2.04) — never cached. Default
 * TTL is 24h, matching the inflight email-provider idempotency-key
 * window.
 */

export const STORAGE_BUCKET = 'email-assets'

export const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/zip',
] as const

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number]

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB

const DEFAULT_SIGNED_URL_TTL_SECONDS = 86_400 // 24h

const MAX_FILE_NAME_LENGTH = 200

type EmailAssetRow = Database['public']['Tables']['ins_email_assets']['Row']
type EmailAssetInsert =
  Database['public']['Tables']['ins_email_assets']['Insert']

export interface UploadAssetInput {
  brand: string
  flowId: string
  blockId?: string
  fileName: string
  contentType: string
  fileBody: Uint8Array | ArrayBuffer | Buffer | Blob
  description?: string | null
  createdBy?: string | null
}

export interface UploadedAssetData {
  assetId: string
  storagePath: string
  fileName: string
  sizeBytes: number
  checksum: string
}

export type UploadAssetResult =
  | { success: true; data: UploadedAssetData }
  | { success: false; error: string }

export interface ArchiveAssetInput {
  assetId: string
}

export type ArchiveAssetResult =
  | { success: true }
  | { success: false; error: string }

export interface AssetRecord {
  id: string
  brand: string
  flowId: string
  blockId: string
  fileName: string
  contentType: string
  sizeBytes: number
  description: string | null
  createdAt: string
  createdBy: string | null
  archivedAt: string | null
}

export type SignedUrlResult =
  | { success: true; url: string; expiresAt: string }
  | { success: false; error: string }

/**
 * Sanitize a user-supplied filename to the storage charset:
 *   [A-Za-z0-9._-]
 *
 * Whitespace becomes `_`. Anything else is dropped. The result is
 * truncated to 200 chars to honor the DB constraint.
 */
export function sanitizeFileName(input: string): string {
  if (!input) return ''
  const collapsed = input.trim().replace(/\s+/g, '_')
  const stripped = collapsed.replace(/[^A-Za-z0-9._-]/g, '')
  return stripped.slice(0, MAX_FILE_NAME_LENGTH)
}

/**
 * Magic-byte sniff for the four allowed types. Returns null when no
 * known signature matches. Trust the buffer over any client-supplied
 * `Content-Type` header.
 */
export function sniffContentType(bytes: Uint8Array): AllowedContentType | null {
  if (bytes.length < 4) return null

  const [b0, b1, b2, b3] = bytes
  // %PDF
  if (b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46) {
    return 'application/pdf'
  }
  // PNG: 89 50 4E 47
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
    return 'image/jpeg'
  }
  // ZIP: 50 4B 03 04 (and 50 4B 05 06 for empty / 50 4B 07 08 for spanned)
  if (
    (b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04) ||
    (b0 === 0x50 && b1 === 0x4b && b2 === 0x05 && b3 === 0x06) ||
    (b0 === 0x50 && b1 === 0x4b && b2 === 0x07 && b3 === 0x08)
  ) {
    return 'application/zip'
  }
  return null
}

async function bodyToBytes(
  body: Uint8Array | ArrayBuffer | Buffer | Blob
): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body
  if (body instanceof ArrayBuffer) return new Uint8Array(body)
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer())
  }
  // Buffer (Node) is also Uint8Array; the instanceof above catches it
  // when present, but tests sometimes pass plain ArrayBufferView.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeBuf = body as any
  if (maybeBuf?.buffer instanceof ArrayBuffer) {
    return new Uint8Array(
      maybeBuf.buffer,
      maybeBuf.byteOffset ?? 0,
      maybeBuf.byteLength
    )
  }
  throw new Error('Unsupported file body type')
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  const view = new Uint8Array(digest)
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function isAllowedContentType(value: string): value is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(value)
}

/**
 * Server-side upload entry point. Validates everything, computes the
 * storage path from a fresh UUID, uploads the buffer, and inserts the
 * provenance row. Returns the new asset ID + storage path.
 */
export async function uploadAsset(
  input: UploadAssetInput
): Promise<UploadAssetResult> {
  if (!isAllowedContentType(input.contentType)) {
    return {
      success: false,
      error: `Unsupported content type: ${input.contentType}`,
    }
  }

  let bytes: Uint8Array
  try {
    bytes = await bodyToBytes(input.fileBody)
  } catch {
    return { success: false, error: 'Unsupported file body type' }
  }

  if (bytes.byteLength === 0) {
    return { success: false, error: 'File is empty' }
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      success: false,
      error: `File too large (max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`,
    }
  }

  const sniffed = sniffContentType(bytes)
  if (!sniffed) {
    return {
      success: false,
      error: 'File header does not match any allowed type',
    }
  }
  if (sniffed !== input.contentType) {
    return {
      success: false,
      error: `File contents do not match declared type (${input.contentType})`,
    }
  }

  const safeFileName = sanitizeFileName(input.fileName)
  if (!safeFileName) {
    return {
      success: false,
      error: 'File name must contain at least one allowed character',
    }
  }

  const assetId = crypto.randomUUID()
  const blockId = input.blockId ?? 'email'
  const storagePath = `${input.brand}/${input.flowId}/${assetId}/${safeFileName}`
  const checksum = await sha256Hex(bytes)

  const supabase = createServiceRoleClient()

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, bytes as Uint8Array, {
      contentType: input.contentType,
      cacheControl: 'private, max-age=86400',
      upsert: false,
    })

  if (uploadError) {
    console.error('email_asset.upload.failed', {
      brand: input.brand,
      flowId: input.flowId,
      assetId,
      error: uploadError.message,
    })
    return { success: false, error: 'Storage upload failed' }
  }

  const insertRow: EmailAssetInsert = {
    id: assetId,
    brand: input.brand,
    flow_id: input.flowId,
    block_id: blockId,
    file_name: safeFileName,
    content_type: input.contentType,
    size_bytes: bytes.byteLength,
    storage_path: storagePath,
    checksum,
    description: input.description ?? null,
    created_by: input.createdBy ?? null,
  }

  const { data, error } = await supabase
    .from('ins_email_assets')
    .insert(insertRow)
    .select()
    .maybeSingle()

  if (error) {
    console.error('email_asset.insert.failed', {
      brand: input.brand,
      flowId: input.flowId,
      assetId,
      error: error.message,
    })
    // Best effort: purge the uploaded file so we don't orphan storage.
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to record asset metadata' }
  }

  // The insert may not echo a row back through some mocks/clients;
  // fall back to the values we just persisted.
  const persisted = data as EmailAssetRow | null

  console.log('email_asset.upload', {
    brand: input.brand,
    flowId: input.flowId,
    assetId,
    sizeBytes: bytes.byteLength,
    contentType: input.contentType,
    actor: input.createdBy ?? null,
  })

  return {
    success: true,
    data: {
      assetId: persisted?.id ?? assetId,
      storagePath: persisted?.storage_path ?? storagePath,
      fileName: persisted?.file_name ?? safeFileName,
      sizeBytes: persisted?.size_bytes ?? bytes.byteLength,
      // Always return the locally-computed checksum — the buffer we
      // hashed is the canonical source of truth; the DB just records
      // it for audit. Avoids round-tripping a wrong value if the row
      // echoes back differently for any reason.
      checksum,
    },
  }
}

export async function archiveAsset(
  input: ArchiveAssetInput
): Promise<ArchiveAssetResult> {
  const supabase = createServiceRoleClient()
  const archivedAt = new Date().toISOString()
  const { error } = await supabase
    .from('ins_email_assets')
    .update({ archived_at: archivedAt })
    .eq('id', input.assetId)

  if (error) {
    console.error('email_asset.archive.failed', {
      assetId: input.assetId,
      error: error.message,
    })
    return { success: false, error: 'Failed to archive asset' }
  }

  console.log('email_asset.archive', {
    assetId: input.assetId,
    archivedAt,
  })

  return { success: true }
}

export async function getAsset(assetId: string): Promise<AssetRecord | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ins_email_assets')
    .select(
      'id, brand, flow_id, block_id, file_name, content_type, size_bytes, description, created_at, created_by, archived_at'
    )
    .eq('id', assetId)
    .maybeSingle()

  if (error) {
    console.error('email_asset.get.failed', {
      assetId,
      error: error.message,
    })
    return null
  }
  if (!data) return null

  return mapRowToRecord(data as Partial<EmailAssetRow> & { id: string })
}

export async function getAssetSignedUrl(
  assetId: string,
  options?: { ttlSeconds?: number }
): Promise<SignedUrlResult> {
  const ttl = options?.ttlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS
  const supabase = createServiceRoleClient()

  const { data: row, error: rowError } = await supabase
    .from('ins_email_assets')
    .select('id, storage_path, archived_at')
    .eq('id', assetId)
    .maybeSingle()

  if (rowError) {
    return { success: false, error: 'Asset lookup failed' }
  }
  if (!row) {
    return { success: false, error: 'Asset not found' }
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl((row as { storage_path: string }).storage_path, ttl)

  if (error || !data) {
    console.error('email_asset.sign.failed', {
      assetId,
      error: error?.message,
    })
    return { success: false, error: 'Failed to mint signed URL' }
  }

  return {
    success: true,
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  }
}

/**
 * Thin wrapper used by `compile-block.ts` when an attachment has
 * `kind: 'asset'`. Returns just the URL string for prompt embedding.
 * Throws on resolution failure — the caller is wrapped in the engine
 * try/catch per ROLLOUT.md invariant #5.
 */
export async function resolveStoredAssetUrl(
  assetId: string,
  options?: { ttlSeconds?: number }
): Promise<string> {
  const result = await getAssetSignedUrl(assetId, options)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.url
}

export interface ListAssetsInput {
  brand: string
  flowId: string
  includeArchived?: boolean
}

export async function listAssetsForFlow(
  input: ListAssetsInput
): Promise<AssetRecord[]> {
  const supabase = createServiceRoleClient()
  let query = supabase
    .from('ins_email_assets')
    .select(
      'id, brand, flow_id, block_id, file_name, content_type, size_bytes, description, created_at, created_by, archived_at'
    )
    .eq('brand', input.brand)
    .eq('flow_id', input.flowId)

  if (!input.includeArchived) {
    // chain off the .eq() result so we don't break older mock clients
    // that don't expose .is on every chain return.
    query = (
      query as unknown as { is: (col: string, val: null) => typeof query }
    ).is('archived_at', null)
  }

  const { data, error } = await (
    query as unknown as {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => Promise<{
        data: EmailAssetRow[] | null
        error: { message: string } | null
      }>
    }
  ).order('created_at', { ascending: false })

  if (error) {
    console.error('email_asset.list.failed', {
      brand: input.brand,
      flowId: input.flowId,
      error: error.message,
    })
    return []
  }

  return (data ?? []).map(mapRowToRecord)
}

function mapRowToRecord(
  row: Partial<EmailAssetRow> & { id: string }
): AssetRecord {
  return {
    id: row.id,
    brand: row.brand ?? '',
    flowId: row.flow_id ?? '',
    blockId: row.block_id ?? 'email',
    fileName: row.file_name ?? '',
    contentType: row.content_type ?? '',
    sizeBytes: row.size_bytes ?? 0,
    description: row.description ?? null,
    createdAt: row.created_at ?? '',
    createdBy: row.created_by ?? null,
    archivedAt: row.archived_at ?? null,
  }
}
