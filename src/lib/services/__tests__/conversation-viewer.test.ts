import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getSupabaseServerConfig: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test',
  }),
}))

// We construct the mock module-scope so each describe block can program
// per-table return values via the maps below. The shape mirrors the
// table-aware helper in src/test/helpers.ts but is inline so we can keep
// this test file self-contained and easy to read.

type FakeRows<T> = { data: T[] | null; error: { message: string } | null }
type FakeRow<T> = { data: T | null; error: { message: string } | null }

const conversationsRows: { value: FakeRows<unknown> } = {
  value: { data: null, error: null },
}
const messagesRows: { value: FakeRows<unknown> } = {
  value: { data: [], error: null },
}
const eventsRows: { value: FakeRows<unknown> } = {
  value: { data: [], error: null },
}
const attributionsRows: { value: FakeRows<unknown> } = {
  value: { data: [], error: null },
}
const leadsRows: { value: FakeRows<unknown> } = {
  value: { data: [], error: null },
}
const conversationSingle: { value: FakeRow<unknown> } = {
  value: { data: null, error: null },
}
const attributionSingle: { value: FakeRow<unknown> } = {
  value: { data: null, error: null },
}
const leadSingle: { value: FakeRow<unknown> } = {
  value: { data: null, error: null },
}

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => buildClient(),
}))

function buildClient() {
  return {
    from(table: string) {
      switch (table) {
        case 'conversations':
          return conversationsTableChain()
        case 'messages':
          return messagesTableChain()
        case 'lead_events':
          return eventsTableChain()
        case 'conversation_attributions':
          return attributionsTableChain()
        case 'leads':
          return leadsTableChain()
        case 'contacts':
          return contactsSearchChain()
        default:
          throw new Error(`Unexpected table: ${table}`)
      }
    },
  }
}

// conversations chain — list returns array (after order().limit()), detail
// returns single (after eq().maybeSingle()).
function conversationsTableChain() {
  const chain = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(conversationsRows.value)),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(conversationSingle.value)),
  }
  return chain
}

function messagesTableChain() {
  // listConversations: select().in().order() resolves
  // getConversation:   select().eq().order().limit() resolves
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => {
    const result = Promise.resolve(messagesRows.value) as unknown as Record<
      string,
      unknown
    > &
      Promise<unknown>
    result.limit = vi.fn(() => Promise.resolve(messagesRows.value))
    return result
  })
  chain.limit = vi.fn(() => Promise.resolve(messagesRows.value))
  return chain
}

function eventsTableChain() {
  // listConversations: select().in() resolves
  // getConversation:   select().eq().order().limit() resolves
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.in = vi.fn(() => Promise.resolve(eventsRows.value))
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => {
    const result = Promise.resolve(eventsRows.value) as unknown as Record<
      string,
      unknown
    > &
      Promise<unknown>
    result.limit = vi.fn(() => Promise.resolve(eventsRows.value))
    return result
  })
  chain.limit = vi.fn(() => Promise.resolve(eventsRows.value))
  return chain
}

function attributionsTableChain() {
  const chain = {
    select: vi.fn(() => chain),
    in: vi.fn(() => Promise.resolve(attributionsRows.value)),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(attributionSingle.value)),
  }
  return chain
}

function leadsTableChain() {
  // listConversations: select().in().order() resolves to multi-row
  // getConversation:   select().eq().order().limit().maybeSingle() resolves to single
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => {
    const result = Promise.resolve(leadsRows.value) as unknown as Record<
      string,
      unknown
    > &
      Promise<unknown>
    result.limit = vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve(leadSingle.value)),
    }))
    return result
  })
  chain.limit = vi.fn(() => ({
    maybeSingle: vi.fn(() => Promise.resolve(leadSingle.value)),
  }))
  chain.maybeSingle = vi.fn(() => Promise.resolve(leadSingle.value))
  return chain
}

function contactsSearchChain() {
  const chain = {
    select: vi.fn(() => chain),
    or: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }
  return chain
}

