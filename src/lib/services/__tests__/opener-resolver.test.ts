import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the config module so we don't trigger import-time env validation in the
// vitest jsdom environment. The flag is just a boolean accessor that reads
// process.env at call time, so we can implement it inline here. Mirrors the
// pattern used by `pre-booking-resolver.test.ts` — keep them parallel so the
// two seams behave identically under mocked envs.
vi.mock('@/lib/config', () => ({
  isLiveOpenerStepEnabled: () =>
    process.env.LIVE_OPENER_STEP_ENABLED !== 'false',
}))

import { resolveLiveOpenerStep } from '@/lib/services/opener-resolver'
import { DEFAULT_OPENER_STEP } from '@/lib/prompts/opener-step'

describe('resolveLiveOpenerStep', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns DEFAULT_OPENER_STEP when LIVE_OPENER_STEP_ENABLED is unset', () => {
    vi.stubEnv('LIVE_OPENER_STEP_ENABLED', '')
    const step = resolveLiveOpenerStep('VendingPreneurs')
    expect(step).toEqual(DEFAULT_OPENER_STEP)
    expect(step.enabled).toBe(true)
  })

  it('returns DEFAULT_OPENER_STEP when LIVE_OPENER_STEP_ENABLED is "true"', () => {
    vi.stubEnv('LIVE_OPENER_STEP_ENABLED', 'true')
    const step = resolveLiveOpenerStep('VendingPreneurs')
    expect(step).toEqual(DEFAULT_OPENER_STEP)
  })

  it('returns a disabled clone when LIVE_OPENER_STEP_ENABLED is "false"', () => {
    vi.stubEnv('LIVE_OPENER_STEP_ENABLED', 'false')
    const step = resolveLiveOpenerStep('VendingPreneurs')
    expect(step.enabled).toBe(false)
    // Question + skipWhen still come from the default so consumers can
    // safely render the opener step copy whether or not it is live.
    expect(step.question).toBe(DEFAULT_OPENER_STEP.question)
    expect(step.skipWhen).toBe(DEFAULT_OPENER_STEP.skipWhen)
  })

  it('does not mutate DEFAULT_OPENER_STEP', () => {
    vi.stubEnv('LIVE_OPENER_STEP_ENABLED', 'false')
    resolveLiveOpenerStep('VendingPreneurs')
    expect(DEFAULT_OPENER_STEP.enabled).toBe(true)
  })
})
