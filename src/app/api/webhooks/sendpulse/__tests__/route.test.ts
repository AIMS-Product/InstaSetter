import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Database } from '@/types/database'

type ContactRow = Database['public']['Tables']['contacts']['Row']

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))
vi.mock('@/lib/services/contact', () => ({
  upsertSendPulseContact: vi.fn(),
}))
vi.mock('@/lib/services/engine', () => ({ processMessage: vi.fn() }))
vi.mock('@/lib/services/sendpulse', () => ({
  sendInstagramMessage: vi.fn(),
  pauseAutomation: vi.fn(),
  setContactTags: vi.fn(),
  removeContactTag: vi.fn(),
}))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() }
  },
}))
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
  getSendPulseConfig: () => ({
    SENDPULSE_API_KEY: 'test-key',
    SENDPULSE_BOT_ID: 'test-bot',
    SENDPULSE_WEBHOOK_SECRET: 'test-secret',
  }),
  isBotEnabled: vi.fn(() => true),
}))

import { POST } from '@/app/api/webhooks/sendpulse/route'
import { upsertSendPulseContact } from '@/lib/services/contact'
import { processMessage } from '@/lib/services/engine'
import { sendInstagramMessage, pauseAutomation } from '@/lib/services/sendpulse'
import { isBotEnabled } from '@/lib/config'

const stubContact = (overrides: Partial<ContactRow> = {}): ContactRow => ({
  id: 'c1',
  inro_contact_id: null,
  sendpulse_contact_id: 'sp_123',
  instagram_handle: 'testuser',
  name: null,
  email: null,
  phone: null,
  profile_picture_url: null,
  source: 'organic_dm',
  opted_out: false,
  opted_out_at: null,
  tags: [],
  first_seen_at: '2026-04-16T00:00:00Z',
  last_message_at: '2026-04-16T00:00:00Z',
  created_at: '2026-04-16T00:00:00Z',
  updated_at: '2026-04-16T00:00:00Z',
  ...overrides,
})

const validPayload = [
  {
    service: 'instagram',
    title: 'incoming_message',
    date: 1713225600,
    bot: { id: 'bot-1' },
    contact: {
      id: 'sp_123',
      username: 'testuser',
      last_message: 'Hey interested',
    },
  },
]

function makeRequest(body: unknown, token = 'test-secret') {
  return new Request(`http://localhost/api/webhooks/sendpulse?token=${token}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/webhooks/sendpulse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(pauseAutomation).mockResolvedValue({ success: true })
    vi.mocked(sendInstagramMessage).mockResolvedValue({ success: true })
    vi.mocked(isBotEnabled).mockReturnValue(true)
  })

  it('short-circuits all events when bot is paused', async () => {
    vi.mocked(isBotEnabled).mockReturnValue(false)
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0].skipped).toBe('bot_paused')
    expect(upsertSendPulseContact).not.toHaveBeenCalled()
    expect(processMessage).not.toHaveBeenCalled()
    expect(sendInstagramMessage).not.toHaveBeenCalled()
  })

  it('returns 401 for invalid token', async () => {
    const res = await POST(makeRequest(validPayload, 'wrong-token'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for malformed JSON', async () => {
    const req = new Request(
      'http://localhost/api/webhooks/sendpulse?token=test-secret',
      { method: 'POST', body: 'not json' }
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid payload schema', async () => {
    const res = await POST(makeRequest([{ bad: 'data' }]))
    expect(res.status).toBe(400)
  })

  it('skips non-incoming_message events', async () => {
    const payload = [{ ...validPayload[0], title: 'delivery_status' }]
    vi.mocked(upsertSendPulseContact).mockResolvedValue({
      success: true,
      data: stubContact(),
    })
    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0].skipped).toBe('delivery_status')
  })

  it('skips opted-out contacts', async () => {
    vi.mocked(upsertSendPulseContact).mockResolvedValue({
      success: true,
      data: stubContact({ opted_out: true }),
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.results[0].skipped).toBe('opted_out')
  })

  it('processes message and sends reply', async () => {
    vi.mocked(upsertSendPulseContact).mockResolvedValue({
      success: true,
      data: stubContact(),
    })
    vi.mocked(processMessage).mockResolvedValue({
      success: true,
      data: { reply: 'Hey!', conversationId: 'conv-1' },
    })

    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)

    expect(processMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'c1', sendpulse_contact_id: 'sp_123' }),
      undefined,
      'Hey interested',
      expect.any(String),
      expect.any(Function),
      'sendpulse'
    )
    expect(sendInstagramMessage).toHaveBeenCalledWith('sp_123', 'Hey!')
  })

  it('passes full contact row to processMessage', async () => {
    const contact = stubContact({ tags: ['qualified', 'location:Adelaide'] })
    vi.mocked(upsertSendPulseContact).mockResolvedValue({
      success: true,
      data: contact,
    })
    vi.mocked(processMessage).mockResolvedValue({
      success: true,
      data: { reply: 'Hey!', conversationId: 'conv-1' },
    })

    await POST(makeRequest(validPayload))

    expect(processMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tags: ['qualified', 'location:Adelaide'] }),
      undefined,
      expect.any(String),
      expect.any(String),
      expect.any(Function),
      'sendpulse'
    )
  })

  it('does not send message when reply is empty', async () => {
    vi.mocked(upsertSendPulseContact).mockResolvedValue({
      success: true,
      data: stubContact(),
    })
    vi.mocked(processMessage).mockResolvedValue({
      success: true,
      data: { reply: undefined, conversationId: 'conv-1' },
    })

    await POST(makeRequest(validPayload))
    expect(sendInstagramMessage).not.toHaveBeenCalled()
  })

  it('calls pauseAutomation before processing', async () => {
    vi.mocked(upsertSendPulseContact).mockResolvedValue({
      success: true,
      data: stubContact(),
    })
    vi.mocked(processMessage).mockResolvedValue({
      success: true,
      data: { reply: 'Hey!', conversationId: 'conv-1' },
    })

    await POST(makeRequest(validPayload))
    expect(pauseAutomation).toHaveBeenCalledWith('sp_123')
  })

  it('returns 500 on unhandled error', async () => {
    vi.mocked(upsertSendPulseContact).mockRejectedValue(new Error('DB down'))
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(500)
  })
})
