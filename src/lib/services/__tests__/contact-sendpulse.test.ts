import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getServerConfig: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    ANTHROPIC_API_KEY: 'sk-test',
    BRAND_NAME: 'TestBrand',
  }),
}))

import { upsertSendPulseContact } from '@/lib/services/contact'
import { createMockClient } from '@/test/helpers'
import type { SendPulseWebhookPayload } from '@/types/sendpulse'

function makePayload(
  overrides: Partial<SendPulseWebhookPayload['contact']> = {}
): SendPulseWebhookPayload {
  return {
    service: 'instagram',
    title: 'incoming_message',
    date: 1713225600,
    bot: { id: 'bot-1' },
    contact: {
      id: 'sp_123',
      username: 'testuser',
      last_message: 'Hey',
      name: null,
      email: null,
      phone: null,
      photo: null,
      tags: [],
      ...overrides,
    },
  }
}

describe('upsertSendPulseContact', () => {
  let client: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createMockClient()
  })

  it('creates new contact when none exists', async () => {
    // Lookup by sendpulse_contact_id — not found
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    // Lookup by handle — not found
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    // Insert — success
    const newContact = {
      id: 'new-id',
      sendpulse_contact_id: 'sp_123',
      instagram_handle: 'testuser',
      tags: [],
    }
    client.single.mockResolvedValueOnce({ data: newContact, error: null })

    const result = await upsertSendPulseContact(client as never, makePayload())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sendpulse_contact_id).toBe('sp_123')
    }
    expect(client.insert).toHaveBeenCalled()
  })

  it('updates existing contact found by sendpulse_contact_id', async () => {
    const existing = {
      id: 'existing-id',
      name: 'Old Name',
      profile_picture_url: null,
      tags: ['old-tag'],
      sendpulse_contact_id: 'sp_123',
    }
    client.maybeSingle.mockResolvedValueOnce({ data: existing, error: null })
    // Update + select + single
    client.single.mockResolvedValueOnce({
      data: { ...existing, tags: ['old-tag'] },
      error: null,
    })

    const result = await upsertSendPulseContact(
      client as never,
      makePayload({ name: 'New Name' })
    )

    expect(result.success).toBe(true)
    expect(client.update).toHaveBeenCalled()
    expect(client.insert).not.toHaveBeenCalled()
  })

  it('merges incoming tags with existing tags', async () => {
    const existing = {
      id: 'existing-id',
      name: null,
      profile_picture_url: null,
      tags: ['existing-tag'],
      sendpulse_contact_id: 'sp_123',
    }
    client.maybeSingle.mockResolvedValueOnce({ data: existing, error: null })
    client.single.mockResolvedValueOnce({
      data: { ...existing, tags: ['existing-tag', 'new-tag'] },
      error: null,
    })

    await upsertSendPulseContact(
      client as never,
      makePayload({ tags: ['new-tag', 'existing-tag'] })
    )

    // Verify update was called with merged, deduplicated tags
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['existing-tag', 'new-tag'],
      })
    )
  })

  it('links to existing Inro contact by handle', async () => {
    // Not found by sendpulse_contact_id
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    // Found by handle
    const byHandle = {
      id: 'inro-id',
      name: null,
      profile_picture_url: null,
      tags: [],
    }
    client.maybeSingle.mockResolvedValueOnce({ data: byHandle, error: null })
    client.single.mockResolvedValueOnce({
      data: { ...byHandle, sendpulse_contact_id: 'sp_123' },
      error: null,
    })

    const result = await upsertSendPulseContact(client as never, makePayload())

    expect(result.success).toBe(true)
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sendpulse_contact_id: 'sp_123',
      })
    )
  })

  it('stores incoming tags on new contact creation', async () => {
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.single.mockResolvedValueOnce({
      data: { id: 'new', tags: ['from-sendpulse'] },
      error: null,
    })

    await upsertSendPulseContact(
      client as never,
      makePayload({ tags: ['from-sendpulse'] })
    )

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['from-sendpulse'],
      })
    )
  })

  it('returns error on lookup failure', async () => {
    client.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    })

    const result = await upsertSendPulseContact(client as never, makePayload())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('DB error')
    }
  })

  it('falls back to sp_ prefix handle when username and name are absent', async () => {
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.single.mockResolvedValueOnce({
      data: { id: 'new', instagram_handle: 'sp_sp_123' },
      error: null,
    })

    await upsertSendPulseContact(
      client as never,
      makePayload({ username: undefined, name: null })
    )

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        instagram_handle: 'sp_sp_123',
      })
    )
  })
})
