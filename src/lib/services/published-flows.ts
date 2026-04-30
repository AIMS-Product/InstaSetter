import 'server-only'

import { createHash } from 'node:crypto'
import {
  PostEmailBehaviorSchema,
  type PostEmailBehavior,
} from '@/lib/prompts/post-email-behavior'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { PersistedFlowDraft } from '@/app/dashboard/flows/[flowId]/draft-persistence'
import type { FlowNode } from '@/app/dashboard/flows/[flowId]/types'
import type { Json } from '@/types/database'

/**
 * Versioned, rollback-capable Flow Builder snapshots (P2.02). Publish writes
 * an immutable row to ins_flow_versions, atomically updates the channel
 * pointer in ins_flow_channels, and appends an audit row in
 * ins_flow_publish_log — all via the `ins_publish_flow` Postgres function so
 * concurrent operators race the version_number through Postgres rather than
 * via app-level locking.
 *
 * The compiled blob currently captures only `postEmailBehavior` because that
 * is the only operator-facing config touching live traffic in Phase 2. Future
 * phases extend the snapshot.
 */

export const DEFAULT_FLOW_CHANNEL = 'ig_organic_dm'

export type CompiledFlowVersion = {
  postEmailBehavior: PostEmailBehavior
}

export interface PublishFlowInput {
  brand: string
  flowId: string
  channel?: string
  draft: PersistedFlowDraft
  publishedBy: string
  note?: string
  /**
   * Optional override for the publish source. Defaults to `'editor'` for
   * operator-driven publishes; the seed inserts pass `'code'` and the
   * rollback path passes `'rollback'`.
   */
  source?: 'editor' | 'code' | 'rollback'
}

export type PublishFlowResult =
  | {
      success: true
      data: {
        versionId: string
        versionNumber: number
        checksum: string
      }
    }
  | { success: false; error: string }

export interface RollbackPublishedFlowInput {
  brand: string
  flowId: string
  channel?: string
  versionId: string
  publishedBy: string
  note?: string
}

export interface GetActiveFlowVersionInput {
  brand: string
  flowId: string
  channel?: string
}

export interface ActiveFlowVersion {
  versionId: string
  versionNumber: number
  publishedAt: string
  publishedBy: string | null
  compiled: CompiledFlowVersion
}

interface ActiveFlowVersionCacheEntry {
  value: ActiveFlowVersion | null
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const activeVersionCache = new Map<string, ActiveFlowVersionCacheEntry>()

function activeCacheKey(input: Required<GetActiveFlowVersionInput>): string {
  return `${input.brand}::${input.flowId}::${input.channel}`
}

function invalidateActiveCache(input: {
  brand: string
  flowId: string
  channel?: string
}): void {
  const channel = input.channel ?? DEFAULT_FLOW_CHANNEL
  activeVersionCache.delete(
    activeCacheKey({ brand: input.brand, flowId: input.flowId, channel })
  )
}

/** Test-only: clear the in-process active-version cache between tests. */
export function __clearActiveFlowVersionCacheForTests(): void {
  activeVersionCache.clear()
}

/**
 * Compute the compiled snapshot from a persisted draft. v1 only captures
 * `postEmailBehavior` — the other sections stay code-owned.
 */
export function compileFlowSnapshot(
  draft: PersistedFlowDraft
): CompiledFlowVersion {
  const emailNode = draft.flow.nodes.find(
    (node): node is FlowNode & { blockConfig: { kind: 'email' } } =>
      node.blockConfig?.kind === 'email'
  )

  const candidate =
    emailNode?.blockConfig && emailNode.blockConfig.kind === 'email'
      ? emailNode.blockConfig.postEmailBehavior
      : undefined

  const parsed = PostEmailBehaviorSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new Error(
      `Cannot publish flow: postEmailBehavior failed validation — ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`
    )
  }

  return { postEmailBehavior: parsed.data }
}

function checksumOf(compiled: CompiledFlowVersion): string {
  return createHash('sha256').update(JSON.stringify(compiled)).digest('hex')
}

export async function publishFlow(
  input: PublishFlowInput
): Promise<PublishFlowResult> {
  const channel = input.channel ?? DEFAULT_FLOW_CHANNEL
  const source = input.source ?? 'editor'

  let compiled: CompiledFlowVersion
  try {
    compiled = compileFlowSnapshot(input.draft)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }

  const checksum = checksumOf(compiled)
  const client = createServiceRoleClient()

  const { data, error } = await client.rpc('ins_publish_flow', {
    p_brand: input.brand,
    p_flow_id: input.flowId,
    p_channel: channel,
    p_state: input.draft as unknown as Json,
    p_compiled: compiled as unknown as Json,
    p_checksum: checksum,
    p_source: source,
    p_note: input.note ?? null,
    p_published_by: input.publishedBy,
  })

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'publishFlow returned no version id',
    }
  }

  invalidateActiveCache({
    brand: input.brand,
    flowId: input.flowId,
    channel,
  })

  // The RPC returns just the new version id. Re-read the row so callers get
  // the assigned version_number without a second round-trip elsewhere.
  const { data: row, error: readError } = await client
    .from('ins_flow_versions')
    .select('id, version_number')
    .eq('id', data as unknown as string)
    .single()

  if (readError || !row) {
    return {
      success: false,
      error:
        readError?.message ??
        'publishFlow succeeded but version row was not visible afterwards',
    }
  }

  return {
    success: true,
    data: {
      versionId: row.id,
      versionNumber: row.version_number,
      checksum,
    },
  }
}

