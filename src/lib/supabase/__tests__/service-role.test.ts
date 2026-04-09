import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('createServiceRoleClient', () => {
  it('returns a Supabase client with from method', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubEnv('BRAND_NAME', 'TestBrand')
    const { createServiceRoleClient } =
      await import('@/lib/supabase/service-role')
    const client = createServiceRoleClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })
})
