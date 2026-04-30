import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CloseSyncBadge } from '@/components/close-sync-badge'
import type { CloseSyncState } from '@/lib/services/conversation-viewer-types'

const baseSync: CloseSyncState = {
  status: 'sent',
  closeLeadId: 'lead_abc123',
  errorMessage: null,
  attemptedAt: '2026-04-29T01:00:00Z',
  attempts: 1,
}

describe('<CloseSyncBadge />', () => {
  it('renders nothing when sync is null', () => {
    const { container } = render(<CloseSyncBadge sync={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when status is skipped (operator opt-out / flag off)', () => {
    const { container } = render(
      <CloseSyncBadge
        sync={{
          ...baseSync,
          status: 'skipped',
          closeLeadId: null,
          attempts: 0,
        }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when status is pending and attempts is 0 (no work yet)', () => {
    const { container } = render(
      <CloseSyncBadge
        sync={{
          ...baseSync,
          status: 'pending',
          closeLeadId: null,
          attempts: 0,
        }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the sent state as an external link to Close', () => {
    render(<CloseSyncBadge sync={baseSync} />)
    const link = screen.getByRole('link', { name: /sent to close/i })
    expect(link).toHaveAttribute(
      'href',
      'https://app.close.com/lead/lead_abc123/'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer noopener')
  })

  it('renders the sent state as a non-link when closeLeadId is null (race during write)', () => {
    render(
      <CloseSyncBadge
        sync={{ ...baseSync, status: 'sent', closeLeadId: null }}
      />
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/sent to close/i)).toBeInTheDocument()
  })

  it('renders the failed state with the error message in title (truncated)', () => {
    const longError = 'a'.repeat(200) // > 140 char limit
    render(
      <CloseSyncBadge
        sync={{
          ...baseSync,
          status: 'failed',
          closeLeadId: null,
          errorMessage: longError,
          attempts: 5,
        }}
      />
    )
    const badge = screen.getByLabelText(/close sync failed/i)
    expect(badge).toBeInTheDocument()
    const title = badge.getAttribute('title') ?? ''
    expect(title.length).toBeLessThanOrEqual(140)
    expect(title.endsWith('…')).toBe(true)
  })

  it('renders the failed_permanent state with the same visual as failed', () => {
    render(
      <CloseSyncBadge
        sync={{
          ...baseSync,
          status: 'failed_permanent',
          closeLeadId: null,
          errorMessage: 'Final failure',
          attempts: 24,
        }}
      />
    )
    expect(screen.getByLabelText(/close sync failed/i)).toBeInTheDocument()
  })

  it('renders the pending state when attempts >= 1 (mid-retry)', () => {
    render(
      <CloseSyncBadge
        sync={{
          ...baseSync,
          status: 'pending',
          closeLeadId: null,
          attempts: 2,
          attemptedAt: '2026-04-29T05:00:00Z',
        }}
      />
    )
    expect(screen.getByLabelText(/syncing to close/i)).toBeInTheDocument()
  })

  it('keeps short error messages intact in title (no ellipsis)', () => {
    render(
      <CloseSyncBadge
        sync={{
          ...baseSync,
          status: 'failed',
          closeLeadId: null,
          errorMessage: 'Custom field cf_xyz unknown',
          attempts: 5,
        }}
      />
    )
    const badge = screen.getByLabelText(/close sync failed/i)
    expect(badge.getAttribute('title')).toContain('Custom field cf_xyz unknown')
  })
})
