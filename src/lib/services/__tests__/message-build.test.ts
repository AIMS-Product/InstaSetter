import { describe, it, expect, beforeEach } from 'vitest'
import { createMockClient } from '@/test/helpers'
import { buildClaudeMessages } from '@/lib/services/message'

describe('buildClaudeMessages', () => {
  let client: ReturnType<typeof createMockClient>

  beforeEach(() => {
    client = createMockClient()
  })

  it('loads and formats messages chronologically', async () => {
    client.order.mockResolvedValueOnce({
      data: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Welcome!' },
      ],
      error: null,
    })

    const result = await buildClaudeMessages(client as never, 'conv-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ role: 'user', content: 'Hi' })
      expect(result.data[1]).toEqual({
        role: 'assistant',
        content: 'Welcome!',
      })
    }
  })

  it('returns empty array for new conversation', async () => {
    client.order.mockResolvedValueOnce({ data: [], error: null })

    const result = await buildClaudeMessages(client as never, 'conv-new')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual([])
    }
  })

  it('selects only role and content', async () => {
    client.order.mockResolvedValueOnce({ data: [], error: null })

    await buildClaudeMessages(client as never, 'conv-1')

    expect(client.select).toHaveBeenCalledWith('role, content')
  })

  it('orders by created_at ascending', async () => {
    client.order.mockResolvedValueOnce({ data: [], error: null })

    await buildClaudeMessages(client as never, 'conv-1')

    expect(client.order).toHaveBeenCalledWith('created_at', {
      ascending: true,
    })
  })

  it('returns error on database failure', async () => {
    client.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    })

    const result = await buildClaudeMessages(client as never, 'conv-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('DB error')
    }
  })
})
