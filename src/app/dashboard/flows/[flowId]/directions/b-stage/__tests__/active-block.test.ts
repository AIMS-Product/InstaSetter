import { describe, expect, it } from 'vitest'
import { buildInitialFlow } from '../../../store'
import type { Turn } from '../../../types'
import {
  inferActiveBlock,
  getActiveBlockLabel,
  TOOL_NAME_BOOK_CALL,
  TOOL_NAME_CAPTURE_EMAIL,
  TOOL_NAME_QUALIFY_LEAD,
} from '../active-block'

const BRAND = 'VendingPreneurs'
const BOOKING_URL = 'https://booking.vendingpreneurs.com/AK-DM'

function fixtureFlow() {
  return buildInitialFlow(BRAND, BOOKING_URL)
}

function turn(partial: Partial<Turn> = {}): Turn {
  return {
    role: 'bot',
    text: '',
    t: 'now',
    ...partial,
  }
}

describe('inferActiveBlock', () => {
  it('returns booking when the turn includes a book_call tool call', () => {
    const result = inferActiveBlock({
      turn: turn({
        text: 'Sounds good!',
        toolCalls: [{ name: TOOL_NAME_BOOK_CALL, input: {} }],
      }),
      selectedBlockId: 'opening',
      flow: fixtureFlow(),
    })
    expect(result).toBe('booking')
  })

  it('returns email when the turn includes a capture_email tool call', () => {
    const result = inferActiveBlock({
      turn: turn({
        text: 'Got it.',
        toolCalls: [
          { name: TOOL_NAME_CAPTURE_EMAIL, input: { email: 'a@b.com' } },
        ],
      }),
      selectedBlockId: 'opening',
      flow: fixtureFlow(),
    })
    expect(result).toBe('email')
  })

  it('returns escalation when the turn includes a qualify_lead tool call', () => {
    const result = inferActiveBlock({
      turn: turn({
        text: 'Thanks!',
        toolCalls: [{ name: TOOL_NAME_QUALIFY_LEAD, input: {} }],
      }),
      selectedBlockId: 'opening',
      flow: fixtureFlow(),
    })
    expect(result).toBe('escalation')
  })

  it('returns booking when the reply text contains the brand booking URL', () => {
    const result = inferActiveBlock({
      turn: turn({
        text: `Here you go: ${BOOKING_URL}`,
      }),
      selectedBlockId: 'qualifier',
      flow: fixtureFlow(),
      bookingUrlSubstring: BOOKING_URL,
    })
    expect(result).toBe('booking')
  })

  it('falls back to the selected block when no signal is found', () => {
    const result = inferActiveBlock({
      turn: turn({ text: 'Where are you based?' }),
      selectedBlockId: 'qualifier',
      flow: fixtureFlow(),
    })
    expect(result).toBe('qualifier')
  })

  it('returns null when no signal and no selected block is present', () => {
    const result = inferActiveBlock({
      turn: turn({ text: 'Tell me more.' }),
      selectedBlockId: null,
      flow: fixtureFlow(),
    })
    expect(result).toBeNull()
  })

  it('respects an explicit turn.block when provided', () => {
    const result = inferActiveBlock({
      turn: turn({ text: 'irrelevant', block: 'summary' }),
      selectedBlockId: 'opening',
      flow: fixtureFlow(),
    })
    expect(result).toBe('summary')
  })

  it('prefers a tool call over a booking-url substring', () => {
    const result = inferActiveBlock({
      turn: turn({
        text: `book here ${BOOKING_URL}`,
        toolCalls: [
          { name: TOOL_NAME_CAPTURE_EMAIL, input: { email: 'a@b.com' } },
        ],
      }),
      selectedBlockId: 'qualifier',
      flow: fixtureFlow(),
      bookingUrlSubstring: BOOKING_URL,
    })
    expect(result).toBe('email')
  })

  it('skips the booking-url heuristic when no substring is provided', () => {
    const result = inferActiveBlock({
      turn: turn({ text: 'Send me the link' }),
      selectedBlockId: 'qualifier',
      flow: fixtureFlow(),
    })
    expect(result).toBe('qualifier')
  })
})

describe('getActiveBlockLabel', () => {
  it('returns the catalog display label for a block type', () => {
    expect(getActiveBlockLabel('booking')).toBe('Send the booking link')
  })

  it('returns the fallback string when the block type is null', () => {
    expect(getActiveBlockLabel(null, 'No active step')).toBe('No active step')
  })

  it('returns an empty string when no fallback is provided for null', () => {
    expect(getActiveBlockLabel(null)).toBe('')
  })
})
