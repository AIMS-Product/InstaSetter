import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { FlowStoreProvider, useFlowActions, useFlowState } from '../../../store'
import type { Turn } from '../../../types'
import { ActiveBlockLegend } from '../active-block-legend'

beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = () => {}
  }
})

afterEach(() => {
  cleanup()
})

function Wrap({ children }: { children: ReactNode }) {
  return (
    <FlowStoreProvider
      flowId="ig-organic-dm"
      brand="VendingPreneurs"
      bookingUrl="https://booking.vendingpreneurs.com/AK-DM"
    >
      {children}
    </FlowStoreProvider>
  )
}

// Test harness component that triggers a sim_receive turn so the legend has
// something to render. Mirrors how the real simulator dispatches.
function TriggerThenLegend({ turn }: { turn: Turn }) {
  const state = useFlowState()
  const actions = useFlowActions()
  return (
    <>
      <button
        type="button"
        onClick={() => {
          actions.simSend('hi')
          actions.simReceive(turn)
        }}
      >
        Fire turn
      </button>
      <span data-testid="active-block">{state.simActiveBlock ?? 'none'}</span>
      <span data-testid="selected-block">{state.selectedId ?? 'none'}</span>
      <ActiveBlockLegend />
    </>
  )
}

describe('ActiveBlockLegend', () => {
  it('renders nothing when no simulator turn has happened yet', () => {
    render(
      <Wrap>
        <ActiveBlockLegend />
      </Wrap>
    )
    expect(screen.queryByText(/currently replying as/i)).toBeNull()
  })

  it('renders the active block label after a sim_receive with a book_call', async () => {
    render(
      <Wrap>
        <TriggerThenLegend
          turn={{
            role: 'bot',
            text: 'On it.',
            t: 'now',
            toolCalls: [{ name: 'book_call', input: {} }],
          }}
        />
      </Wrap>
    )

    await userEvent.click(screen.getByRole('button', { name: /fire turn/i }))

    expect(
      await screen.findByText(/currently replying as/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Send the booking link')).toBeInTheDocument()
    expect(screen.getByTestId('active-block').textContent).toBe('booking')
  })

  it('selects the active block when clicked', async () => {
    render(
      <Wrap>
        <TriggerThenLegend
          turn={{
            role: 'bot',
            text: 'On it.',
            t: 'now',
            toolCalls: [{ name: 'capture_email', input: {} }],
          }}
        />
      </Wrap>
    )

    await userEvent.click(screen.getByRole('button', { name: /fire turn/i }))

    const legend = await screen.findByRole('button', {
      name: /currently replying as capture email/i,
    })

    await act(async () => {
      await userEvent.click(legend)
    })

    expect(screen.getByTestId('selected-block').textContent).toBe('email')
  })
})
