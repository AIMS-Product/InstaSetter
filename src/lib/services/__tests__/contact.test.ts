import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertContact } from '@/lib/services/contact'
import type { InroWebhookPayload } from '@/types/inro'

// Minimal mock that tracks Supabase chained method calls
function createMockClient() {
  const results: { data: unknown; error: unknown }[] = []
  let callIndex = 0

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(results[callIndex++])),
    maybeSingle: vi.fn(() => Promise.resolve(results[callIndex++])),
  }

  const from = vi.fn().mockReturnValue(chain)

  return {
    from,
    chain,
    /** Queue the next result that .single() or .maybeSingle() will return */
    pushResult(data: unknown, error: unknown = null) {
      results.push({ data, error })
    },
  }
}

const BASE_PAYLOAD: InroWebhookPayload = {
  contact_id: 'inro_123',
  username: 'testuser',
  message: 'Hey there!',
  timestamp: '2026-04-09T10:00:00Z',
  source: 'organic_dm',
}

describe('upsertContact', () => {
  let mock: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mock = createMockClient()
  })

  it('creates a new contact when inro_contact_id not found', async () => {
    // First call: lookup returns null (contact not found)
    mock.pushResult(null)
    // Second call: insert returns the new contact
    mock.pushResult({
      id: 'uuid-1',
      inro_contact_id: 'inro_123',
      instagram_handle: 'testuser',
      source: 'organic_dm',
    })

    const result = await upsertContact(mock as never, BASE_PAYLOAD)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toBeDefined()
    expect(result.data.inro_contact_id).toBe('inro_123')
    expect(mock.from).toHaveBeenCalledWith('contacts')
    expect(mock.chain.insert).toHaveBeenCalled()
  })

  it('sets source from webhook payload on create', async () => {
    mock.pushResult(null)
    mock.pushResult({
      id: 'uuid-1',
      inro_contact_id: 'inro_123',
      instagram_handle: 'testuser',
      source: 'keyword',
    })

    const payload: InroWebhookPayload = { ...BASE_PAYLOAD, source: 'keyword' }
    const result = await upsertContact(mock as never, payload)

    expect(result.success).toBe(true)
    // Verify insert was called with the correct source
    const insertCall = mock.chain.insert.mock.calls[0]?.[0]
    expect(insertCall).toMatchObject({ source: 'keyword' })
  })

  it('updates last_message_at when contact exists', async () => {
    const existingContact = {
      id: 'uuid-1',
      inro_contact_id: 'inro_123',
      instagram_handle: 'testuser',
      first_seen_at: '2026-04-01T00:00:00Z',
      source: 'keyword',
    }
    // First call: lookup finds existing contact
    mock.pushResult(existingContact)
    // Second call: update returns updated contact
    mock.pushResult({
      ...existingContact,
      last_message_at: '2026-04-09T10:00:00Z',
    })

    const result = await upsertContact(mock as never, BASE_PAYLOAD)

    expect(result.success).toBe(true)
    expect(mock.chain.update).toHaveBeenCalled()
    // Verify update only touches last_message_at and updated_at
    const updateCall = mock.chain.update.mock.calls[0]?.[0]
    expect(updateCall).toHaveProperty('last_message_at')
    expect(updateCall).toHaveProperty('updated_at')
    expect(updateCall).not.toHaveProperty('first_seen_at')
    expect(updateCall).not.toHaveProperty('source')
  })

  it('does NOT overwrite first_seen_at or source on update', async () => {
    mock.pushResult({
      id: 'uuid-1',
      inro_contact_id: 'inro_123',
      instagram_handle: 'testuser',
      first_seen_at: '2026-01-01T00:00:00Z',
      source: 'broadcast',
    })
    mock.pushResult({
      id: 'uuid-1',
      inro_contact_id: 'inro_123',
      last_message_at: '2026-04-09T10:00:00Z',
    })

    await upsertContact(mock as never, BASE_PAYLOAD)

    const updateCall = mock.chain.update.mock.calls[0]?.[0]
    expect(updateCall).not.toHaveProperty('first_seen_at')
    expect(updateCall).not.toHaveProperty('source')
    expect(updateCall).not.toHaveProperty('inro_contact_id')
  })

  it('returns error on database lookup failure', async () => {
    mock.pushResult(null, { message: 'Connection failed', code: '08000' })

    const result = await upsertContact(mock as never, BASE_PAYLOAD)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeDefined()
    expect(result.error).toContain('Connection failed')
  })

  it('returns error on database insert failure', async () => {
    mock.pushResult(null) // lookup: not found
    mock.pushResult(null, { message: 'Unique violation', code: '23505' })

    const result = await upsertContact(mock as never, BASE_PAYLOAD)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('Unique violation')
  })

  it('returns error on database update failure', async () => {
    mock.pushResult({ id: 'uuid-1', inro_contact_id: 'inro_123' }) // lookup: found
    mock.pushResult(null, { message: 'RLS violation', code: '42501' })

    const result = await upsertContact(mock as never, BASE_PAYLOAD)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('RLS violation')
  })

  it('handles optional name and email from payload', async () => {
    mock.pushResult(null)
    mock.pushResult({
      id: 'uuid-1',
      inro_contact_id: 'inro_123',
      instagram_handle: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
    })

    const payload: InroWebhookPayload = {
      ...BASE_PAYLOAD,
      name: 'Test User',
      email: 'test@example.com',
    }
    const result = await upsertContact(mock as never, payload)

    expect(result.success).toBe(true)
    const insertCall = mock.chain.insert.mock.calls[0]?.[0]
    expect(insertCall).toMatchObject({
      name: 'Test User',
      email: 'test@example.com',
    })
  })
})
