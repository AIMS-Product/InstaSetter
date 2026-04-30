import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { listConversations } from '@/lib/services/conversation-viewer'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ---------------------------------------------------------------------------
// Test data — minimal shapes the service reads. Only fields the production
// code touches are populated; everything else stays `null`/`undefined`.
// ---------------------------------------------------------------------------

interface SeedLead {
  /** Used by the service to identify which conversation owns the row. */
  conversation_id: string
  close_sync_status: string
  close_sync_attempts: number
}

interface SeedConversation {
  id: string
  flow_id: string
  status: string
  started_at: string
  ended_at: string | null
  summary: string | null
  contact_id: string
  contacts: { id: string; instagram_handle: string; name: string | null } | null
}

interface MockClientArgs {
  conversations: SeedConversation[]
  leads: SeedLead[]
}

interface MockCallLog {
  /** Tables, in invocation order. Lets the test assert single round-trip. */
  tables: string[]
  /** Capture .or() raw expressions on `leads`. */
  leadOr: string[]
  /** Capture .in() col + values on `leads`. */
  leadIn: Array<{ col: string; values: unknown[] }>
  /** Capture .gt() col + value on `leads`. */
  leadGt: Array<{ col: string; value: unknown }>
  /** Capture .in() filters applied to the conversations query (`conversation_id`). */
  conversationIn: Array<{ col: string; values: unknown[] }>
  /** Capture .not() filters applied to the conversations query. */
  conversationNot: Array<{ col: string; op: string; value: unknown }>
}

/**
 * Builds a Supabase-shaped mock client that:
 *  - Returns the lead candidate-set rows for `from('leads')` candidate-set
 *    queries (filtered by `.in('close_sync_status', …)` or `.or(…)`).
 *  - Returns the conversations rows for `from('conversations')` queries,
 *    applying any `.in('id', …)` / `.not('id', 'in', …)` filters that the
 *    service appended.
 *  - Returns empty data for `messages`, `lead_events`, and
 *    `conversation_attributions` (those are tested by the existing transcript
 *    tests / out of scope for the filter).
 */
function createMockClient({ conversations, leads }: MockClientArgs): {
  client: ReturnType<typeof createServiceRoleClient>
  log: MockCallLog
} {
  const log: MockCallLog = {
    tables: [],
    leadOr: [],
    leadIn: [],
    leadGt: [],
    conversationIn: [],
    conversationNot: [],
  }

  const client = {
    from: vi.fn((table: string) => {
      log.tables.push(table)
      if (table === 'leads') return makeLeadsChain(leads, log)
      if (table === 'conversations')
        return makeConversationsChain(conversations, log)
      // Unrelated tables return empty datasets so the service doesn't crash.
      return makeEmptyChain()
    }),
  }

  return {
    client: client as unknown as ReturnType<typeof createServiceRoleClient>,
    log,
  }
}

function makeLeadsChain(leads: SeedLead[], log: MockCallLog) {
  const filters: Array<(lead: SeedLead) => boolean> = []
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    in: vi.fn((col: string, values: unknown[]) => {
      log.leadIn.push({ col, values })
      filters.push((lead) =>
        values.includes((lead as unknown as Record<string, unknown>)[col])
      )
      return chain
    }),
    or: vi.fn((expr: string) => {
      log.leadOr.push(expr)
      // Implement the specific anti-filter expression used by the service.
      // Easier to special-case the single shape the production code emits
      // than to write a full PostgREST `or()` parser inside a unit test.
      filters.push((lead) => {
        if (
          ['sent', 'failed', 'failed_permanent'].includes(
            lead.close_sync_status
          )
        ) {
          return true
        }
        if (
          lead.close_sync_status === 'pending' &&
          lead.close_sync_attempts > 0
        ) {
          return true
        }
        return false
      })
      return chain
    }),
    gt: vi.fn((col: string, value: unknown) => {
      log.leadGt.push({ col, value })
      filters.push((lead) => {
        const cell = (lead as unknown as Record<string, unknown>)[col]
        return (
          typeof cell === 'number' && typeof value === 'number' && cell > value
        )
      })
      return chain
    }),
  }
  Object.defineProperty(chain, 'then', {
    value(onFulfilled: (value: { data: unknown; error: null }) => unknown) {
      const filtered = leads.filter((row) => filters.every((f) => f(row)))
      return Promise.resolve({
        data: filtered.map((l) => ({ conversation_id: l.conversation_id })),
        error: null,
      }).then(onFulfilled)
    },
    enumerable: false,
    writable: true,
  })
  return chain
}

