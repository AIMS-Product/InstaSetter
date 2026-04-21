import { describe, it, expect } from 'vitest'
import { compileBlock } from '../compile-block'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'

const BRAND = 'VendingPreneurs'
const BOOKING_URL = 'https://calendly.com/x'

describe('compileBlock — contract (no overrides)', () => {
  it('matches buildSystemPrompt byte-for-byte without bookingUrl', () => {
    expect(compileBlock({ brand: BRAND })).toBe(
      buildSystemPrompt({ brandName: BRAND })
    )
  })

  it('matches buildSystemPrompt byte-for-byte with bookingUrl', () => {
    expect(compileBlock({ brand: BRAND, bookingUrl: BOOKING_URL })).toBe(
      buildSystemPrompt({ brandName: BRAND, bookingUrl: BOOKING_URL })
    )
  })

  it('explicit undefined overrides is identical to omitted overrides', () => {
    expect(
      compileBlock({
        brand: BRAND,
        bookingUrl: BOOKING_URL,
        overrides: undefined,
      })
    ).toBe(buildSystemPrompt({ brandName: BRAND, bookingUrl: BOOKING_URL }))
  })
})
