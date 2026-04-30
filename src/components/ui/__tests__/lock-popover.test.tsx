import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'

import type { LockEntry } from '@/lib/dashboard/flow-builder-locks'
import { LockPopover } from '../lock-popover'

const SAFETY_ENTRY: LockEntry = {
  id: 'opening.usCanadaGate',
  kind: 'safety',
  surface: 'US/Canada market gate',
  tooltip:
    'Only US and Canada are supported today. Out-of-region prospects are warmly declined.',
  escalation: null,
  highImpact: true,
}

const ADMIN_ENTRY: LockEntry = {
  id: 'qualifier.list',
  kind: 'admin',
  surface: 'Qualifier list',
  tooltip: 'The set of things to learn before booking.',
  escalation: 'Ask James in #dm-setter Slack to change this.',
  highImpact: false,
}

function PopoverHarness({
  entry,
  onClose = vi.fn(),
}: {
  entry: LockEntry
  onClose?: () => void
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={anchorRef} type="button">
        anchor
      </button>
      <LockPopover
        id="test-popover"
        entry={entry}
        anchorRef={anchorRef}
        onClose={onClose}
      />
    </>
  )
}

afterEach(() => {
  cleanup()
})

describe('LockPopover', () => {
  it('renders the popover with the catalog tooltip and surface', () => {
    render(<PopoverHarness entry={SAFETY_ENTRY} />)

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('US/Canada market gate')).toBeTruthy()
    expect(screen.getByText(/Only US and Canada/)).toBeTruthy()
  })

  it('shows the escalation note for admin-locked entries', () => {
    render(<PopoverHarness entry={ADMIN_ENTRY} />)

    expect(screen.getByText(/Ask James/)).toBeTruthy()
    expect(screen.getByText('Locked (admin)')).toBeTruthy()
  })

  it('omits the escalation note when the lock is safety-classified', () => {
    render(<PopoverHarness entry={SAFETY_ENTRY} />)

    expect(screen.queryByText(/Ask James/)).toBeNull()
    expect(screen.getByText('Locked')).toBeTruthy()
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<PopoverHarness entry={ADMIN_ENTRY} onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<PopoverHarness entry={ADMIN_ENTRY} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when a click lands outside the popover and anchor', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <div>
        <button type="button" data-testid="outside">
          outside
        </button>
        <PopoverHarness entry={SAFETY_ENTRY} onClose={onClose} />
      </div>
    )

    await user.click(screen.getByTestId('outside'))

    expect(onClose).toHaveBeenCalled()
  })
})
