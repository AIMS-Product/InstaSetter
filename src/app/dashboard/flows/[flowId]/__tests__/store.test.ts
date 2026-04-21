import { describe, expect, it } from 'vitest'
import {
  buildInitialState,
  buildInitialFlow,
  dirtyTrackingReducer,
  reducer,
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

  it('collapses the palette when selecting or adding a block', () => {
    const state = {
      ...buildInitialState(BRAND, BOOKING_URL, FLOW_ID),
      paletteOpen: true,
    }

    const selected = reducer(state, { type: 'select_block', id: 'opening' })
    expect(selected.selectedId).toBe('opening')
    expect(selected.paletteOpen).toBe(false)

    const added = reducer(state, {
      type: 'add_node',
      node: {
        id: 'summary_2' as FlowNode['id'],
        type: 'summary',
        name: 'Summary 2',
        goal: 'Write a summary',
        guidance: '',
        examples: [],
        captures: [],
        branches: [],
        pos: { x: 3, y: 3 },
      },
    })
    expect(added.selectedId).toBe('summary_2')
    expect(added.paletteOpen).toBe(false)
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

  it('strips bot-level guardrails when hydrating persisted drafts', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)
    const next = reducer(state, {
      type: 'hydrate',
      state: {
        flow: {
          ...state.flow,
          nodes: state.flow.nodes.map((node) =>
            node.id === 'opening'
              ? {
                  ...node,
                  guardrails: [
                    ...(node.guardrails ?? []),
                    {
                      id: 'persona-global',
                      text: 'Keep it concise',
                      why: 'Persona rule',
                      source: 'src/lib/prompts/sections/persona.ts',
                    },
                  ],
                }
              : node
          ),
        },
      },
    })

    expect(
      getNode(next, 'opening').guardrails?.some(
        (guardrail) =>
          guardrail.source === 'src/lib/prompts/sections/persona.ts'
      )
    ).toBe(false)
  })
})
