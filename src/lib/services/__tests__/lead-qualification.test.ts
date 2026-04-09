import { describe, it, expect, vi } from 'vitest'
import type { QualificationStatus } from '@/types/enums'

// Mock service-role to avoid env var validation at import time
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import {
  determineQualification,
  HOT_MACHINE_THRESHOLD,
} from '@/lib/services/lead'

describe('determineQualification', () => {
  it('returns hot when callBooked is true', () => {
    const result: QualificationStatus = determineQualification({
      callBooked: true,
      emailCaptured: false,
    })
    expect(result).toBe('hot')
  })

  it('returns hot when callBooked is true even without email or machines', () => {
    expect(
      determineQualification({
        callBooked: true,
        emailCaptured: false,
        machineCount: 0,
      })
    ).toBe('hot')
  })

  it('returns hot when machine threshold met + email captured', () => {
    expect(
      determineQualification({
        machineCount: HOT_MACHINE_THRESHOLD,
        emailCaptured: true,
        callBooked: false,
      })
    ).toBe('hot')
  })

  it('returns hot when machine count exceeds threshold + email captured', () => {
    expect(
      determineQualification({
        machineCount: HOT_MACHINE_THRESHOLD + 5,
        emailCaptured: true,
        callBooked: false,
      })
    ).toBe('hot')
  })

  it('returns warm when email captured but below threshold', () => {
    expect(
      determineQualification({
        machineCount: 1,
        emailCaptured: true,
        callBooked: false,
      })
    ).toBe('warm')
  })

  it('returns warm when email captured and no machine count', () => {
    expect(
      determineQualification({
        emailCaptured: true,
        callBooked: false,
      })
    ).toBe('warm')
  })

  it('returns cold when no email and no call', () => {
    expect(
      determineQualification({ emailCaptured: false, callBooked: false })
    ).toBe('cold')
  })

  it('returns cold when high machine count but no email', () => {
    expect(
      determineQualification({
        machineCount: HOT_MACHINE_THRESHOLD + 10,
        emailCaptured: false,
        callBooked: false,
      })
    ).toBe('cold')
  })

  it('defaults machineCount to 0 when not provided', () => {
    expect(
      determineQualification({ emailCaptured: false, callBooked: false })
    ).toBe('cold')
  })

  it('exports HOT_MACHINE_THRESHOLD as 5', () => {
    expect(HOT_MACHINE_THRESHOLD).toBe(5)
  })
})