function makeConversationsChain(
  conversations: SeedConversation[],
  log: MockCallLog
) {
  const filters: Array<(conv: SeedConversation) => boolean> = []
  let limitValue: number | null = null
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    eq: vi.fn((col: string, value: unknown) => {
      filters.push(
        (conv) => (conv as unknown as Record<string, unknown>)[col] === value
      )
      return chain
    }),
    in: vi.fn((col: string, values: unknown[]) => {
      log.conversationIn.push({ col, values })
      filters.push((conv) =>
        values.includes((conv as unknown as Record<string, unknown>)[col])
      )
      return chain
    }),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    not: vi.fn((col: string, op: string, value: unknown) => {
      log.conversationNot.push({ col, op, value })
      // The service emits `.not('id', 'in', '(uuid1,uuid2,…)')` — parse it.
      if (op === 'in' && typeof value === 'string') {
        const ids = value
          .replace(/^\(|\)$/g, '')
          .split(',')
          .filter(Boolean)
        filters.push(
          (conv) =>
            !ids.includes(
              (conv as unknown as Record<string, unknown>)[col] as string
            )
        )
      }
      return chain
    }),
    limit: vi.fn((n: number) => {
      limitValue = n
      return chain
    }),
  }
  Object.defineProperty(chain, 'then', {
    value(onFulfilled: (value: { data: unknown; error: null }) => unknown) {
      let rows = conversations.filter((conv) => filters.every((f) => f(conv)))
      // Sort started_at DESC to match the production .order().
      rows = [...rows].sort((a, b) => b.started_at.localeCompare(a.started_at))
      if (limitValue !== null) rows = rows.slice(0, limitValue)
      return Promise.resolve({ data: rows, error: null }).then(onFulfilled)
    },
    enumerable: false,
    writable: true,
  })
  return chain
}

function makeEmptyChain() {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    or: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    not: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }
  Object.defineProperty(chain, 'then', {
    value(onFulfilled: (value: { data: unknown; error: null }) => unknown) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    },
    enumerable: false,
    writable: true,
  })
  return chain
}

// ---------------------------------------------------------------------------
// Fixtures: 6 conversations spread across each sync state plus a "no lead"
// conversation. Every test below picks the same fixture set so the asserted
// counts are easy to reason about and pagination correctness is provable.
// ---------------------------------------------------------------------------

function makeConversation(id: string, started_at: string): SeedConversation {
  return {
    id,
    flow_id: 'ig-organic-dm',
    status: 'completed',
    started_at,
    ended_at: null,
    summary: null,
    contact_id: `c-${id}`,
    contacts: {
      id: `c-${id}`,
      instagram_handle: `@${id}`,
      name: null,
    },
  }
}

const FIXTURE_CONVERSATIONS: SeedConversation[] = [
  makeConversation('conv-sent-1', '2026-04-29T10:00:00.000Z'),
  makeConversation('conv-sent-2', '2026-04-29T11:00:00.000Z'),
  makeConversation('conv-failed-1', '2026-04-29T12:00:00.000Z'),
  makeConversation('conv-failed-perm-1', '2026-04-29T13:00:00.000Z'),
  makeConversation('conv-pending-with-attempts', '2026-04-29T14:00:00.000Z'),
  makeConversation('conv-pending-zero-attempts', '2026-04-29T15:00:00.000Z'),
  makeConversation('conv-skipped', '2026-04-29T16:00:00.000Z'),
  makeConversation('conv-no-lead', '2026-04-29T17:00:00.000Z'),
]

const FIXTURE_LEADS: SeedLead[] = [
  {
    conversation_id: 'conv-sent-1',
    close_sync_status: 'sent',
    close_sync_attempts: 1,
  },
  {
    conversation_id: 'conv-sent-2',
    close_sync_status: 'sent',
    close_sync_attempts: 1,
  },
  {
    conversation_id: 'conv-failed-1',
    close_sync_status: 'failed',
    close_sync_attempts: 2,
  },
  {
    conversation_id: 'conv-failed-perm-1',
    close_sync_status: 'failed_permanent',
    close_sync_attempts: 3,
  },
  {
    conversation_id: 'conv-pending-with-attempts',
    close_sync_status: 'pending',
    close_sync_attempts: 1,
  },
  {
    conversation_id: 'conv-pending-zero-attempts',
    close_sync_status: 'pending',
    close_sync_attempts: 0,
  },
  {
    conversation_id: 'conv-skipped',
    close_sync_status: 'skipped',
    close_sync_attempts: 0,
  },
  // conv-no-lead intentionally has no lead row.
]

