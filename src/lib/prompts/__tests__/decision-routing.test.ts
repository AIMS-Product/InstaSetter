import { describe, it, expect } from 'vitest'
import { buildDecisionRouting } from '@/lib/prompts/sections/decision-routing'
import { DEFAULT_PRE_BOOKING_STEP } from '@/lib/prompts/pre-booking-step'

const BOOKING_URL = 'https://booking.example.com/vending'

describe('buildDecisionRouting', () => {
  it('keeps the legacy "VERY NEXT message" wording when no preBookingStep is provided', () => {
    const out = buildDecisionRouting(BOOKING_URL)
    expect(out).toContain(
      'Once both location AND motivation are known, you MUST send the booking link in your VERY NEXT message.'
    )
    expect(out).not.toContain('### Rapport Bridge')
  })

  it('keeps the legacy wording byte-identical when preBookingStep.enabled is false', () => {
    const baseline = buildDecisionRouting(BOOKING_URL)
    const disabled = buildDecisionRouting(BOOKING_URL, {
      enabled: false,
      question: 'What got you interested in vending?',
      skipWhen: 'Skip when rapport is already there.',
    })
    expect(disabled).toBe(baseline)
  })

  it('emits the rapport bridge section when preBookingStep is enabled', () => {
    const out = buildDecisionRouting(BOOKING_URL, DEFAULT_PRE_BOOKING_STEP)
    expect(out).toContain('### Rapport Bridge (one message before the link)')
    expect(out).toContain(`"${DEFAULT_PRE_BOOKING_STEP.question}"`)
    expect(out).toContain(DEFAULT_PRE_BOOKING_STEP.skipWhen)
  })

  it('relaxes GATE 1 wording when the rapport bridge is enabled', () => {
    const out = buildDecisionRouting(BOOKING_URL, DEFAULT_PRE_BOOKING_STEP)
    // The strict "VERY NEXT message" line cannot fight the rapport bridge —
    // it must be replaced with a sequence-aware instruction that allows one
    // bridge before the link.
    expect(out).not.toContain(
      'Once both location AND motivation are known, you MUST send the booking link in your VERY NEXT message.'
    )
    expect(out).toMatch(/Two qualifiers.*one rapport bridge.*then.*link/i)
  })

  it('still requires location + motivation as the GATE 1 qualifiers', () => {
    const out = buildDecisionRouting(BOOKING_URL, DEFAULT_PRE_BOOKING_STEP)
    expect(out).toMatch(/location.*AND.*motivation/i)
    expect(out).toContain('GATE 1')
  })

  it('inserts the rapport bridge section before GATE 2', () => {
    const out = buildDecisionRouting(BOOKING_URL, DEFAULT_PRE_BOOKING_STEP)
    const bridgeIdx = out.indexOf('### Rapport Bridge')
    const gate2Idx = out.indexOf('### GATE 2')
    expect(bridgeIdx).toBeGreaterThan(-1)
    expect(gate2Idx).toBeGreaterThan(-1)
    expect(bridgeIdx).toBeLessThan(gate2Idx)
  })

  it('embeds operator-edited question and skipWhen verbatim', () => {
    const customQuestion = 'What problem are you trying to solve right now?'
    const customSkip = 'Skip when the prospect mentioned a deadline.'
    const out = buildDecisionRouting(BOOKING_URL, {
      enabled: true,
      question: customQuestion,
      skipWhen: customSkip,
    })
    expect(out).toContain(customQuestion)
    expect(out).toContain(customSkip)
  })

  it('instructs the bot not to loop on rapport', () => {
    const out = buildDecisionRouting(BOOKING_URL, DEFAULT_PRE_BOOKING_STEP)
    expect(out).toMatch(/do not loop|one bridge.*then link/i)
  })

  it('tells the bot to send the link in the next message regardless of prospect answer', () => {
    const out = buildDecisionRouting(BOOKING_URL, DEFAULT_PRE_BOOKING_STEP)
    expect(out).toMatch(/regardless of whether the prospect/i)
  })
})
