import { describe, expect, it } from 'vitest'

import {
  BrandGuardrailSchema,
  BrandGuardrailsArraySchema,
  DEFAULT_BRAND_GUARDRAILS,
  buildBrandGuardrails,
  type BrandGuardrail,
} from '../brand-guardrails'

const SAMPLE_GUARDRAIL: BrandGuardrail = {
  id: '11111111-2222-4333-8444-555555555555',
  phrase: 'passive income',
  note: 'Anthony hates it.',
  createdAt: '2026-04-29T00:00:00.000Z',
}

describe('BrandGuardrailSchema', () => {
  it('accepts a fully-populated guardrail', () => {
    expect(BrandGuardrailSchema.safeParse(SAMPLE_GUARDRAIL).success).toBe(true)
  })

  it('accepts a guardrail with a null note', () => {
    expect(
      BrandGuardrailSchema.safeParse({ ...SAMPLE_GUARDRAIL, note: null })
        .success
    ).toBe(true)
  })

  it('rejects an empty phrase', () => {
    expect(
      BrandGuardrailSchema.safeParse({ ...SAMPLE_GUARDRAIL, phrase: '' })
        .success
    ).toBe(false)
  })

  it('rejects a whitespace-only phrase', () => {
    expect(
      BrandGuardrailSchema.safeParse({ ...SAMPLE_GUARDRAIL, phrase: '   ' })
        .success
    ).toBe(false)
  })

  it('rejects an oversized phrase (>280 chars)', () => {
    expect(
      BrandGuardrailSchema.safeParse({
        ...SAMPLE_GUARDRAIL,
        phrase: 'x'.repeat(281),
      }).success
    ).toBe(false)
  })

  it('rejects an oversized note (>500 chars)', () => {
    expect(
      BrandGuardrailSchema.safeParse({
        ...SAMPLE_GUARDRAIL,
        note: 'x'.repeat(501),
      }).success
    ).toBe(false)
  })

  it('rejects an unknown field (strict)', () => {
    expect(
      BrandGuardrailSchema.safeParse({
        ...SAMPLE_GUARDRAIL,
        extra: 'nope',
      }).success
    ).toBe(false)
  })

  it('rejects a non-uuid id', () => {
    expect(
      BrandGuardrailSchema.safeParse({ ...SAMPLE_GUARDRAIL, id: 'not-a-uuid' })
        .success
    ).toBe(false)
  })
})

describe('BrandGuardrailsArraySchema', () => {
  it('accepts an empty list', () => {
    expect(BrandGuardrailsArraySchema.safeParse([]).success).toBe(true)
  })

  it('accepts up to 50 entries', () => {
    const list = Array.from({ length: 50 }, (_, i) => ({
      ...SAMPLE_GUARDRAIL,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      phrase: `forbidden phrase ${i}`,
    }))
    const result = BrandGuardrailsArraySchema.safeParse(list)
    expect(result.success).toBe(true)
  })

  it('rejects more than 50 entries', () => {
    const list = Array.from({ length: 51 }, (_, i) => ({
      ...SAMPLE_GUARDRAIL,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      phrase: `forbidden phrase ${i}`,
    }))
    expect(BrandGuardrailsArraySchema.safeParse(list).success).toBe(false)
  })

  it('rejects a list containing an entry with an invalid id', () => {
    const list = [{ ...SAMPLE_GUARDRAIL, id: 'not-a-uuid' }]
    expect(BrandGuardrailsArraySchema.safeParse(list).success).toBe(false)
  })
})

describe('DEFAULT_BRAND_GUARDRAILS', () => {
  it('is an empty list', () => {
    expect(DEFAULT_BRAND_GUARDRAILS).toEqual([])
  })

  it('passes the schema', () => {
    expect(
      BrandGuardrailsArraySchema.safeParse(DEFAULT_BRAND_GUARDRAILS).success
    ).toBe(true)
  })
})

describe('buildBrandGuardrails', () => {
  it('returns the empty string when given an empty list', () => {
    expect(buildBrandGuardrails([])).toBe('')
  })

  it('emits a heading and a bullet for a single guardrail without a note', () => {
    const text = buildBrandGuardrails([{ ...SAMPLE_GUARDRAIL, note: null }])
    expect(text).toContain('## Brand Guardrails — Never Say (operator-owned)')
    expect(text).toContain('- Never say "passive income"')
    expect(text).not.toContain('— note:')
  })

  it('appends an inline note when provided', () => {
    const text = buildBrandGuardrails([SAMPLE_GUARDRAIL])
    expect(text).toContain(
      '- Never say "passive income" — note: Anthony hates it.'
    )
  })

  it('omits the note suffix when the note is whitespace-only', () => {
    const text = buildBrandGuardrails([{ ...SAMPLE_GUARDRAIL, note: '   ' }])
    expect(text).toContain('- Never say "passive income"')
    expect(text).not.toContain('— note:')
  })

  it('lists multiple guardrails in input order', () => {
    const list: BrandGuardrail[] = [
      { ...SAMPLE_GUARDRAIL, phrase: 'passive income', note: null },
      {
        ...SAMPLE_GUARDRAIL,
        id: '22222222-3333-4444-8555-666666666666',
        phrase: "you'll make $5k/month",
        note: 'No income claims.',
      },
    ]
    const text = buildBrandGuardrails(list)
    const passiveIdx = text.indexOf('passive income')
    const incomeClaimIdx = text.indexOf("you'll make $5k/month")
    expect(passiveIdx).toBeGreaterThan(-1)
    expect(incomeClaimIdx).toBeGreaterThan(passiveIdx)
  })

  it('mentions that brand guardrails stack on top of the persona-locked phrases', () => {
    const text = buildBrandGuardrails([SAMPLE_GUARDRAIL])
    expect(text).toMatch(/persona/i)
    expect(text).toMatch(/hard rules?/i)
  })
})
