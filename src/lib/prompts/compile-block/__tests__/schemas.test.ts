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

  it('accepts capture, branch, and trigger override payloads', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'booking',
      captures: [{ label: 'Email', variable: 'contact.email' }],
      branches: [
        {
          label: 'Booked',
          when: 'contact.email is set',
          target: 'summary',
        },
      ],
      triggers: [
        {
          name: 'Re-engage',
          afterMinutes: 1440,
          cancelOnReply: true,
          mode: 'human_agent_tag',
          target: 'followup',
        },
      ],
    })
    expect(result.success).toBe(true)
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

  it('rejects invalid trigger mode', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'booking',
      triggers: [
        {
          name: 'Bad mode',
          afterMinutes: 5,
          cancelOnReply: true,
          mode: 'later',
          target: 'summary',
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('is optional-friendly on a parent schema', () => {
    const parent = BlockOverridesSchema.optional()
    expect(parent.safeParse(undefined).success).toBe(true)
    expect(parent.safeParse({ activeBlockType: 'booking' }).success).toBe(true)
  })

  it('trims whitespace-only goal to empty string so compile-block falls back', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      goal: '   ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.goal).toBe('')
  })

  it('trims padded goal and preserves the meaningful content', () => {
    const result = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      goal: '  Ask for city  ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.goal).toBe('Ask for city')
  })
})