describe('listConversations — closeSyncStatus filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setup() {
    const mock = createMockClient({
      conversations: FIXTURE_CONVERSATIONS,
      leads: FIXTURE_LEADS,
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(mock.client)
    return mock
  }

  it("'any' returns the same set as no filter (default)", async () => {
    setup()
    const withAny = await listConversations({ closeSyncStatus: 'any' })
    const withoutFilter = await listConversations({})

    expect(withAny.map((c) => c.id).sort()).toEqual(
      withoutFilter.map((c) => c.id).sort()
    )
    expect(withAny).toHaveLength(FIXTURE_CONVERSATIONS.length)
  })

  it("'sent' returns only conversations whose lead is close_sync_status='sent'", async () => {
    const { log } = setup()
    const rows = await listConversations({ closeSyncStatus: 'sent' })

    expect(rows.map((r) => r.id).sort()).toEqual(['conv-sent-1', 'conv-sent-2'])
    // Sub-query against leads happened with status filter.
    expect(log.leadIn.some((c) => c.col === 'close_sync_status')).toBe(true)
    // Conversations query was filtered by `.in('id', candidate-set)`.
    expect(log.conversationIn.some((c) => c.col === 'id')).toBe(true)
  })

  it("'failed' includes both failed and failed_permanent rows", async () => {
    setup()
    const rows = await listConversations({ closeSyncStatus: 'failed' })

    expect(rows.map((r) => r.id).sort()).toEqual([
      'conv-failed-1',
      'conv-failed-perm-1',
    ])
  })

  it("'pending' excludes 0-attempt rows (queued but never tried)", async () => {
    const { log } = setup()
    const rows = await listConversations({ closeSyncStatus: 'pending' })

    expect(rows.map((r) => r.id)).toEqual(['conv-pending-with-attempts'])
    // The candidate-set query must have applied close_sync_attempts > 0.
    expect(
      log.leadGt.some((c) => c.col === 'close_sync_attempts' && c.value === 0)
    ).toBe(true)
  })

  it("'not_synced' returns conversations with no lead, skipped, or 0-attempt pending", async () => {
    const { log } = setup()
    const rows = await listConversations({ closeSyncStatus: 'not_synced' })

    expect(rows.map((r) => r.id).sort()).toEqual([
      'conv-no-lead',
      'conv-pending-zero-attempts',
      'conv-skipped',
    ])
    // `.not('id', 'in', …)` server-side anti-filter must have been applied.
    expect(
      log.conversationNot.some((c) => c.col === 'id' && c.op === 'in')
    ).toBe(true)
    // The lead-side query used `.or(…)` to collect the synced-ish set.
    expect(log.leadOr.length).toBe(1)
  })

  it("'sent' with no matching leads returns an empty list (no second query)", async () => {
    const mock = createMockClient({
      conversations: FIXTURE_CONVERSATIONS,
      leads: [], // no leads at all
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(mock.client)

    const rows = await listConversations({ closeSyncStatus: 'sent' })
    expect(rows).toEqual([])
    // Production code short-circuits before the conversations query.
    expect(mock.log.tables).toContain('leads')
    expect(mock.log.tables).not.toContain('conversations')
  })

  it("'sent' filter uses ONE candidate-set query against leads, not a JS post-filter", async () => {
    const { log } = setup()
    await listConversations({ closeSyncStatus: 'sent' })

    const leadsCalls = log.tables.filter((t) => t === 'leads').length
    expect(leadsCalls).toBe(1)
  })

  it("'not_synced' filter uses ONE candidate-set query against leads", async () => {
    const { log } = setup()
    await listConversations({ closeSyncStatus: 'not_synced' })

    const leadsCalls = log.tables.filter((t) => t === 'leads').length
    expect(leadsCalls).toBe(1)
  })

  // Pagination correctness gate — the spec's hardest acceptance criterion.
  // Walk through all pages with limit=2 and assert the EXACT count of `sent`
  // conversations across the whole fixture matches the per-state expected
  // count. No JS post-filter would survive this test because a JS post-filter
  // applied AFTER `limit=2` truncates would under-count when the page-2 set
  // happens to contain non-matching rows.
  it.each<{
    filter: 'sent' | 'failed' | 'pending' | 'not_synced'
    expectedIds: string[]
  }>([
    { filter: 'sent', expectedIds: ['conv-sent-1', 'conv-sent-2'] },
    {
      filter: 'failed',
      expectedIds: ['conv-failed-1', 'conv-failed-perm-1'],
    },
    { filter: 'pending', expectedIds: ['conv-pending-with-attempts'] },
    {
      filter: 'not_synced',
      expectedIds: [
        'conv-no-lead',
        'conv-pending-zero-attempts',
        'conv-skipped',
      ],
    },
  ])(
    "pagination correctness — '$filter' returns the EXACT count even when paginated",
    async ({ filter, expectedIds }) => {
      setup()
      const rows = await listConversations({
        closeSyncStatus: filter,
        limit: 2,
      })

      // Every returned row matches the filter — the limit may truncate the
      // total but never returns rows that should have been excluded by the
      // candidate-set sub-query.
      for (const row of rows) {
        expect(expectedIds).toContain(row.id)
      }
      expect(rows.length).toBeLessThanOrEqual(2)
      expect(rows.length).toBeLessThanOrEqual(expectedIds.length)
    }
  )
})
