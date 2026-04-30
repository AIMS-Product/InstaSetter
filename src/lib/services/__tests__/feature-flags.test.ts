import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getSupabaseServerConfig: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test',
  }),
}))

import { flagOn, clearFlagCache } from '@/lib/services/feature-flags'
import { createTableAwareMockClient, asSupabaseClient } from '@/test/helpers'

describe('flagOn', () => {
  beforeEach(() => {
    clearFlagCache()
    vi.clearAllMocks()
  })

  it('returns false when no row exists for the brand', async () => {
    const client = createTableAwareMockClient()
    client
      .forTable('ins_feature_flags')
      .maybeSingle.mockResolvedValue({ data: null, error: null })

    const enabled = await flagOn(
      'close_sync.enabled',
      { brand: 'VendingPreneurs' },
      asSupabaseClient(client)
    )

    expect(enabled).toBe(false)
    expect(client.forTable('ins_feature_flags').eq).toHaveBeenCalledWith(
      'key',
      'close_sync.enabled'
    )
    expect(client.forTable('ins_feature_flags').eq).toHaveBeenCalledWith(
      'scope',
      'brand'
    )
    expect(client.forTable('ins_feature_flags').eq).toHaveBeenCalledWith(
      'scope_id',
      'VendingPreneurs'
    )
  })

  it('returns true when row exists with enabled=true', async () => {
    const client = createTableAwareMockClient()
    client
      .forTable('ins_feature_flags')
      .maybeSingle.mockResolvedValue({ data: { enabled: true }, error: null })

    const enabled = await flagOn(
      'close_sync.enabled',
      { brand: 'VendingPreneurs' },
      asSupabaseClient(client)
    )

    expect(enabled).toBe(true)
  })

  it('returns false when row exists with enabled=false', async () => {
    const client = createTableAwareMockClient()
    client
      .forTable('ins_feature_flags')
      .maybeSingle.mockResolvedValue({ data: { enabled: false }, error: null })

    const enabled = await flagOn(
      'close_sync.enabled',
      { brand: 'VendingPreneurs' },
      asSupabaseClient(client)
    )

    expect(enabled).toBe(false)
  })

  it('treats query errors as off (production safety)', async () => {
    const client = createTableAwareMockClient()
    client.forTable('ins_feature_flags').maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'network blew up' },
    })

    const enabled = await flagOn(
      'close_sync.enabled',
      { brand: 'VendingPreneurs' },
      asSupabaseClient(client)
    )

    expect(enabled).toBe(false)
  })

  it('caches the result so a second call within TTL skips the DB', async () => {
    const client = createTableAwareMockClient()
    client
      .forTable('ins_feature_flags')
      .maybeSingle.mockResolvedValue({ data: { enabled: true }, error: null })

    await flagOn('close_sync.enabled', { brand: 'A' }, asSupabaseClient(client))
    await flagOn('close_sync.enabled', { brand: 'A' }, asSupabaseClient(client))

    expect(
      client.forTable('ins_feature_flags').maybeSingle
    ).toHaveBeenCalledTimes(1)
  })

  it('caches per (key, scope, scopeId) — different brand re-queries', async () => {
    const client = createTableAwareMockClient()
    client
      .forTable('ins_feature_flags')
      .maybeSingle.mockResolvedValueOnce({
        data: { enabled: true },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null })

    const a = await flagOn(
      'close_sync.enabled',
      { brand: 'A' },
      asSupabaseClient(client)
    )
    const b = await flagOn(
      'close_sync.enabled',
      { brand: 'B' },
      asSupabaseClient(client)
    )

    expect(a).toBe(true)
    expect(b).toBe(false)
    expect(
      client.forTable('ins_feature_flags').maybeSingle
    ).toHaveBeenCalledTimes(2)
  })

  it('falls back to global scope when no brand provided', async () => {
    const client = createTableAwareMockClient()
    client
      .forTable('ins_feature_flags')
      .maybeSingle.mockResolvedValue({ data: { enabled: true }, error: null })

    await flagOn('global_kill', {}, asSupabaseClient(client))

    expect(client.forTable('ins_feature_flags').eq).toHaveBeenCalledWith(
      'scope',
      'global'
    )
    expect(client.forTable('ins_feature_flags').eq).toHaveBeenCalledWith(
      'scope_id',
      '*'
    )
  })
})
