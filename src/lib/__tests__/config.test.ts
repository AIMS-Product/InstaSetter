import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to test config in isolation — reset modules between tests
beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('getServerConfig (aggregate)', () => {
  it('validates when all keys present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubEnv('BRAND_NAME', 'VendingPreneurs')
    const { getServerConfig } = await import('@/lib/config')
    const serverConfig = getServerConfig()
    expect(serverConfig.ANTHROPIC_API_KEY).toBe('sk-ant-test')
    expect(serverConfig.BRAND_NAME).toBe('VendingPreneurs')
    expect(serverConfig.SUPABASE_SERVICE_ROLE_KEY).toBe('test-key')
  })

  it('throws when ANTHROPIC_API_KEY missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
    vi.stubEnv('BRAND_NAME', 'VendingPreneurs')
    // ANTHROPIC_API_KEY not set
    const { getServerConfig } = await import('@/lib/config')
    expect(() => getServerConfig()).toThrow()
  })

  it('throws when BRAND_NAME missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    // BRAND_NAME not set
    const { getServerConfig } = await import('@/lib/config')
    expect(() => getServerConfig()).toThrow()
  })
})

describe('split server-env getters', () => {
  // These cover the invariant: reads that only touch one slice (e.g. Supabase)
  // must not fail validation when an unrelated slice (e.g. Anthropic) is unset.

  it('getSupabaseServerConfig does not require ANTHROPIC_API_KEY or BRAND_NAME', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
    const { getSupabaseServerConfig } = await import('@/lib/config')
    expect(() => getSupabaseServerConfig()).not.toThrow()
    expect(getSupabaseServerConfig().SUPABASE_SERVICE_ROLE_KEY).toBe('test-key')
  })

  it('getAnthropicConfig does not require SUPABASE_SERVICE_ROLE_KEY or BRAND_NAME', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const { getAnthropicConfig } = await import('@/lib/config')
    expect(() => getAnthropicConfig()).not.toThrow()
    expect(getAnthropicConfig().ANTHROPIC_API_KEY).toBe('sk-ant-test')
  })

  it('getBrandConfig does not require SUPABASE or ANTHROPIC keys', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('BRAND_NAME', 'VendingPreneurs')
    const { getBrandConfig } = await import('@/lib/config')
    expect(() => getBrandConfig()).not.toThrow()
    expect(getBrandConfig().BRAND_NAME).toBe('VendingPreneurs')
  })

  it('getSupabaseServerConfig throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    // SUPABASE_SERVICE_ROLE_KEY not set
    const { getSupabaseServerConfig } = await import('@/lib/config')
    expect(() => getSupabaseServerConfig()).toThrow()
  })
})

describe('getFlowRationaleVariant (P4.05)', () => {
  it('defaults to "hidden" when NEXT_PUBLIC_FLOW_RATIONALE is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    const { getFlowRationaleVariant } = await import('@/lib/config')
    expect(getFlowRationaleVariant()).toBe('hidden')
  })

  it('returns "always_on" when NEXT_PUBLIC_FLOW_RATIONALE=always_on', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'always_on')
    const { getFlowRationaleVariant } = await import('@/lib/config')
    expect(getFlowRationaleVariant()).toBe('always_on')
  })

  it('returns "hidden" when NEXT_PUBLIC_FLOW_RATIONALE=hidden', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'hidden')
    const { getFlowRationaleVariant } = await import('@/lib/config')
    expect(getFlowRationaleVariant()).toBe('hidden')
  })

  it('throws when NEXT_PUBLIC_FLOW_RATIONALE has an unknown value', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'collapsed')
    const { getFlowRationaleVariant } = await import('@/lib/config')
    // The legacy 'collapsed' variant was removed by spec patch (2026-04-29);
    // only the two-variant decision space ('always_on' | 'hidden') is valid.
    expect(() => getFlowRationaleVariant()).toThrow()
  })
})
