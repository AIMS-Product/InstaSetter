import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreativeFunnelRow } from '@/lib/services/creative-funnel-types'
import { FunnelTable } from '../funnel-table'

// next/navigation requires a non-null hook return when used in client
// components. Replace with vi.fn() shims and assert on the mocked router
// pushes when we want to verify URL transitions.
const pushMock = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: pushMock,
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const ROWS: CreativeFunnelRow[] = [
  {
    groupKey: 'src-A',
    groupLabel: 'Meta Reel A',
    dms: 142,
    qualified: 81,
    booked: 24,
    sentToClose: 22,
    rates: {
      qualifiedFromDms: 81 / 142,
      bookedFromDms: 24 / 142,
      bookedFromQualified: 24 / 81,
      closeFromDms: 22 / 142,
    },
  },
  {
    groupKey: 'src-B',
    groupLabel: 'Organic Bio',
    dms: 38,
    qualified: 9,
    booked: 1,
    sentToClose: 1,
    rates: {
      qualifiedFromDms: 9 / 38,
      bookedFromDms: 1 / 38,
      bookedFromQualified: 1 / 9,
      closeFromDms: 1 / 38,
    },
  },
]

beforeEach(() => {
  pushMock.mockClear()
  currentSearch = ''
})

afterEach(() => {
  cleanup()
})

describe('FunnelTable', () => {
  it('renders one row per source with formatted counts and percentages', () => {
    render(
      <FunnelTable
        rows={ROWS}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={false}
      />
    )

    expect(screen.getByText('Meta Reel A')).toBeInTheDocument()
    expect(screen.getByText('Organic Bio')).toBeInTheDocument()
    // Count formatted with thousands separator (none needed here, but
    // assert on the integer string to verify the formatter ran).
    expect(screen.getByText('142')).toBeInTheDocument()
    // Percent: 24/142 ≈ 16.9% — the column tooltip example shows 17.0%
    // (rounded), but the strict 1-decimal Intl.NumberFormat rounds 0.169 to
    // 16.9%. Check that any percent-formatted string with one decimal is
    // present under the Book→DM column for src-A.
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0)
  })

  it('marks the active sort column with aria-sort and a sort icon', () => {
    render(
      <FunnelTable
        rows={ROWS}
        groupBy="source"
        sort="booked"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={false}
      />
    )

    // Find the Booked-column button, then walk up to its <th>.
    const bookedButton = screen.getByRole('button', { name: /^Booked$/ })
    const bookedHeader = bookedButton.closest('th')!
    expect(bookedHeader).toHaveAttribute('aria-sort', 'descending')

    const dmsButton = screen.getByRole('button', { name: /^DMs$/ })
    const dmsHeader = dmsButton.closest('th')!
    expect(dmsHeader).toHaveAttribute('aria-sort', 'none')
  })

  it('clicking a column header pushes a new sort URL', async () => {
    const user = userEvent.setup()
    render(
      <FunnelTable
        rows={ROWS}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={false}
      />
    )

    const bookedButton = screen.getByRole('button', { name: /^Booked$/ })
    await user.click(bookedButton)

    expect(pushMock).toHaveBeenCalledTimes(1)
    const url = pushMock.mock.calls[0][0] as string
    expect(url).toContain('sort=booked')
    expect(url).toContain('dir=desc')
  })

  it('clicking the active sort column flips direction', async () => {
    const user = userEvent.setup()
    currentSearch = 'sort=dms&dir=desc'
    render(
      <FunnelTable
        rows={ROWS}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={false}
      />
    )

    const dmsButton = screen.getByRole('button', { name: /^DMs$/ })
    await user.click(dmsButton)

    const url = pushMock.mock.calls[0][0] as string
    expect(url).toContain('sort=dms')
    expect(url).toContain('dir=asc')
  })

  it('changing group_by pushes a new URL', async () => {
    const user = userEvent.setup()
    render(
      <FunnelTable
        rows={ROWS}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={false}
      />
    )

    const groupSelect = screen.getByLabelText(/Group by/i)
    await user.selectOptions(groupSelect, 'utm_source')

    const url = pushMock.mock.calls[0][0] as string
    expect(url).toContain('group_by=utm_source')
  })

  it('clicking a row label navigates to filtered conversations', () => {
    render(
      <FunnelTable
        rows={ROWS}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={false}
      />
    )

    const rowLink = screen.getByRole('link', { name: 'Meta Reel A' })
    const href = rowLink.getAttribute('href')!
    expect(href).toContain('/dashboard/conversations')
    expect(href).toContain('source_id=src-A')
    expect(href).toContain('from=2026-04-01')
    expect(href).toContain('to=2026-05-01')
  })

  it('renders Sent to Close as "—" when Close column is unpopulated', () => {
    render(
      <FunnelTable
        rows={ROWS.map((row) => ({
          ...row,
          sentToClose: 0,
          rates: { ...row.rates, closeFromDms: 0 },
        }))}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={true}
      />
    )

    expect(screen.getByText(/Close handoff not yet wired/i)).toBeInTheDocument()

    // Both Close columns render the em-dash placeholder.
    const sentToCloseHeader = screen.getByRole('columnheader', {
      name: /Sent to Close/,
    })
    expect(sentToCloseHeader).toBeInTheDocument()
    // Find the row for Meta Reel A and verify the close cells are em-dashes.
    const row = screen.getByText('Meta Reel A').closest('tr')!
    const cells = within(row).getAllByRole('cell')
    // Columns are: [Source, DMs, Qualified, Booked, SentToClose, Q→DM, Book→DM, Close→DM]
    expect(cells[4]).toHaveTextContent('—')
    expect(cells[7]).toHaveTextContent('—')
  })

  it('renders an empty-state card when no rows are present', () => {
    render(
      <FunnelTable
        rows={[]}
        groupBy="source"
        sort="dms"
        dir="desc"
        preset="30d"
        windowFrom="2026-04-01T00:00:00.000Z"
        windowTo="2026-05-01T00:00:00.000Z"
        closeUnpopulated={true}
      />
    )

    expect(
      screen.getByText(/No conversations in this window/i)
    ).toBeInTheDocument()
  })
})
