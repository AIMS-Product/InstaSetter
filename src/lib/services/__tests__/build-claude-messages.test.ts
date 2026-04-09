import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildClaudeMessages } from '@/lib/services/message'

function createMockClient() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(),
  }

  const from = vi.fn().mockReturnValue(chain)

  return { from, chain }
}

describe('buildClaudeMessages', () => {
  let mock: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mock = createMockClient()
  })

  it('loads and formats messages chronologically', async () => {
    mock.chain.order.mockResolvedValueOnce({
      data: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Welcome!' },
        { role: 'user', content: 'I have 10 machines' },
      ],
      error: null,
    })

    const result = await buildClaudeMessages(mock as never, 'conv-1')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toHaveLength(3)
    expect(result.data[0]).toEqual({ role: 'user', content: 'Hi' })
    expect(result.data[1]).toEqual({ role: 'assistant', content: 'Welcome!' })
    expect(result.data[2]).toEqual({
      role: 'user',
      content: 'I have 10 machines',
    })
  })

  it('returns empty array for new conversation', async () => {
    mock.chain.order.mockResolvedValueOnce({ data: [], error: null })

    const result = await buildClaudeMessages(mock as never, 'conv-new')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual([])
  })

  it('selects only role and content columns', async () => {
    mock.chain.order.mockResolvedValueOnce({ data: [], error: null })

    await buildClaudeMessages(mock as never, 'conv-1')

    expect(mock.from).toHaveBeenCalledWith('messages')
    expect(mock.chain.select).toHaveBeenCalledWith('role, content')
  })

  it('orders by created_at ascending', async () => {
    mock.chain.order.mockResolvedValueOnce({ data: [], error: null })

    await buildClaudeMessages(mock as never, 'conv-1')

    expect(mock.chain.order).toHaveBeenCalledWith('created_at', {
      ascending: true,
    })
  })

  it('filters by conversation_id', async () => {
    mock.chain.order.mockResolvedValueOnce({ data: [], error: null })

    await buildClaudeMessages(mock as never, 'conv-42')

    expect(mock.chain.eq).toHaveBeenCalledWith('conversation_id', 'conv-42')
  })

  it('returns error on database failure', async () => {
    mock.chain.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection lost' },
    })

    const result = await buildClaudeMessages(mock as never, 'conv-1')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('Connection lost')
  })
})