export async function rollbackPublishedFlow(
  input: RollbackPublishedFlowInput
): Promise<PublishFlowResult> {
  const channel = input.channel ?? DEFAULT_FLOW_CHANNEL
  const client = createServiceRoleClient()

  const { data: target, error: lookupError } = await client
    .from('ins_flow_versions')
    .select('id, brand, flow_id, state, compiled, checksum')
    .eq('id', input.versionId)
    .single()

  if (lookupError || !target) {
    return {
      success: false,
      error: lookupError?.message ?? 'Version not found',
    }
  }

  if (target.brand !== input.brand || target.flow_id !== input.flowId) {
    return {
      success: false,
      error: 'Version does not belong to this brand and flow',
    }
  }

  const { data, error } = await client.rpc('ins_publish_flow', {
    p_brand: input.brand,
    p_flow_id: input.flowId,
    p_channel: channel,
    p_state: target.state,
    p_compiled: target.compiled,
    p_checksum: target.checksum,
    p_source: 'rollback',
    p_note: input.note ?? `Rollback to version ${input.versionId}`,
    p_published_by: input.publishedBy,
  })

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'rollback returned no version id',
    }
  }

  invalidateActiveCache({
    brand: input.brand,
    flowId: input.flowId,
    channel,
  })

  const { data: row, error: readError } = await client
    .from('ins_flow_versions')
    .select('id, version_number')
    .eq('id', data as unknown as string)
    .single()

  if (readError || !row) {
    return {
      success: false,
      error:
        readError?.message ??
        'rollback succeeded but version row was not visible afterwards',
    }
  }

  return {
    success: true,
    data: {
      versionId: row.id,
      versionNumber: row.version_number,
      checksum: target.checksum,
    },
  }
}

export async function getActiveFlowVersion(
  input: GetActiveFlowVersionInput
): Promise<ActiveFlowVersion | null> {
  const channel = input.channel ?? DEFAULT_FLOW_CHANNEL
  const key = activeCacheKey({
    brand: input.brand,
    flowId: input.flowId,
    channel,
  })
  const now = Date.now()

  const cached = activeVersionCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const value = await readActiveFlowVersion({
    brand: input.brand,
    flowId: input.flowId,
    channel,
  })
  activeVersionCache.set(key, { value, expiresAt: now + CACHE_TTL_MS })
  return value
}

async function readActiveFlowVersion({
  brand,
  flowId,
  channel,
}: {
  brand: string
  flowId: string
  channel: string
}): Promise<ActiveFlowVersion | null> {
  const client = createServiceRoleClient()

  const { data: pointer } = await client
    .from('ins_flow_channels')
    .select('active_version_id')
    .eq('brand', brand)
    .eq('flow_id', flowId)
    .eq('channel', channel)
    .maybeSingle()

  if (!pointer?.active_version_id) return null

  const { data: row, error } = await client
    .from('ins_flow_versions')
    .select(
      'id, version_number, published_at, published_by, compiled, checksum'
    )
    .eq('id', pointer.active_version_id)
    .single()

  if (error || !row) return null

  const compiledParsed = PostEmailBehaviorSchema.safeParse(
    (row.compiled as { postEmailBehavior?: unknown })?.postEmailBehavior
  )

  if (!compiledParsed.success) {
    // The snapshot is corrupt — refuse to inject it into the prompt and let
    // the engine fall through to the default code-owned path. Logged as a
    // safety carve-out.
    console.error(
      '[published-flows] Active version compiled blob failed validation',
      {
        versionId: row.id,
        brand,
        flowId,
        channel,
      }
    )
    return null
  }

  return {
    versionId: row.id,
    versionNumber: row.version_number,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    compiled: { postEmailBehavior: compiledParsed.data },
  }
}

export interface FlowVersionListItem {
  versionId: string
  versionNumber: number
  publishedAt: string
  publishedBy: string | null
  note: string | null
  source: 'code' | 'editor' | 'rollback'
  isActive: boolean
}

export async function listFlowVersions(input: {
  brand: string
  flowId: string
  channel?: string
  limit?: number
}): Promise<{ versions: FlowVersionListItem[] }> {
  const channel = input.channel ?? DEFAULT_FLOW_CHANNEL
  const limit = input.limit ?? 50
  const client = createServiceRoleClient()

  const [{ data: rows }, { data: pointer }] = await Promise.all([
    client
      .from('ins_flow_versions')
      .select('id, version_number, published_at, published_by, note, source')
      .eq('brand', input.brand)
      .eq('flow_id', input.flowId)
      .order('version_number', { ascending: false })
      .limit(limit),
    client
      .from('ins_flow_channels')
      .select('active_version_id')
      .eq('brand', input.brand)
      .eq('flow_id', input.flowId)
      .eq('channel', channel)
      .maybeSingle(),
  ])

  const activeVersionId = pointer?.active_version_id ?? null

  const versions = (rows ?? []).map((row): FlowVersionListItem => {
    const source = (row.source as 'code' | 'editor' | 'rollback') ?? 'editor'
    return {
      versionId: row.id,
      versionNumber: row.version_number,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      note: row.note,
      source,
      isActive: row.id === activeVersionId,
    }
  })

  return { versions }
}
