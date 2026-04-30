import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the config module so we don't trigger import-time env validation in the
// vitest jsdom environment. The flag is just a boolean accessor that reads
// process.env at call time, so we can implement it inline here.
vi.mock('@/lib/config', () => ({
  isLivePreBookingStepEnabled: () =>
    process.env.LIVE_PRE_BOOKING_STEP_ENABLED !== 'false',
}))

import { resolveLivePreBookingStep } from '@/lib/services/pre-booking-resolver'
import { DEFAULT_PRE_BOOKING_STEP } from '@/lib/prompts/pre-booking-step'

describe('resolveLivePreBookingStep', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns DEFAULT_PRE_BOOKING_STEP when LIVE_PRE_BOOKING_STEP_ENABLED is unset', () => {
    vi.stubEnv('LIVE_PRE_BOOKING_STEP_ENABLED', '')
    const step = resolveLivePreBookingStep('VendingPreneurs')
    expect(step).toEqual(DEFAULT_PRE_BOOKING_STEP)
    expect(step.enabled).toBe(true)
  })

  it('returns DEFAULT_PRE_BOOKING_STEP when LIVE_PRE_BOOKING_STEP_ENABLED is "true"', () => {
    vi.stubEnv('LIVE_PRE_BOOKING_STEP_ENABLED', 'true')
    const step = resolveLivePreBookingStep('VendingPreneurs')
    expect(step).toEqual(DEFAULT_PRE_BOOKING_STEP)
  })

  it('returns a disabled clone when LIVE_PRE_BOOKING_STEP_ENABLED is "false"', () => {
    vi.stubEnv('LIVE_PRE_BOOKING_STEP_ENABLED', 'false')
    const step = resolveLivePreBookingStep('VendingPreneurs')
    expect(step.enabled).toBe(false)
    // Question + skipWhen still come from the default so consumers can
    // safely render the rapport step copy whether or not it is live.
    expect(step.question).toBe(DEFAULT_PRE_BOOKING_STEP.question)
    expect(step.skipWhen).toBe(DEFAULT_PRE_BOOKING_STEP.skipWhen)
  })

  it('does not mutate DEFAULT_PRE_BOOKING_STEP', () => {
    vi.stubEnv('LIVE_PRE_BOOKING_STEP_ENABLED', 'false')
    resolveLivePreBookingStep('VendingPreneurs')
    expect(DEFAULT_PRE_BOOKING_STEP.enabled).toBe(true)
  })
})
