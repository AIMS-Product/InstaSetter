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

describe('getEmailProviderConfig (P2.01 — Resend)', () => {
  // The slice is intentionally permissive: until P2.04 wires the live send,
  // all fields must be optional/nullable so deploys without the env vars
  // do not crash unrelated routes that touch this getter transitively.

  it('returns all-null when no RESEND_* env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    // Explicitly clear RESEND_* vars to prevent leakage from real environment
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '')
    vi.stubEnv('RESEND_FROM_ADDRESS', '')
    vi.stubEnv('RESEND_FROM_DISPLAY_NAME', '')
    vi.stubEnv('RESEND_REPLY_TO', '')
    const { getEmailProviderConfig } = await import('@/lib/config')
    const cfg = getEmailProviderConfig()
    expect(cfg.RESEND_API_KEY).toBeNull()
    expect(cfg.RESEND_WEBHOOK_SECRET).toBeNull()
    expect(cfg.RESEND_FROM_ADDRESS).toBeNull()
    expect(cfg.RESEND_FROM_DISPLAY_NAME).toBeNull()
    expect(cfg.RESEND_REPLY_TO).toBeNull()
  })

  it('returns the values when env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_WEBHOOK_SECRET', 'whsec_test')
    vi.stubEnv('RESEND_FROM_ADDRESS', 'team@vendingpreneurs.com')
    vi.stubEnv('RESEND_FROM_DISPLAY_NAME', 'Anthony from VendingPreneurs')
    vi.stubEnv('RESEND_REPLY_TO', 'sales@vendingpreneurs.com')
    const { getEmailProviderConfig } = await import('@/lib/config')
    const cfg = getEmailProviderConfig()
    expect(cfg.RESEND_API_KEY).toBe('re_test_key')
    expect(cfg.RESEND_WEBHOOK_SECRET).toBe('whsec_test')
    expect(cfg.RESEND_FROM_ADDRESS).toBe('team@vendingpreneurs.com')
    expect(cfg.RESEND_FROM_DISPLAY_NAME).toBe('Anthony from VendingPreneurs')
    expect(cfg.RESEND_REPLY_TO).toBe('sales@vendingpreneurs.com')
  })

  it('throws when RESEND_FROM_ADDRESS is set but is not a valid email', async () => {
    // Optional fields are still type-validated when present — partial config
    // with malformed values must surface a Zod error, not silently pass.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('RESEND_FROM_ADDRESS', 'not-an-email')
    const { getEmailProviderConfig } = await import('@/lib/config')
    expect(() => getEmailProviderConfig()).toThrow()
  })

  it('does not require unrelated env vars (slice isolation)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    // ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, BRAND_NAME all absent.
    // Explicitly clear RESEND_* vars to ensure isolation from real environment
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '')
    vi.stubEnv('RESEND_FROM_ADDRESS', '')
    vi.stubEnv('RESEND_FROM_DISPLAY_NAME', '')
    vi.stubEnv('RESEND_REPLY_TO', '')
    const { getEmailProviderConfig } = await import('@/lib/config')
    expect(() => getEmailProviderConfig()).not.toThrow()
  })
})
