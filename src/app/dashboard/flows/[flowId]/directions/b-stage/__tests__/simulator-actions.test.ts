import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { createSpy } = vi.hoisted(() => ({
  createSpy: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'ok' }],
    stop_reason: 'end_turn',
  }),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: createSpy }
  },
}))

import { simulateReplyAction } from '../simulator-actions'
import * as setterV2 from '@/lib/prompts/setter-v2'
import * as compileBlockModule from '@/lib/prompts/compile-block/compile-block'

describe('simulateReplyAction — input schema', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey
    }
  })

  it('accepts overrides with activeBlockType', async () => {
    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening' },
    })
    expect(result.success).toBe(true)
  })

  it('accepts input without overrides (backwards compatible)', async () => {
    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown activeBlockType', async () => {
    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'bogus' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid simulator input')
    }
  })

  it('rejects non-string goal in overrides', async () => {
    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening', goal: 123 },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid simulator input')
    }
  })
})

describe('simulateReplyAction — compile flag routing', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY
  const originalFlag = process.env.NEXT_PUBLIC_FLOW_COMPILE

  beforeEach(() => {
    createSpy.mockClear()
    vi.restoreAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey
    }
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_FLOW_COMPILE
    } else {
      process.env.NEXT_PUBLIC_FLOW_COMPILE = originalFlag
    }
  })

  it('uses buildSystemPrompt when flag is off (explicit "false")', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'false'
    const buildSpy = vi.spyOn(setterV2, 'buildSystemPrompt')
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening' },
    })

    expect(result.success).toBe(true)
    expect(buildSpy).toHaveBeenCalled()
    expect(compileSpy).not.toHaveBeenCalled()
  })

  it('uses buildSystemPrompt when flag is unset', async () => {
    delete process.env.NEXT_PUBLIC_FLOW_COMPILE
    const buildSpy = vi.spyOn(setterV2, 'buildSystemPrompt')
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening' },
    })

    expect(result.success).toBe(true)
    expect(buildSpy).toHaveBeenCalled()
    expect(compileSpy).not.toHaveBeenCalled()
  })

  it('uses compileBlock with overrides when flag is on', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'true'
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening', goal: 'Ask for city' },
    })

    expect(result.success).toBe(true)
    expect(compileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'VendingPreneurs',
        overrides: expect.objectContaining({
          activeBlockType: 'opening',
          goal: 'Ask for city',
        }),
      })
    )
  })

  it('uses compileBlock without overrides when flag is on', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'true'
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.success).toBe(true)
    expect(compileSpy).toHaveBeenCalledTimes(1)
    const call = compileSpy.mock.calls[0]?.[0]
    expect(call?.overrides).toBeUndefined()
  })

  it('treats truthy-looking non-"true" strings (e.g. "1") as off', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = '1'
    const buildSpy = vi.spyOn(setterV2, 'buildSystemPrompt')
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening' },
    })

    expect(result.success).toBe(true)
    expect(buildSpy).toHaveBeenCalled()
    expect(compileSpy).not.toHaveBeenCalled()
  })
})

describe('simulateReplyAction — booking URL and transcript normalization', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY
  const originalFlag = process.env.NEXT_PUBLIC_FLOW_COMPILE
  const originalBookingUrl = process.env.BOOKING_URL

  beforeEach(() => {
    createSpy.mockClear()
    vi.restoreAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey
    }
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_FLOW_COMPILE
    } else {
      process.env.NEXT_PUBLIC_FLOW_COMPILE = originalFlag
    }
    if (originalBookingUrl === undefined) {
      delete process.env.BOOKING_URL
    } else {
      process.env.BOOKING_URL = originalBookingUrl
    }
  })

  it('falls back to the page booking URL when BOOKING_URL is blank', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'false'
    process.env.BOOKING_URL = '   '

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.success).toBe(true)
    expect(createSpy.mock.calls.at(-1)?.[0].system).toContain(
      'https://booking.vendingpreneurs.com/AK-DM'
    )
  })

  it('trims long transcripts instead of rejecting them', async () => {
    const messages = Array.from({ length: 61 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message-${index}`,
    }))

    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages,
    })

    expect(result.success).toBe(true)
    const requestMessages = createSpy.mock.calls.at(-1)?.[0].messages as Array<{
      role: string
      content: string
    }>
    expect(requestMessages.length).toBeLessThanOrEqual(40)
    expect(requestMessages[0]?.role).toBe('user')
    expect(requestMessages.at(-1)).toMatchObject({
      role: 'user',
      content: 'message-60',
    })
  })
})

describe('end-to-end — edited goal reaches Claude', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY
  const originalFlag = process.env.NEXT_PUBLIC_FLOW_COMPILE
  const EDITED_GOAL = 'Greet warmly and ask for their city.'

  async function runWithFlag(flag: 'true' | 'false'): Promise<string> {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = flag
    const result = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening', goal: EDITED_GOAL },
    })
    expect(result.success).toBe(true)
    return createSpy.mock.calls.at(-1)?.[0].system as string
  }

  beforeEach(() => {
    createSpy.mockClear()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey
    }
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_FLOW_COMPILE
    } else {
      process.env.NEXT_PUBLIC_FLOW_COMPILE = originalFlag
    }
  })

  it('flag on: edited goal appears in Claude system prompt', async () => {
    const system = await runWithFlag('true')
    expect(system).toContain(EDITED_GOAL)
  })

  it('flag on: Active Block Directive heading appears in Claude system prompt', async () => {
    const system = await runWithFlag('true')
    expect(system).toContain('## Active Block Directive')
  })

  it('flag off: edited goal does NOT appear in Claude system prompt', async () => {
    const system = await runWithFlag('false')
    expect(system).not.toContain(EDITED_GOAL)
  })

  it('flag off: Active Block Directive heading does NOT appear in Claude system prompt', async () => {
    const system = await runWithFlag('false')
    expect(system).not.toContain('## Active Block Directive')
  })
})
