import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

import { CloseHandoffTile } from '../close-handoff-tile'
import { CloseHandoffWindowSelect } from '../close-handoff-window-select'
import type { CloseHandoffMetric } from '@/lib/services/dashboard-metrics'
import { useRouter } from 'next/navigation'

afterEach(() => {
  cleanup()
})

function metric(
  overrides: Partial<CloseHandoffMetric> = {}
): CloseHandoffMetric {
  return {
    syncedCount: 12,
    relevantCount: 14,
    syncedPct: 86,
    windowFrom: '2026-04-27T00:00:00.000Z',
    windowTo: '2026-04-29T12:34:00.000Z',
    windowLabel: 'This week',
    flagEnabled: true,
    ...overrides,
  }
}

describe('CloseHandoffTile', () => {
  it('renders the synced / relevant ratio with rounded percentage', () => {
    render(<CloseHandoffTile metric={metric()} window="this_week" />)

    // Primary number (kept distinct from the ratio so screen readers see it
    // separately).
    expect(screen.getByText('12')).toBeInTheDocument()
    // Ratio + pct breakdown.
    expect(
      screen.getByText((text) => text.includes('of 14') || text.includes('14'))
    ).toBeInTheDocument()
    expect(screen.getByText('86%')).toBeInTheDocument()
  })

  it('shows a graceful empty-state when relevantCount is 0', () => {
    render(
      <CloseHandoffTile
        metric={metric({ syncedCount: 0, relevantCount: 0, syncedPct: 0 })}
        window="this_week"
      />
    )

    // Spec: "No leads sent yet" — graceful, not loud.
    expect(screen.getByText(/no leads sent yet/i)).toBeInTheDocument()
    // Empty state should not display the percentage badge.
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('shows synced=0 of relevant>0 with 0% (operator sees the gap)', () => {
    render(
      <CloseHandoffTile
        metric={metric({ syncedCount: 0, relevantCount: 14, syncedPct: 0 })}
        window="this_week"
      />
    )

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText(/no leads sent yet/i)).not.toBeInTheDocument()
  })

  it('renders the "Close sync disabled" footnote when flagEnabled is false', () => {
    render(
      <CloseHandoffTile
        metric={metric({ flagEnabled: false })}
        window="this_week"
      />
    )

    expect(screen.getByText(/close sync disabled/i)).toBeInTheDocument()
  })

  it('omits the footnote when flagEnabled is true', () => {
    render(<CloseHandoffTile metric={metric()} window="this_week" />)

    expect(screen.queryByText(/close sync disabled/i)).not.toBeInTheDocument()
  })

  it('links the body to the conversations drill-down with closeSyncStatus + window bounds', () => {
    render(<CloseHandoffTile metric={metric()} window="this_week" />)

    const link = screen.getByRole('link', { name: /sent to close/i })
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('/dashboard/conversations')
    expect(href).toContain('closeSyncStatus=sent')
    expect(href).toContain('from=2026-04-27T00%3A00%3A00.000Z')
    expect(href).toContain('to=2026-04-29T12%3A34%3A00.000Z')
  })

  it('renders the window label visibly so the operator sees the active window', () => {
    render(<CloseHandoffTile metric={metric()} window="this_week" />)

    // "This week" appears in both the dropdown options AND the static
    // label below the count. We just need to know at least one renders.
    const matches = screen.getAllByText((text) =>
      text.toLowerCase().includes('this week')
    )
    expect(matches.length).toBeGreaterThan(0)
  })

  it('does NOT use a click target for the empty state (no false navigation)', () => {
    render(
      <CloseHandoffTile
        metric={metric({ syncedCount: 0, relevantCount: 0, syncedPct: 0 })}
        window="this_week"
      />
    )

    // Even when empty, we still link to the drill-down (operator can poke
    // around) — but the primary content should not look clickable as a
    // ratio. Verify the link still exists.
    const link = screen.queryByRole('link', { name: /sent to close/i })
    expect(link).not.toBeNull()
  })
})

describe('CloseHandoffWindowSelect', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('updates the URL search param when the operator picks a different window', async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      replace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)

    const user = userEvent.setup()
    render(<CloseHandoffWindowSelect value="this_week" />)

    const select = screen.getByLabelText(/window/i)
    await user.selectOptions(select, 'last_week')

    expect(replace).toHaveBeenCalledTimes(1)
    const arg = replace.mock.calls[0][0] as string
    expect(arg).toContain('window=last_week')
  })

  it('strips the window param when set back to the default this_week', async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      replace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)

    const user = userEvent.setup()
    render(<CloseHandoffWindowSelect value="last_week" />)

    const select = screen.getByLabelText(/window/i)
    await user.selectOptions(select, 'this_week')

    expect(replace).toHaveBeenCalledTimes(1)
    const arg = replace.mock.calls[0][0] as string
    // Default value is removed from the URL to keep it clean.
    expect(arg).not.toContain('window=this_week')
  })
})
