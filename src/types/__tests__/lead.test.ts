import { describe, it, expect } from 'vitest'
import { leadSummarySchema } from '@/types/lead'

const validSummary = {
  instagram_handle: 'johndoe',
  qualification_status: 'hot',
  call_booked: true,
  machine_count: 5,
}

describe('leadSummarySchema', () => {
  it('validates a complete lead summary', () => {
    expect(leadSummarySchema.safeParse(validSummary).success).toBe(true)
  })

  it('validates minimal required fields only', () => {
    expect(
      leadSummarySchema.safeParse({
        instagram_handle: 'x',
        qualification_status: 'cold',
        call_booked: false,
      }).success
    ).toBe(true)
  })

  it('rejects invalid qualification_status', () => {
    expect(
      leadSummarySchema.safeParse({
        ...validSummary,
        qualification_status: 'lukewarm',
      }).success
    ).toBe(false)
  })

  it('accepts out_of_area as a qualification_status', () => {
    expect(
      leadSummarySchema.safeParse({
        ...validSummary,
        qualification_status: 'out_of_area',
        call_booked: false,
        location_type: 'Sydney, Australia',
        key_notes: 'Out of supported region (US/Canada only)',
      }).success
    ).toBe(true)
  })

  it('rejects negative machine_count', () => {
    expect(
      leadSummarySchema.safeParse({ ...validSummary, machine_count: -3 })
        .success
    ).toBe(false)
  })

  it('rejects fractional machine_count', () => {
    expect(
      leadSummarySchema.safeParse({ ...validSummary, machine_count: 2.5 })
        .success
    ).toBe(false)
  })

  it('validates optional email format', () => {
    expect(
      leadSummarySchema.safeParse({ ...validSummary, email: 'not-email' })
        .success
    ).toBe(false)
    expect(
      leadSummarySchema.safeParse({
        ...validSummary,
        email: 'john@example.com',
      }).success
    ).toBe(true)
  })

  it('accepts all optional fields', () => {
    const full = {
      ...validSummary,
      name: 'John Doe',
      email: 'john@example.com',
      location_type: 'gym',
      revenue_range: '$5k-$10k',
      calendly_slot: '2026-04-15T14:00:00Z',
      key_notes: 'Very interested in expansion',
      recommended_action: 'Schedule follow-up call',
    }
    expect(leadSummarySchema.safeParse(full).success).toBe(true)
  })
})
