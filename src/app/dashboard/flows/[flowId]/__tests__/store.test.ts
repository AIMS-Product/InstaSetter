import { describe, expect, it } from 'vitest'
import {
  buildInitialState,
  buildInitialFlow,
  dirtyTrackingReducer,
  reducer,
} from '../store'
import type { FlowNode, Turn } from '../types'

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

  it('does not dirty the draft when a node move is a no-op', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)
    const opening = getNode(state, 'opening')

    const next = dirtyTrackingReducer(state, {
      type: 'move_node',
      id: 'opening',
      pos: { ...opening.pos },
    })

    expect(next).toBe(state)
    expect(next.dirtySincePublish).toBe(false)
  })

  it('tracks save status separately from content dirtiness', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)

    const next = dirtyTrackingReducer(state, {
      type: 'set_draft_sync_status',
      status: 'saved',
    })

    expect(next.draftSyncStatus).toBe('saved')
    expect(next.dirtySincePublish).toBe(false)
  })

  it('opens the source block routing tab when selecting a branch', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)
    const branch = getNode(state, 'opening').branches[0]!

    const next = reducer(state, {
      type: 'select_branch',
      selection: { fromId: 'opening', branchId: branch.id },
    })

    expect(next.selectedId).toBe('opening')
    expect(next.selectedBranch).toEqual({
      fromId: 'opening',
      branchId: branch.id,
    })
    expect(next.activeTab).toBe('routing')
  })

  it('can undo a deleted route', () => {
    const state = buildInitialState(BRAND, BOOKING_URL, FLOW_ID)
    const branch = getNode(state, 'opening').branches[0]!

    const deleted = dirtyTrackingReducer(state, {
      type: 'delete_branch',
      id: 'opening',
      branchId: branch.id,
    })

    expect(
      getNode(deleted, 'opening').branches.some(
        (candidate) => candidate.id === branch.id
      )
    ).toBe(false)
    expect(deleted.toast?.action).toBe('undo-delete')

    const restored = reducer(deleted, { type: 'undo_last_delete' })

    expect(
      getNode(restored, 'opening').branches.some(
        (candidate) => candidate.id === branch.id
      )
    ).toBe(true)
    expect(restored.toast?.message).toContain('Restored')
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

  it('infers booking on sim_receive when the turn includes a book_call', () => {
    const state = {
      ...buildInitialState(BRAND, BOOKING_URL, FLOW_ID),
      selectedId: 'opening' as FlowNode['id'],
    }

    const turn: Turn = {
      role: 'bot',
      text: 'On it.',
      t: 'now',
      toolCalls: [{ name: 'book_call', input: {} }],
    }

    const next = reducer(state, { type: 'sim_receive', turn })

    expect(next.simActiveBlock).toBe('booking')
  })

  it('keeps the selected block on sim_receive when no signal is present', () => {
    const state = {
      ...buildInitialState(BRAND, BOOKING_URL, FLOW_ID),
      selectedId: 'qualifier' as FlowNode['id'],
      simActiveBlock: 'qualifier' as FlowNode['id'],
    }

    const next = reducer(state, {
      type: 'sim_receive',
      turn: { role: 'bot', text: 'Where are you based?', t: 'now' },
    })

    expect(next.simActiveBlock).toBe('qualifier')
  })

  it('infers booking from a brand-booking-url substring in the reply text', () => {
    const state = {
      ...buildInitialState(BRAND, BOOKING_URL, FLOW_ID),
      selectedId: 'qualifier' as FlowNode['id'],
    }

    const next = reducer(state, {
      type: 'sim_receive',
      turn: {
        role: 'bot',
        text: `Here's the link: ${BOOKING_URL}`,
        t: 'now',
      },
    })

    expect(next.simActiveBlock).toBe('booking')
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
