import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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
    <FlowStoreProvider brand="VendingPreneurs">{children}</FlowStoreProvider>
  )
}

async function typeAndSend(text: string) {
  const input = await screen.findByPlaceholderText(/type as prospect/i)
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
})
