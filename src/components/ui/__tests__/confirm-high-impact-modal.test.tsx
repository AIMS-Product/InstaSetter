import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmHighImpactModal } from '../confirm-high-impact-modal'

afterEach(() => {
  cleanup()
})

describe('ConfirmHighImpactModal — save mode', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmHighImpactModal
        open={false}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with default save copy when open', () => {
    render(
      <ConfirmHighImpactModal open onConfirm={vi.fn()} onDiscard={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/Confirm a high-impact change/)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /save and record version/i })
    ).toBeTruthy()
  })

  it('disables Confirm until a non-empty reason is entered', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmHighImpactModal open onConfirm={vi.fn()} onDiscard={vi.fn()} />
    )
    const confirm = screen.getByRole('button', {
      name: /save and record version/i,
    })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    const textarea = screen.getByLabelText(/why did you change this/i)
    await user.type(textarea, 'fixed the post-email line')
    expect(confirm.hasAttribute('disabled')).toBe(false)
  })

  it('passes the trimmed reason to onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ConfirmHighImpactModal open onConfirm={onConfirm} onDiscard={vi.fn()} />
    )
    await user.type(
      screen.getByLabelText(/why did you change this/i),
      '   updated copy   '
    )
    await user.click(
      screen.getByRole('button', { name: /save and record version/i })
    )
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('updated copy')
    })
  })

  it('calls onDiscard when the discard button is clicked', async () => {
    const onDiscard = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmHighImpactModal open onConfirm={vi.fn()} onDiscard={onDiscard} />
    )
    await user.click(screen.getByRole('button', { name: /discard change/i }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('calls onDiscard when Escape is pressed', async () => {
    const onDiscard = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmHighImpactModal open onConfirm={vi.fn()} onDiscard={onDiscard} />
    )
    await user.keyboard('{Escape}')
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('summarises changed field paths when provided', () => {
    render(
      <ConfirmHighImpactModal
        open
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        changedFieldSummary={[
          'flow.nodes.email.blockConfig.postEmailBehavior',
          'bot.persona',
        ]}
      />
    )
    const list = screen.getByRole('list', { name: /fields that will save/i })
    expect(list.textContent ?? '').toContain('postEmailBehavior')
    expect(list.textContent ?? '').toContain('bot.persona')
  })
})

describe('ConfirmHighImpactModal — restore mode', () => {
  it('renders restore copy when mode="restore"', () => {
    render(
      <ConfirmHighImpactModal
        open
        mode="restore"
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />
    )
    expect(screen.getByText(/Restore this version\?/)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /restore version/i })
    ).toBeTruthy()
  })

  it('allows confirm without a reason in restore mode', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ConfirmHighImpactModal
        open
        mode="restore"
        onConfirm={onConfirm}
        onDiscard={vi.fn()}
      />
    )
    const confirm = screen.getByRole('button', { name: /restore version/i })
    expect(confirm.hasAttribute('disabled')).toBe(false)
    await user.click(confirm)
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('')
    })
  })
})
