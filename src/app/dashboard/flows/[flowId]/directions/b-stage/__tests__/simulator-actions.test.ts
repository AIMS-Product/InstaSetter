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
