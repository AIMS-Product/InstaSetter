import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Database } from '@/types/database'

type ContactRow = Database['public']['Tables']['contacts']['Row']
type ConversationRow = Database['public']['Tables']['conversations']['Row']
type MessageRow = Database['public']['Tables']['messages']['Row']

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))
vi.mock('@/lib/services/contact', () => ({ upsertContact: vi.fn() }))
vi.mock('@/lib/services/conversation', () => ({
  findOrCreateActiveConversation: vi.fn(),
}))
vi.mock('@/lib/services/message', () => ({ storeMessage: vi.fn() }))
vi.mock('@/lib/services/engine', () => ({ processMessage: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: vi.fn() }
    },
  }
})
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

import { POST } from '@/app/api/webhooks/inro/route'
import { upsertContact } from '@/lib/services/contact'
import { findOrCreateActiveConversation } from '@/lib/services/conversation'
import { storeMessage } from '@/lib/services/message'
import { processMessage } from '@/lib/services/engine'

const validPayload = {
  contact_id: 'inro_123',
  username: 'testuser',
  message: 'Hey interested',
  timestamp: '2026-04-09T10:00:00Z',
}

const stubContact = (overrides: Partial<ContactRow> = {}): ContactRow => ({
  id: 'c1',
  inro_contact_id: 'inro_123',
  sendpulse_contact_id: null,
  instagram_handle: 'testuser',
  name: null,
  email: null,
  phone: null,
  profile_picture_url: null,
  source: 'organic_dm',
  opted_out: false,
  opted_out_at: null,
  tags: [],
  first_seen_at: '2026-04-09T10:00:00Z',
  last_message_at: '2026-04-09T10:00:00Z',
  created_at: '2026-04-09T10:00:00Z',
  updated_at: '2026-04-09T10:00:00Z',
  ...overrides,
})

const stubConversation = (
  overrides: Partial<ConversationRow> = {}
): ConversationRow => ({
  id: 'conv-1',
  contact_id: 'c1',
  status: 'active',
  prompt_version: 'setter-v1',
  summary: null,
  flagged_reason: null,
  is_test: false,
  started_at: '2026-04-09T10:00:00Z',
  ended_at: null,
  created_at: '2026-04-09T10:00:00Z',
  updated_at: '2026-04-09T10:00:00Z',
  ...overrides,
})

const stubMessage = (overrides: Partial<MessageRow> = {}): MessageRow => ({
  id: 'msg-1',
  conversation_id: 'conv-1',
  role: 'user',
  content: 'Hey interested',
  inro_message_id: null,
  dedup_hash: null,
  token_count: null,
  metadata: null,
  created_at: '2026-04-09T10:00:00Z',
  ...overrides,
})

describe('POST /api/webhooks/inro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for malformed JSON', async () => {
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid payload', async () => {
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify({ contact_id: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 skip for opted-out contact', async () => {
    vi.mocked(upsertContact).mockResolvedValue({
      success: true,
      data: stubContact({ opted_out: true }),
    })
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.skipped).toBe(true)
    expect(json.reason).toBe('opted_out')
  })

  it('returns 200 skip for duplicate message', async () => {
    vi.mocked(upsertContact).mockResolvedValue({
      success: true,
      data: stubContact(),
    })
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation(),
    })
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: true,
    })
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.skipped).toBe(true)
    expect(json.reason).toBe('duplicate')
  })

  it('returns 200 with reply for valid message', async () => {
    vi.mocked(upsertContact).mockResolvedValue({
      success: true,
      data: stubContact(),
    })
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation(),
    })
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: false,
      data: stubMessage(),
    })
    vi.mocked(processMessage).mockResolvedValue({
      success: true,
      data: { reply: 'Hey!', conversationId: 'conv-1' },
    })
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reply).toBe('Hey!')
  })

  it('returns 500 with generic message on internal error', async () => {
    vi.mocked(upsertContact).mockRejectedValue(new Error('DB down'))
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
