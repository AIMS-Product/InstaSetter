import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { FlowStoreProvider } from '../../../store'
import BSimFloat from '../sim-float'

const actionSpy = vi.fn()

vi.mock('../simulator-actions', () => ({
  simulateReplyAction: (...args: unknown[]) => actionSpy(...args),
}))

// jsdom doesn't implement Element.scrollTo — the simulator auto-scrolls on
// conversation updates, so stub it before any component mounts.
beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = () => {}
  }
})

function Wrap({ children }: { children: ReactNode }) {
  return (
    <FlowStoreProvider flowId="lg-organic-dm" brand="VendingPreneurs">
      {children}
    </FlowStoreProvider>
  )
}

async function typeAndSend(text: string) {
  const input = await screen.findByPlaceholderText(/write a prospect dm/i)
  await userEvent.type(input, text)
  const send = screen.getByRole('button', { name: /send/i })
  await userEvent.click(send)
}

describe('BSimFloat — overrides pass-through', () => {
  beforeEach(() => {
    actionSpy.mockReset()
    actionSpy.mockResolvedValue({
      success: true,
      data: { replyText: 'ok', toolCalls: [], truncated: false },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('passes edited goal through as overrides.goal', async () => {
    render(
      <Wrap>
        <BSimFloat
          open
          onClose={() => {}}
          overrides={{ activeBlockType: 'opening', goal: 'Ask for city' }}
        />
      </Wrap>
    )
    await typeAndSend('hello')
    expect(actionSpy).toHaveBeenCalledTimes(1)
    const call = actionSpy.mock.calls[0]?.[0]
    expect(call).toMatchObject({
      brand: 'VendingPreneurs',
      overrides: { activeBlockType: 'opening', goal: 'Ask for city' },
    })
  })

  it('passes edited guidance through as overrides.guidance', async () => {
    render(
      <Wrap>
        <BSimFloat
          open
          onClose={() => {}}
          overrides={{
            activeBlockType: 'opening',
            guidance: 'Only one question, peer tone.',
          }}
        />
      </Wrap>
    )
    await typeAndSend('hi')
    expect(actionSpy).toHaveBeenCalledTimes(1)
    const call = actionSpy.mock.calls[0]?.[0]
    expect(call?.overrides).toMatchObject({
      activeBlockType: 'opening',
      guidance: 'Only one question, peer tone.',
    })
    expect(call?.overrides?.goal).toBeUndefined()
  })

  it('passes activeBlockType only when no edits are present', async () => {
    render(
      <Wrap>
        <BSimFloat
          open
          onClose={() => {}}
          overrides={{ activeBlockType: 'qualifier' }}
        />
      </Wrap>
    )
    await typeAndSend('hey')
    const call = actionSpy.mock.calls[0]?.[0]
    expect(call?.overrides).toEqual({ activeBlockType: 'qualifier' })
  })

  it('omits overrides entirely when no block is active', async () => {
    render(
      <Wrap>
        <BSimFloat open onClose={() => {}} overrides={null} />
      </Wrap>
    )
    await typeAndSend('yo')
    const call = actionSpy.mock.calls[0]?.[0]
    expect(call).not.toHaveProperty('overrides')
  })

  it('recovers when the server action rejects', async () => {
    actionSpy
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        success: true,
        data: { replyText: 'retry worked', toolCalls: [], truncated: false },
      })

    render(
      <Wrap>
        <BSimFloat open onClose={() => {}} overrides={null} />
      </Wrap>
    )

    await typeAndSend('hello')
    await screen.findByText(/simulator request failed\. please try again\./i)

    const input = screen.getByPlaceholderText(/write a prospect dm/i)
    const send = screen.getByRole('button', { name: /send/i })
    expect((input as HTMLInputElement).disabled).toBe(false)
    expect((send as HTMLButtonElement).disabled).toBe(true)

    await userEvent.type(input, 'retry')
    await userEvent.click(send)

    await screen.findByText('retry worked')
    expect(actionSpy).toHaveBeenCalledTimes(2)
  })

  it('auto-sends a starter pill on click without filling the input', async () => {
    render(
      <Wrap>
        <BSimFloat open onClose={() => {}} overrides={null} />
      </Wrap>
    )

    const pill = screen.getByRole('button', { name: 'vend' })
    await userEvent.click(pill)

    await waitFor(() => expect(actionSpy).toHaveBeenCalledTimes(1))
    expect(actionSpy.mock.calls[0]?.[0]?.messages).toEqual([
      { role: 'user', content: 'vend' },
    ])
    const input = screen.getByPlaceholderText(
      /write a prospect dm/i
    ) as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('does not replay prior system errors in retry history', async () => {
    actionSpy
      .mockResolvedValueOnce({
        success: false,
        error: 'Claude call failed',
      })
      .mockResolvedValueOnce({
        success: true,
        data: { replyText: 'all good', toolCalls: [], truncated: false },
      })

    render(
      <Wrap>
        <BSimFloat open onClose={() => {}} overrides={null} />
      </Wrap>
    )

    await typeAndSend('hello')
    await screen.findByText(/claude call failed/i)

    await typeAndSend('retry')

    await waitFor(() => expect(actionSpy).toHaveBeenCalledTimes(2))
    expect(actionSpy.mock.calls[1]?.[0]?.messages).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'user', content: 'retry' },
    ])
  })
})
