import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/utils/dedup-hash', () => ({
  generateDedupHash: vi.fn().mockReturnValue('hash_abc123'),
}))

import { storeMessage } from '@/lib/services/message'

function createMockClient() {
  const results: { data: unknown; error: unknown }[] = []
  let callIndex = 0

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(results[callIndex++])),
    maybeSingle: vi.fn(() => Promise.resolve(results[callIndex++])),
  }

  const from = vi.fn().mockReturnValue(chain)

  return {
    from,
    chain,
    pushResult(data: unknown, error: unknown = null) {
      results.push({ data, error })
    },
  }
}

describe('storeMessage', () => {
  let mock: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mock = createMockClient()
  })

  it('inserts new message when no duplicate exists', async () => {
    // Dedup check: no existing message found
    mock.pushResult(null)
    // Insert: returns new message
    mock.pushResult({ id: 'msg-1', role: 'user', content: 'Hi' })

    const result = await storeMessage(mock as never, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
      timestamp: '2026-04-09T10:00:00Z',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.isDuplicate).toBe(false)
      if (!result.isDuplicate) {
        expect(result.data).toBeDefined()
        expect(result.data.id).toBe('msg-1')
      }
    }
  })

  it('detects duplicate by inro_message_id', async () => {
    // Dedup check: finds existing message by inro_message_id
    mock.pushResult({ id: 'existing', inro_message_id: 'inro_1' })

    const result = await storeMessage(mock as never, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
      inroMessageId: 'inro_1',
      timestamp: '2026-04-09T10:00:00Z',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.isDuplicate).toBe(true)
    }
  })

  it('handles 23505 unique violation as duplicate', async () => {
    // Dedup check: no existing message
    mock.pushResult(null)
    // Insert: unique violation
    mock.pushResult(null, { code: '23505', message: 'unique violation' })

    const result = await storeMessage(mock as never, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
      timestamp: '2026-04-09T10:00:00Z',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.isDuplicate).toBe(true)
    }
  })

  it('stores assistant messages without inro_message_id', async () => {
    // Dedup check: no existing message
    mock.pushResult(null)
    // Insert: returns new assistant message
    mock.pushResult({ id: 'msg-2', role: 'assistant', content: 'Welcome!' })

    const result = await storeMessage(mock as never, {
      conversationId: 'c1',
      role: 'assistant',
      content: 'Welcome!',
      timestamp: '2026-04-09T10:00:00Z',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.isDuplicate).toBe(false)
      if (!result.isDuplicate) {
        expect(result.data.role).toBe('assistant')
      }
    }

    // Verify insert was called without inro_message_id
    const insertCall = mock.chain.insert.mock.calls[0]?.[0]
    expect(insertCall).not.toHaveProperty('inro_message_id')
  })

  it('returns error on insert failure (non-duplicate)', async () => {
    // Dedup check: no existing message
    mock.pushResult(null)
    // Insert: generic error
    mock.pushResult(null, { code: '42501', message: 'RLS violation' })

    const result = await storeMessage(mock as never, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
      timestamp: '2026-04-09T10:00:00Z',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('RLS violation')
    }
  })

  it('returns error on dedup check failure', async () => {
    // Dedup check: database error
    mock.pushResult(null, { message: 'Connection failed', code: '08000' })

    const result = await storeMessage(mock as never, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
      timestamp: '2026-04-09T10:00:00Z',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Connection failed')
    }
  })
})
