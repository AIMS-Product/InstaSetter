import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  isLiveBrandGuardrailsEnabled: () =>
    process.env.LIVE_BRAND_GUARDRAILS_ENABLED !== 'false',
}))

import { resolveLiveBrandGuardrails } from '@/lib/services/brand-guardrails-resolver'

const ORIGINAL_FLAG = process.env.LIVE_BRAND_GUARDRAILS_ENABLED

beforeEach(() => {
  delete process.env.LIVE_BRAND_GUARDRAILS_ENABLED
})

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.LIVE_BRAND_GUARDRAILS_ENABLED
  } else {
    process.env.LIVE_BRAND_GUARDRAILS_ENABLED = ORIGINAL_FLAG
  }
})

describe('resolveLiveBrandGuardrails', () => {
  it('returns an empty list by default (flag enabled, no published config)', async () => {
    const result = await resolveLiveBrandGuardrails('VendingPreneurs')
    expect(result).toEqual([])
  })

  it('returns an empty list when the flag is explicitly disabled', async () => {
    process.env.LIVE_BRAND_GUARDRAILS_ENABLED = 'false'
    const result = await resolveLiveBrandGuardrails('VendingPreneurs')
    expect(result).toEqual([])
  })

  it('returns an empty list when the flag is enabled and no config exists', async () => {
    process.env.LIVE_BRAND_GUARDRAILS_ENABLED = 'true'
    const result = await resolveLiveBrandGuardrails('AnyBrand')
    expect(result).toEqual([])
  })
})
