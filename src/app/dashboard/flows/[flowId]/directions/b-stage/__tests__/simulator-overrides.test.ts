import { describe, expect, it } from 'vitest'
import { buildInitialFlow } from '../../../store'
import type { AmbientTrigger, BlockType, FlowNode } from '../../../types'
import {
  buildSimulatorOverrides,
  isFlowCompileEnabled,
} from '../simulator-overrides'

const BRAND = 'VendingPreneurs'
const BOOKING_URL = 'https://booking.vendingpreneurs.com/AK-DM'

function getNode(type: BlockType): FlowNode {
  const node = buildInitialFlow(BRAND, BOOKING_URL).nodes.find(
    (candidate) => candidate.type === type
  )
  if (!node) {
    throw new Error(`Missing node for ${type}`)
  }
  return node
}

describe('buildSimulatorOverrides', () => {
  it('returns only the active block when the selected block matches baseline', () => {
    const overrides = buildSimulatorOverrides({
      selectedBlock: getNode('opening'),
      brand: BRAND,
      bookingUrl: BOOKING_URL,
      triggers: [],
    })

    expect(overrides).toEqual({ activeBlockType: 'opening' })
  })

  it('includes capture and branch diffs for the active block', () => {
    const booking = getNode('booking')
    const overrides = buildSimulatorOverrides({
      selectedBlock: {
        ...booking,
        captures: [
          ...booking.captures,
          { label: 'Phone', variable: 'contact.phone' },
        ],
        branches: booking.branches.map((branch, index) =>
          index === 0 ? { ...branch, when: 'contact.email is set' } : branch
        ),
      },
      brand: BRAND,
      bookingUrl: BOOKING_URL,
      triggers: [],
    })

    expect(overrides).toMatchObject({
      activeBlockType: 'booking',
      captures: expect.arrayContaining([
        expect.objectContaining({ variable: 'contact.phone' }),
      ]),
      branches: expect.arrayContaining([
        expect.objectContaining({ when: 'contact.email is set' }),
      ]),
    })
  })

  it('includes only triggers attached to the selected block', () => {
    const triggers: AmbientTrigger[] = [
      {
        id: 't1',
        name: 'Booking nudge',
        whenBlock: 'booking',
        afterMinutes: 1440,
        cancelOnReply: true,
        mode: 'human_agent_tag',
        target: 'followup',
      },
      {
        id: 't2',
        name: 'Ignore me',
        whenBlock: 'opening',
        afterMinutes: 60,
        cancelOnReply: false,
        mode: 'in_window_only',
        target: 'qualifier',
      },
    ]

    const overrides = buildSimulatorOverrides({
      selectedBlock: getNode('booking'),
      brand: BRAND,
      bookingUrl: BOOKING_URL,
      triggers,
    })

    expect(overrides?.triggers).toEqual([
      {
        name: 'Booking nudge',
        afterMinutes: 1440,
        cancelOnReply: true,
        mode: 'human_agent_tag',
        target: 'followup',
      },
    ])
  })

  it('omits blank goal overrides so compile-block can fall back to defaults', () => {
    const opening = getNode('opening')
    const overrides = buildSimulatorOverrides({
      selectedBlock: { ...opening, goal: '   ' },
      brand: BRAND,
      bookingUrl: BOOKING_URL,
      triggers: [],
    })

    expect(overrides).not.toHaveProperty('goal')
  })
})

describe('isFlowCompileEnabled', () => {
  it('honors explicit env values first', () => {
    expect(
      isFlowCompileEnabled({
        NEXT_PUBLIC_FLOW_COMPILE: 'true',
        NODE_ENV: 'production',
      })
    ).toBe(true)
    expect(
      isFlowCompileEnabled({
        NEXT_PUBLIC_FLOW_COMPILE: 'false',
        NODE_ENV: 'development',
      })
    ).toBe(false)
  })

  it('defaults on in development when unset', () => {
    expect(isFlowCompileEnabled({ NODE_ENV: 'development' })).toBe(true)
  })

  it('stays off in production when unset', () => {
    expect(isFlowCompileEnabled({ NODE_ENV: 'production' })).toBe(false)
  })
})
