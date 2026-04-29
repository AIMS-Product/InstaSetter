import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SurfaceBadge } from '../surface-badge'

afterEach(() => {
  cleanup()
})

describe('<SurfaceBadge>', () => {
  it('renders the LIVE state with the success tone and explicit label', () => {
    render(<SurfaceBadge state="LIVE" detail="Production traffic is live." />)

    const badge = screen.getByRole('status', { name: /live/i })
    expect(badge).toHaveTextContent('Live')
    // success tone token from the chip palette.
    expect(badge.className).toContain('bg-[#E6F4EA]')
    expect(badge.className).toContain('text-[#1F6B3A]')
  })

  it('renders the READ_ONLY state with neutral tone', () => {
    render(<SurfaceBadge state="READ_ONLY" detail="No edits yet." />)
    const badge = screen.getByRole('status', { name: /read-only/i })
    expect(badge).toHaveTextContent('Read-only')
    expect(badge.className).toContain('bg-[#EEEFF3]')
    expect(badge.className).toContain('text-[#4B4A5E]')
  })

  it('renders the COMING_SOON state with the accent tone', () => {
    render(<SurfaceBadge state="COMING_SOON" detail="Not yet wired up." />)
    const badge = screen.getByRole('status', { name: /coming soon/i })
    expect(badge).toHaveTextContent('Coming soon')
    expect(badge.className).toContain('bg-[#EDECF9]')
    expect(badge.className).toContain('text-[#2E297A]')
  })

  it('renders the UNDER_CONSTRUCTION state with the warn tone', () => {
    render(
      <SurfaceBadge
        state="UNDER_CONSTRUCTION"
        detail="Some controls work, others are placeholders."
      />
    )
    const badge = screen.getByRole('status', { name: /under construction/i })
    expect(badge).toHaveTextContent('Under construction')
    expect(badge.className).toContain('bg-[#FBE7D9]')
    expect(badge.className).toContain('text-[#8B4316]')
  })

  it('exposes the detail copy via aria-describedby for screen readers', () => {
    render(
      <SurfaceBadge
        state="READ_ONLY"
        detail="The transcript is real but you cannot reply from here."
      />
    )
    const badge = screen.getByRole('status', { name: /read-only/i })
    const describedById = badge.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    const describedBy = document.getElementById(describedById ?? '')
    expect(describedBy).not.toBeNull()
    expect(describedBy?.textContent).toBe(
      'The transcript is real but you cannot reply from here.'
    )
  })

  it('honours the `title` attribute so the detail surfaces on hover too', () => {
    render(<SurfaceBadge state="LIVE" detail="It is live." />)
    const badge = screen.getByRole('status', { name: /live/i })
    expect(badge.getAttribute('title')).toBe('It is live.')
  })

  it('falls back to the canonical state display when `display` is omitted', () => {
    render(<SurfaceBadge state="UNDER_CONSTRUCTION" detail="Some bits work." />)
    expect(screen.getByText('Under construction')).toBeInTheDocument()
  })

  it('respects an explicit `display` override', () => {
    render(
      <SurfaceBadge
        state="READ_ONLY"
        display="Reference only"
        detail="Saved values only."
      />
    )
    expect(screen.getByText('Reference only')).toBeInTheDocument()
  })

  it('omits aria-describedby when withDescription is false', () => {
    render(
      <SurfaceBadge state="LIVE" detail="Live." withDescription={false} />
    )
    const badge = screen.getByRole('status', { name: /live/i })
    expect(badge.getAttribute('aria-describedby')).toBeNull()
  })

  it('still renders a stable role+label without a detail', () => {
    render(<SurfaceBadge state="LIVE" />)
    const badge = screen.getByRole('status', { name: /live/i })
    expect(badge.getAttribute('aria-describedby')).toBeNull()
  })
})
