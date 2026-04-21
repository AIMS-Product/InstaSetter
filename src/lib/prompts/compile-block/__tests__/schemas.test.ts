import { describe, it, expect } from 'vitest'
import { BlockOverridesSchema } from '../schemas'

describe('BlockOverridesSchema', () => {
  it('accepts activeBlockType alone', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
    })
    expect(result.success).toBe(true)
  })

  it('accepts activeBlockType with goal override', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      goal: 'Ask for city',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.goal).toBe('Ask for city')
      expect(result.data.activeBlockType).toBe('opening')
    }
  })

  it('accepts activeBlockType with goal and guidance overrides', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'qualifier',
      goal: 'Collect 2+ qualifiers',
      guidance: 'One question per message.',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.goal).toBe('Collect 2+ qualifiers')
      expect(result.data.guidance).toBe('One question per message.')
    }
  })

  it('rejects unknown block type', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'not-a-block',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-string goal', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      goal: 123,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-string guidance', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      guidance: true,
    })
    expect(result.success).toBe(false)
  })

  it('is optional-friendly on a parent schema', () => {
    const parent = BlockOverridesSchema.optional()
    expect(parent.safeParse(undefined).success).toBe(true)
    expect(parent.safeParse({ activeBlockType: 'booking' }).success).toBe(true)
  })
})
