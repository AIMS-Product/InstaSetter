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

describe('compileBlock — active block directive (no overrides)', () => {
  it('appends a directive section to the baseline prompt', () => {
    const baseline = buildSystemPrompt({ brandName: BRAND })
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled.startsWith(baseline)).toBe(true)
    expect(compiled).toContain('## Active Block Directive')
    expect(compiled).toContain('Block: Opening')
  })

  it('uses the default opening goal verbatim', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(
      'Greet warmly, detect initial interest, and ask for location as the first qualifier.'
    )
  })

  it('uses the default opening guidance verbatim', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(
      "Match the prospect's energy. Don't interrogate. Ask ONE question — start with area. Run the location gate BEFORE qualification."
    )
  })

  it('uses qualifier defaults when activeBlockType is qualifier', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'qualifier' },
    })
    expect(compiled).toContain('Block: Qualifier')
    expect(compiled).toContain(
      'Collect at least two of five qualifiers through natural conversation — location first, budget last.'
    )
  })
})

describe('compileBlock — goal/guidance overrides', () => {
  const DEFAULT_OPENING_GOAL =
    'Greet warmly, detect initial interest, and ask for location'
  const DEFAULT_OPENING_GUIDANCE =
    "Match the prospect's energy. Don't interrogate. Ask ONE question — start with area. Run the location gate BEFORE qualification."

  it('replaces default goal with override.goal', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', goal: 'Ask for city' },
    })
    expect(compiled).toContain('Ask for city')
    expect(compiled).not.toContain(DEFAULT_OPENING_GOAL)
  })

  it('replaces default guidance with override.guidance', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: {
        activeBlockType: 'opening',
        guidance: 'Only one question, peer-to-peer tone.',
      },
    })
    expect(compiled).toContain('Only one question, peer-to-peer tone.')
    expect(compiled).not.toContain(DEFAULT_OPENING_GUIDANCE)
  })

  it('falls back to default goal when override.goal is absent', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(DEFAULT_OPENING_GOAL)
  })

  it('falls back to default goal when override.goal is empty string', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', goal: '' },
    })
    expect(compiled).toContain(DEFAULT_OPENING_GOAL)
  })

  it('falls back to default guidance when override.guidance is empty string', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening', guidance: '' },
    })
    expect(compiled).toContain(DEFAULT_OPENING_GUIDANCE)
  })
})
