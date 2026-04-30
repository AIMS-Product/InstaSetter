import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

// Mock service-role to avoid env var validation at import time. This card's
// async branch isn't exercised in tests — only `renderWeeklySummaryCard`,
// the synchronous renderer, is.
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import {
  renderWeeklySummaryCard,
  type WeeklySummaryProps,
} from '@/app/dashboard/_components/weekly-summary-card'
import type { WeeklySummary } from '@/lib/services/weekly-summary'

const baseSummary: WeeklySummary = {
  current: {
    label: 'Apr 27 - May 3',
    dms: 124,
    qualified: 38,
    booked: 12,
    sentToClose: 10,
    rates: {
      qualifiedFromDms: 38 / 124,
      bookedFromDms: 12 / 124,
      closeFromDms: 10 / 124,
    },
  },
  previous: {
    label: 'Apr 20 - 26',
    dms: 130,
    qualified: 40,
    booked: 8,
    sentToClose: 8,
    rates: {
      qualifiedFromDms: 40 / 130,
      bookedFromDms: 8 / 130,
      closeFromDms: 8 / 130,
    },
  },
  dailyDms: [12, 18, 22, 30, 25, 10, 7],
  closeHandoffShipped: true,
  timeZone: 'Australia/Adelaide',
}

function renderCard(overrides: Partial<WeeklySummaryProps> = {}) {
  return render(
    renderWeeklySummaryCard({ summary: baseSummary, ...overrides })
  )
}

describe('WeeklySummaryCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the headline rate, the date range, and the funnel counts', () => {
    const { getByText, container } = renderCard()
    expect(getByText('This week')).toBeInTheDocument()
    expect(getByText('Apr 27 - May 3')).toBeInTheDocument()
    // Headline rate: 10 / 124 = 8.06% → 8.1%
    expect(container.textContent).toContain('8.1%')
    expect(container.textContent).toContain('DM → Close')
    // Funnel
    expect(container.textContent).toContain('124')
    expect(container.textContent).toContain('38')
    expect(container.textContent).toContain('12')
    expect(container.textContent).toContain('10')
  })

  it('renders the WoW pp delta with the up tone when this week is higher', () => {
    const { getByText, container } = renderCard()
    // 10/124 - 8/130 = 8.06% - 6.15% = +1.9pp
    expect(getByText(/\+1\.9pp/)).toBeInTheDocument()
    expect(container.querySelector('[data-wow-tone="up"]')).toBeInTheDocument()
  })

  it('renders the WoW pp delta with the down tone when this week is lower', () => {
    const { container } = renderCard({
      summary: {
        ...baseSummary,
        current: {
          ...baseSummary.current,
          rates: { ...baseSummary.current.rates, closeFromDms: 0.04 },
        },
      },
    })
    // 4% - ~6.15% = -2.2pp
    expect(container.textContent).toMatch(/-2\.2pp/)
    expect(container.querySelector('[data-wow-tone="down"]')).toBeInTheDocument()
  })

  it('hides the WoW chip when previous week had zero DMs', () => {
    const { container } = renderCard({
      summary: {
        ...baseSummary,
        previous: {
          ...baseSummary.previous,
          dms: 0,
          rates: {
            qualifiedFromDms: null,
            bookedFromDms: null,
            closeFromDms: null,
          },
        },
      },
    })
    expect(container.querySelector('[data-wow-tone]')).toBeNull()
  })

  it('renders the empty state copy when current week has zero DMs', () => {
    const { getByText } = renderCard({
      summary: {
        ...baseSummary,
        current: {
          ...baseSummary.current,
          dms: 0,
          qualified: 0,
          booked: 0,
          sentToClose: 0,
          rates: {
            qualifiedFromDms: null,
            bookedFromDms: null,
            closeFromDms: null,
          },
        },
        dailyDms: [0, 0, 0, 0, 0, 0, 0],
      },
    })
    expect(getByText(/Quiet week so far/i)).toBeInTheDocument()
  })

  it('shows the Close-handoff coming-soon chip when handoff has not shipped', () => {
    const { getByText } = renderCard({
      summary: { ...baseSummary, closeHandoffShipped: false },
    })
    expect(getByText(/Close handoff coming soon/i)).toBeInTheDocument()
  })

  it('hides the Close-handoff chip when handoff is live', () => {
    const { queryByText } = renderCard({
      summary: { ...baseSummary, closeHandoffShipped: true },
    })
    expect(queryByText(/Close handoff coming soon/i)).toBeNull()
  })

  it('renders the sparkline svg with seven bars', () => {
    const { container } = renderCard()
    const bars = container.querySelectorAll('rect[data-bar]')
    expect(bars).toHaveLength(7)
  })

  it('attaches a tooltip explaining the headline rate', () => {
    const { container } = renderCard()
    // The tooltip is rendered as a `title` element under the headline number,
    // and the headline is wrapped in a focusable element so keyboard users
    // can read it.
    const tooltipHost = container.querySelector('[data-rate-tooltip]')
    expect(tooltipHost).not.toBeNull()
    expect(tooltipHost?.getAttribute('title')).toMatch(
      /percentage of this week's DMs/i
    )
  })
})
