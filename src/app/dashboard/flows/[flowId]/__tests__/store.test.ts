import { describe, expect, it } from 'vitest'
import {
  buildInitialState,
  buildInitialFlow,
  dirtyTrackingReducer,
  reducer,
  storageKeyFor,
} from '../store'
import type { FlowNode } from '../types'

const BRAND = 'VendingPreneurs'
const BOOKING_URL = 'https://booking.vendingpreneurs.com/AK-DM'
const FLOW_ID = 'lg-organic-dm'

function getNode(
  state: ReturnType<typeof buildInitialState>,
  id: FlowNode['id']
) {
  const node = state.flow.nodes.find((candidate) => candidate.id === id)
  if (!node) {
    throw new Error(`Missing node ${id}`)
  }
  return node
}

describe('store route scoping', () => {
  it('builds the flow with the route flow id', () => {
    expect(buildInitialFlow(BRAND, BOOKING_URL, FLOW_ID).id).toBe(FLOW_ID)
  })

  it('scopes the local persistence key by brand and flow', () => {
    expect(storageKeyFor(BRAND, FLOW_ID)).toBe(
      'instasetter.flow-builder.v3.VendingPreneurs.lg-organic-dm'
    )
  })
})

describe('store reducer integrity', () => {
  it('recomputes variables when captures change', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)

    const next = reducer(state, {
      type: 'add_capture',
      id: 'opening',
      capture: { label: 'Phone', variable: 'contact.phone' },
    })

    expect(next.variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: 'contact',
          key: 'phone',
          capturedBy: 'opening',
        }),
      ])
    )
  })

  it('removes inbound branches and triggers when deleting a node', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)
    const next = reducer(
      {
        ...state,
        flow: {
          ...state.flow,
          nodes: state.flow.nodes.map((node) =>
            node.id === 'opening'
              ? {
                  ...node,
                  branches: [
                    ...node.branches,
                    {
                      id: 'br_delete',
                      label: 'To booking',
                      when: 'always',
                      target: 'booking',
                    },
                  ],
                }
              : node
          ),
        },
        triggers: [
          {
            id: 't_delete',
            name: 'Booking trigger',
            whenBlock: 'opening',
            afterMinutes: 5,
            cancelOnReply: true,
            mode: 'in_window_only',
            target: 'booking',
          },
          {
            id: 't_keep',
            name: 'Qualifier trigger',
            whenBlock: 'opening',
            afterMinutes: 5,
            cancelOnReply: true,
            mode: 'in_window_only',
            target: 'qualifier',
          },
        ],
      },
      { type: 'delete_node', id: 'booking' }
    )

    expect(next.flow.nodes.some((node) => node.id === 'booking')).toBe(false)
    expect(
      getNode(next, 'opening').branches.some(
        (branch) => branch.target === 'booking'
      )
    ).toBe(false)
    expect(next.triggers).toEqual([
      expect.objectContaining({ id: 't_keep', target: 'qualifier' }),
    ])
  })

  it('restores the selected version snapshot on rollback', () => {
    let state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)

    state = dirtyTrackingReducer(state, {
      type: 'update_block_field',
      id: 'opening',
      field: 'goal',
      value: 'Version one goal',
    })
    state = dirtyTrackingReducer(state, { type: 'publish' })
    state = dirtyTrackingReducer(state, {
      type: 'update_block_field',
      id: 'opening',
      field: 'goal',
      value: 'Current draft goal',
    })

    const rolledBack = reducer(state, { type: 'rollback', v: 1 })

    expect(getNode(rolledBack, 'opening').goal).toBe('Version one goal')
    expect(rolledBack.publishedVersion).toBe(1)
    expect(rolledBack.versions.find((version) => version.v === 1)?.status).toBe(
      'live'
    )
  })
})
