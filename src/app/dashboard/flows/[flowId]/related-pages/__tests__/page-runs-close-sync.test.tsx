/**
 * P3.04 — Inbox close-sync filter UI integration tests.
 *
 * These tests exercise the URL <-> state contract for the new
 * `closeSyncStatus` filter. They do NOT exhaustively test the existing
 * inbox surface (search / status / scope) — those are covered by manual
 * smoke and the underlying service tests in
 * `src/lib/services/__tests__/conversation-viewer.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../actions', () => ({
  fetchConversationAction: vi.fn().mockResolvedValue(null),
  fetchFlowRunsAction: vi.fn().mockResolvedValue([]),
}))

import PageRuns from '../page-runs'
import { fetchFlowRunsAction } from '../../actions'
import { B } from '../../directions/b-stage/palette'

function setSearchParams(params: string) {
  // jsdom's window.history doesn't honour pushState type checks — just write
  // the URL directly so getInitialParam() reads from window.location.search.
  window.history.replaceState(null, '', `/dashboard/conversations${params}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  setSearchParams('')
})

afterEach(() => {
  cleanup()
})

describe('PageRuns — closeSyncStatus URL state', () => {
  it('reads closeSyncStatus=sent from the URL on mount and forwards it to the action', async () => {
    setSearchParams('?closeSyncStatus=sent')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    // The filters memo runs synchronously on first render — the action
    // fires inside the useEffect that follows.
    await waitFor(() => {
      expect(fetchFlowRunsAction).toHaveBeenCalled()
    })
    expect(fetchFlowRunsAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ closeSyncStatus: 'sent' })
    )
  })

  it('treats an unknown URL value as "any" (Zod safety net)', async () => {
    setSearchParams('?closeSyncStatus=garbage')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    await waitFor(() => {
      expect(fetchFlowRunsAction).toHaveBeenCalled()
    })
    expect(fetchFlowRunsAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ closeSyncStatus: 'any' })
    )
  })

  it('renders the filter chip with a clear button when a non-default filter is active', () => {
    setSearchParams('?closeSyncStatus=sent')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    // The chip text shows the filter label.
    expect(screen.getByText(/close: sent to close/i)).toBeInTheDocument()
    // The clear button is keyboard-accessible (button + aria-label).
    expect(
      screen.getByRole('button', { name: /clear close sync filter/i })
    ).toBeInTheDocument()
  })

  it('does NOT render the chip when the filter is "any" (default)', () => {
    setSearchParams('')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    expect(
      screen.queryByRole('button', { name: /clear close sync filter/i })
    ).not.toBeInTheDocument()
  })

  it('clearing the chip removes the URL param and resets the dropdown', async () => {
    const user = userEvent.setup()
    setSearchParams('?closeSyncStatus=failed')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    const clearBtn = screen.getByRole('button', {
      name: /clear close sync filter/i,
    })

    await act(async () => {
      await user.click(clearBtn)
    })

    // URL has the param removed.
    await waitFor(() => {
      expect(window.location.search).not.toContain('closeSyncStatus')
    })

    // Action re-fired with closeSyncStatus="any" so the inbox repopulates.
    expect(fetchFlowRunsAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ closeSyncStatus: 'any' })
    )
  })

  it('changing the dropdown writes the URL param', async () => {
    const user = userEvent.setup()
    setSearchParams('')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    const select = screen.getByLabelText(/close sync status/i)

    await act(async () => {
      await user.selectOptions(select, 'failed')
    })

    await waitFor(() => {
      expect(window.location.search).toContain('closeSyncStatus=failed')
    })
    expect(fetchFlowRunsAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ closeSyncStatus: 'failed' })
    )
  })

  it('exposes all five filter options in the dropdown', () => {
    setSearchParams('')

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    const select = screen.getByLabelText(/close sync status/i)
    const options = Array.from(select.querySelectorAll('option')).map(
      (o) => o.value
    )
    expect(options).toEqual(['any', 'sent', 'failed', 'pending', 'not_synced'])
  })

  // The dashboard tile (P3.03) navigates here with `from`/`to` as ISO 8601
  // timestamps. The inbox's <input type="date"> expects YYYY-MM-DD. Verify
  // the deep-link contract — a click on the tile pre-populates the date
  // inputs without dropping the ISO portion onto the floor.
  it('coerces ISO timestamp from/to params into YYYY-MM-DD on mount', async () => {
    setSearchParams(
      '?closeSyncStatus=sent&from=2026-04-27T00%3A00%3A00.000Z&to=2026-04-29T12%3A34%3A00.000Z'
    )

    render(
      <PageRuns
        p={B}
        flowId="ig-organic-dm"
        defaultScope="all"
        flowScopeLabel="Instagram DM"
      />
    )

    const fromInput = screen.getByLabelText(/from date/i) as HTMLInputElement
    const toInput = screen.getByLabelText(/to date/i) as HTMLInputElement
    expect(fromInput.value).toBe('2026-04-27')
    expect(toInput.value).toBe('2026-04-29')

    // Action call still includes the closeSyncStatus filter.
    await waitFor(() => {
      expect(fetchFlowRunsAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ closeSyncStatus: 'sent' })
      )
    })
  })
})
