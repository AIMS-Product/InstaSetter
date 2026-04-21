import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end_turn',
      }),
    }
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
