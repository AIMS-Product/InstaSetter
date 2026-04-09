import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to test config in isolation — reset modules between tests
beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('serverEnvSchema includes ANTHROPIC_API_KEY and BRAND_NAME', () => {
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
