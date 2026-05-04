import { describe, it, expect } from 'vitest'
import { buildOpener } from '@/lib/prompts/sections/opener'
import { DEFAULT_OPENER_STEP } from '@/lib/prompts/opener-step'
import { DEFAULT_PRE_BOOKING_STEP } from '@/lib/prompts/pre-booking-step'

describe('buildOpener', () => {
  it('returns an empty string when no openerStep is provided', () => {
    expect(buildOpener()).toBe('')
  })

  it('returns an empty string when openerStep.enabled is false', () => {
    expect(
      buildOpener({
        enabled: false,
        question: DEFAULT_OPENER_STEP.question,
        skipWhen: DEFAULT_OPENER_STEP.skipWhen,
      })
    ).toBe('')
  })

  it('emits the Opener Behavior section when enabled', () => {
    const out = buildOpener(DEFAULT_OPENER_STEP)
    expect(out).toContain('## Opener Behavior')
    expect(out).toContain(`"${DEFAULT_OPENER_STEP.question}"`)
    expect(out).toContain(DEFAULT_OPENER_STEP.skipWhen)
  })

  it('embeds operator-edited question and skipWhen verbatim', () => {
    const customQuestion = 'Hey there, what part of vending caught your eye?'
    const customSkip = 'Skip when the prospect mentions a number or a city.'
    const out = buildOpener({
      enabled: true,
      question: customQuestion,
      skipWhen: customSkip,
    })
    expect(out).toContain(customQuestion)
    expect(out).toContain(customSkip)
  })

  it('explicitly tells Claude to use this question and NOT the rapport bridge as the first reply', () => {
    const out = buildOpener(DEFAULT_OPENER_STEP)
    // The whole point of this section: keep the opener distinct from the
    // pre-booking bridge so Claude does not collapse the two slots.
    expect(out).toMatch(/first reply|first message/i)
    expect(out).toMatch(/do not.*rapport bridge|not.*pre-booking|not.*later/i)
  })

  it('does NOT contain the pre-booking bridge question literal', () => {
    // If the opener literal ever drifts into matching the bridge, the split
    // collapses back to P1.02's failure mode. This regression test catches
    // an accidental copy of the bridge string into the opener default or
    // section template.
    const out = buildOpener(DEFAULT_OPENER_STEP)
    expect(out).not.toContain(`"${DEFAULT_PRE_BOOKING_STEP.question}"`)
  })

  it('passes through the skipWhen guidance under a clear label', () => {
    const out = buildOpener(DEFAULT_OPENER_STEP)
    expect(out).toMatch(/skip when/i)
  })
})
