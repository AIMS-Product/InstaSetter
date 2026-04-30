import 'server-only'

import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Per-key/scope feature flag service. Backs the per-brand cutover for
 * `email_delivery.use_published_snapshot` (P2.02) and the auto-pause path
 * P2.05 will land later. Always default OFF — a missing or unknown key
 * resolves to `false`.
 *
 * Resolution order on `flagOn(key, ctx)`:
 *   1. brand-scoped row (if `ctx.brand` provided and a matching row exists)
 *   2. global-scoped row
 *   3. default false
 *
 * In-process cache TTL is 60s per server instance, keyed by the resolved
 * tuple `(key, scope, scope_id)`. `setFlag` writes the audit trail and
 * invalidates the local cache for the affected key.
 */

const CACHE_TTL_MS = 60_000

interface FlagCacheEntry {
  enabled: boolean
  expiresAt: number
}

interface FlagCache {
  get(key: string): FlagCacheEntry | undefined
  set(key: string, value: FlagCacheEntry): void
  delete(key: string): void
  clear(): void
  keys(): IterableIterator<string>
}

function createMemoryCache(): FlagCache {
  const store = new Map<string, FlagCacheEntry>()
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value)
    },
    delete: (key) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    keys: () => store.keys(),
  }
}

let flagCache: FlagCache = createMemoryCache()

/** Test-only: allow tests to swap in a deterministic cache. */
export function __setFlagCacheForTests(cache: FlagCache | null): void {
  flagCache = cache ?? createMemoryCache()
}

function cacheKey(key: string, brand?: string): string {
  return brand ? `${key}::brand::${brand}` : `${key}::global::`
}

export interface FlagContext {
  /** Brand id for per-brand resolution. Falsy → resolve global only. */
  brand?: string
}

export type FlagAction =
  | 'enabled'
  | 'disabled'
  | 'paused-auto'
  | 'paused-manual'
  | 'resumed'

export interface SetFlagInput {
  key: string
  scope: 'global' | 'brand'
  scopeId?: string
  enabled: boolean
  /** Operator email or `'system:auto-pause'`. Drives the audit `action`. */
  actor: string
  reason?: string
}

export type SetFlagResult =
  | { success: true; data: { flagId: string } }
  | { success: false; error: string }

export async function flagOn(key: string, ctx?: FlagContext): Promise<boolean> {
  const brand = ctx?.brand
  const k = cacheKey(key, brand)
  const now = Date.now()

  const cached = flagCache.get(k)
  if (cached && cached.expiresAt > now) {
    return cached.enabled
  }

  const enabled = await resolveFromDatabase(key, brand)
  flagCache.set(k, { enabled, expiresAt: now + CACHE_TTL_MS })
  return enabled
}

async function resolveFromDatabase(
  key: string,
  brand: string | undefined
): Promise<boolean> {
  const client = createServiceRoleClient()

  if (brand) {
    const { data } = await client
      .from('ins_feature_flags')
      .select('enabled')
      .eq('key', key)
      .eq('scope', 'brand')
      .eq('scope_id', brand)
      .maybeSingle()

    if (data) return data.enabled
  }

  const { data: globalRow } = await client
    .from('ins_feature_flags')
    .select('enabled')
    .eq('key', key)
    .eq('scope', 'global')
    .is('scope_id', null)
    .maybeSingle()

  return globalRow?.enabled ?? false
}

/**
 * Atomic upsert + audit. Writes the flag row, appends an audit entry whose
 * `action` is derived from `enabled` + `actor`, and invalidates the local
 * cache for the affected `(key, brand)` tuple.
 *
 * Auto-pause writes from P2.05 set `actor: 'system:auto-pause'`; the
 * derived audit action is `paused-auto`.
 */
export async function setFlag(input: SetFlagInput): Promise<SetFlagResult> {
  const { key, scope, scopeId, enabled, actor, reason } = input

  if (scope === 'brand' && !scopeId) {
    return { success: false, error: 'scopeId required when scope=brand' }
  }

  const client = createServiceRoleClient()

  // Call the DB-side RPC that atomically upserts the flag and inserts the audit
  const { data: flagId, error } = await client.rpc('ins_set_feature_flag', {
    p_key: key,
    p_scope: scope,
    p_scope_id: scopeId ?? null,
    p_enabled: enabled,
    p_actor: actor,
    p_reason: reason ?? null,
  })

  if (error || !flagId) {
    return {
      success: false,
      error: error?.message ?? 'setFlag RPC returned no flag id',
    }
  }

  // Invalidate the in-process cache so this server picks up the change
  // immediately. Other dynos converge within their own TTL.
  if (scope === 'brand' && scopeId) {
    flagCache.delete(cacheKey(key, scopeId))
  } else {
    // When updating a global flag, also invalidate any cached brand-scoped
    // entries derived from that global key so brand reads don't remain stale.
    flagCache.delete(cacheKey(key))
    const globalPrefix = `${key}::brand::`
    for (const cachedKey of flagCache.keys()) {
      if (cachedKey.startsWith(globalPrefix)) {
        flagCache.delete(cachedKey)
      }
    }
  }

  return { success: true, data: { flagId: flagId as string } }
}
