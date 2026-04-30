import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  RecordLeadCaptureSchema,
  recordLeadCaptureEvent,
} from '@/lib/services/lead-capture'
import { createTableAwareMockClient, asSupabaseClient } from '@/test/helpers'

describe('RecordLeadCaptureSchema', () => {
  it('normalises email to lowercase + trimmed', () => {
    const parsed = RecordLeadCaptureSchema.parse({
      email: '  Sofia@Example.COM ',
      source: 'dm',
    })
    expect(parsed.email).toBe('sofia@example.com')
  })

  it('rejects malformed email', () => {
    const result = RecordLeadCaptureSchema.safeParse({
      email: 'not-an-email',
      source: 'dm',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown source', () => {
    const result = RecordLeadCaptureSchema.safeParse({
      email: 'a@b.com',
      source: 'webhook',
    })
    expect(result.success).toBe(false)
  })

  it('accepts the three allowed sources', () => {
    for (const source of ['dm', 'landing_page', 'manual'] as const) {
      const result = RecordLeadCaptureSchema.safeParse({
        email: 'a@b.com',
        source,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects non-uuid contactId', () => {
    const result = RecordLeadCaptureSchema.safeParse({
      email: 'a@b.com',
      source: 'dm',
      contactId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional attribution as unknown shape', () => {
    const parsed = RecordLeadCaptureSchema.parse({
      email: 'a@b.com',
      source: 'dm',
      attribution: { channel: 'instagram', campaign: 'test' },
    })
    expect(parsed.attribution).toEqual({
      channel: 'instagram',
      campaign: 'test',
    })
  })
})

describe('recordLeadCaptureEvent', () => {
  let client: ReturnType<typeof createTableAwareMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createTableAwareMockClient()
  })

  it('writes a row with the validated payload', async () => {
    client
      .forTable('lead_capture_events')
      .single.mockResolvedValueOnce({ data: { id: 'evt-1' }, error: null })

    const result = await recordLeadCaptureEvent(asSupabaseClient(client), {
      email: 'Anthony@Vendingpreneurs.COM',
      source: 'dm',
      contactId: '2d72fa8c-9171-4c54-9b1e-e7df3b18a8ce',
      conversationId: '577990d5-2663-4c51-8e9a-c6be12cbb76e',
      attribution: { channel: 'instagram', campaign: 'organic-dm' },
    })

    expect(result).toEqual({ success: true, eventId: 'evt-1' })
    const captureChain = client.forTable('lead_capture_events')
    expect(captureChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'anthony@vendingpreneurs.com',
        source: 'dm',
        contact_id: '2d72fa8c-9171-4c54-9b1e-e7df3b18a8ce',
        conversation_id: '577990d5-2663-4c51-8e9a-c6be12cbb76e',
        attribution: { channel: 'instagram', campaign: 'organic-dm' },
      })
    )
  })

  it('returns failure on validation error and never inserts', async () => {
    const result = await recordLeadCaptureEvent(asSupabaseClient(client), {
      email: 'not-an-email',
      source: 'dm',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
    expect(client.forTable('lead_capture_events').insert).not.toHaveBeenCalled()
  })

  it('returns failure when supabase reports an error and never throws', async () => {
    client.forTable('lead_capture_events').single.mockResolvedValueOnce({
      data: null,
      error: { message: 'fk violation' },
    })

    await expect(
      recordLeadCaptureEvent(asSupabaseClient(client), {
        email: 'a@b.com',
        source: 'dm',
      })
    ).resolves.toEqual({ success: false, error: 'fk violation' })
  })

  it('serialises null for absent optional ids', async () => {
    client
      .forTable('lead_capture_events')
      .single.mockResolvedValueOnce({ data: { id: 'evt-2' }, error: null })

    await recordLeadCaptureEvent(asSupabaseClient(client), {
      email: 'a@b.com',
      source: 'manual',
    })

    expect(client.forTable('lead_capture_events').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: null,
        conversation_id: null,
        marketing_source_id: null,
        attribution: null,
      })
    )
  })
})