import {
  listConversations,
  getConversation,
} from '@/lib/services/conversation-viewer'

const baseConv = {
  id: 'conv-1',
  flow_id: 'flow-1',
  status: 'active',
  started_at: '2026-04-29T00:00:00Z',
  ended_at: null,
  summary: null,
  contact_id: 'contact-1',
  prompt_version: 'v1',
  contacts: {
    id: 'contact-1',
    instagram_handle: 'jane',
    name: 'Jane',
    email: 'jane@example.com',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  conversationsRows.value = { data: [baseConv], error: null }
  messagesRows.value = { data: [], error: null }
  eventsRows.value = { data: [], error: null }
  attributionsRows.value = { data: [], error: null }
  leadsRows.value = { data: [], error: null }
  conversationSingle.value = { data: baseConv, error: null }
  attributionSingle.value = { data: null, error: null }
  leadSingle.value = { data: null, error: null }
})

describe('listConversations close sync projection', () => {
  it('projects close sync state from latest lead row when one exists', async () => {
    leadsRows.value = {
      data: [
        {
          conversation_id: 'conv-1',
          close_sync_status: 'sent',
          close_crm_id: 'lead_abc123',
          close_sync_error_message: null,
          close_sync_attempted_at: '2026-04-29T01:00:00Z',
          close_sync_attempts: 1,
          created_at: '2026-04-29T01:00:00Z',
        },
      ],
      error: null,
    }

    const rows = await listConversations()

    expect(rows).toHaveLength(1)
    expect(rows[0]!.closeSync).toEqual({
      status: 'sent',
      closeLeadId: 'lead_abc123',
      errorMessage: null,
      attemptedAt: '2026-04-29T01:00:00Z',
      attempts: 1,
    })
  })

  it('returns null close sync when no lead row exists', async () => {
    leadsRows.value = { data: [], error: null }

    const rows = await listConversations()

    expect(rows).toHaveLength(1)
    expect(rows[0]!.closeSync).toBeNull()
  })

  it('keeps the most recent lead when multiple exist for one conversation', async () => {
    leadsRows.value = {
      data: [
        {
          conversation_id: 'conv-1',
          close_sync_status: 'sent',
          close_crm_id: 'lead_new',
          close_sync_error_message: null,
          close_sync_attempted_at: '2026-04-29T05:00:00Z',
          close_sync_attempts: 2,
          created_at: '2026-04-29T05:00:00Z',
        },
        {
          conversation_id: 'conv-1',
          close_sync_status: 'failed',
          close_crm_id: null,
          close_sync_error_message: 'old',
          close_sync_attempted_at: '2026-04-29T01:00:00Z',
          close_sync_attempts: 1,
          created_at: '2026-04-29T01:00:00Z',
        },
      ],
      error: null,
    }

    const rows = await listConversations()

    expect(rows[0]!.closeSync?.status).toBe('sent')
    expect(rows[0]!.closeSync?.closeLeadId).toBe('lead_new')
  })
})

describe('getConversation close sync projection', () => {
  it('projects close sync state from the latest lead', async () => {
    leadSingle.value = {
      data: {
        close_sync_status: 'failed',
        close_crm_id: null,
        close_sync_error_message: 'Custom field cf_xyz unknown',
        close_sync_attempted_at: '2026-04-29T03:00:00Z',
        close_sync_attempts: 3,
      },
      error: null,
    }

    const detail = await getConversation('conv-1')

    expect(detail).not.toBeNull()
    expect(detail!.closeSync).toEqual({
      status: 'failed',
      closeLeadId: null,
      errorMessage: 'Custom field cf_xyz unknown',
      attemptedAt: '2026-04-29T03:00:00Z',
      attempts: 3,
    })
  })

  it('returns null closeSync when no lead row exists for the conversation', async () => {
    leadSingle.value = { data: null, error: null }

    const detail = await getConversation('conv-1')

    expect(detail).not.toBeNull()
    expect(detail!.closeSync).toBeNull()
  })
})
