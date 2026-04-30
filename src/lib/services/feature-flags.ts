import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Per-brand / global feature flag reader, backed by the
 * `public.ins_feature_flags` table. Used to gate live writes to third-party
 * integrations (Close, Customer.io, etc.) on a single SQL UPDATE rather than
 * a redeploy.
 *
 * Default OFF: missing rows resolve to `enabled = false`. The engine and
 * orchestrators MUST treat "no row" as off.
 *
 * In-process cache (60s TTL) avoids round-tripping to Supabase on every
 * inbound webhook. Cache key is `${key}:${scope}:${scopeId}`.
 */
export interface FlagScope {
  brand?: string
  global?: boolean
}

interface CacheEntry {
  enabled: boolean
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

function cacheKey(key: string, scope: 'brand' | 'global', scopeId: string) {
  return `${key}:${scope}:${scopeId}`
}

export function clearFlagCache() {
  cache.clear()
}

export async function flagOn(
  key: string,
  scope: FlagScope = { global: true },
  client?: SupabaseClient<Database>
): Promise<boolean> {
  const resolvedScope: 'brand' | 'global' = scope.brand ? 'brand' : 'global'
  const resolvedScopeId = scope.brand ?? '*'
  const cKey = cacheKey(key, resolvedScope, resolvedScopeId)

  const now = Date.now()
  const cached = cache.get(cKey)
  if (cached && cached.expiresAt > now) {
    return cached.enabled
  }

  const supabase = client ?? createServiceRoleClient()
  const { data, error } = await supabase
    .from('ins_feature_flags')
    .select('enabled')
    .eq('key', key)
    .eq('scope', resolvedScope)
    .eq('scope_id', resolvedScopeId)
    .maybeSingle()

  // Defensive: a transient read failure should NOT silently flip the flag on.
  // Default OFF on error matches the production-safety invariant.
  const enabled = !error && data?.enabled === true

  cache.set(cKey, { enabled, expiresAt: now + CACHE_TTL_MS })
  return enabled
}
