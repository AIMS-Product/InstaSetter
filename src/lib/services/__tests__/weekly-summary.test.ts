import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTableAwareMockClient, asSupabaseClient } from '@/test/helpers'

// Mock service-role to avoid env var validation at import time. The service
// is exercised directly via `buildWeeklySummary(injectedClient, ...)` so the
// mocked factory is never called.
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import {
  computeWeeklyWindow,
  buildWeeklySummary,
} from '@/lib/services/weekly-summary'

const TZ = 'Australia/Adelaide'

describe('computeWeeklyWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('finds the Monday->Sunday window containing a Thursday', () => {
    // Thursday Apr 30, 2026 at 03:00 UTC = 12:30 PM Adelaide (ACST +0930)
    vi.setSystemTime(new Date('2026-04-30T03:00:00Z'))
    const w = computeWeeklyWindow(TZ)

    // Monday Apr 27 00:00 Adelaide → Apr 26 14:30 UTC
    expect(w.current.start.toISOString()).toBe('2026-04-26T14:30:00.000Z')
    // Monday May 4 00:00 Adelaide → May 3 14:30 UTC (exclusive end)
    expect(w.current.end.toISOString()).toBe('2026-05-03T14:30:00.000Z')

    // Last week: Mon Apr 20 00:00 Adelaide → Apr 19 14:30 UTC
    expect(w.previous.start.toISOString()).toBe('2026-04-19T14:30:00.000Z')
    expect(w.previous.end.toISOString()).toBe('2026-04-26T14:30:00.000Z')

    // Label uses the inclusive Sun end, so "Apr 27 - May 3"
    expect(w.current.label).toBe('Apr 27 - May 3')
    expect(w.previous.label).toBe('Apr 20 - 26')
  })

  it('treats Sunday as the last day of its week, not the first', () => {
    // Sunday May 3 2026 at 02:00 UTC = 11:30 AM Adelaide
    vi.setSystemTime(new Date('2026-05-03T02:00:00Z'))
    const w = computeWeeklyWindow(TZ)

    // Same as Thursday case — still in week of Apr 27 - May 3
    expect(w.current.label).toBe('Apr 27 - May 3')
  })

  it('rolls over correctly when called on a Monday', () => {
    // Monday May 4 2026 at 02:00 UTC = 11:30 AM Adelaide
    vi.setSystemTime(new Date('2026-05-04T02:00:00Z'))
    const w = computeWeeklyWindow(TZ)

    expect(w.current.label).toBe('May 4 - 10')
    expect(w.previous.label).toBe('Apr 27 - May 3')
  })

  it('produces a length-7 daily-key vector covering Mon→Sun', () => {
    vi.setSystemTime(new Date('2026-04-30T03:00:00Z'))
    const w = computeWeeklyWindow(TZ)
    expect(w.current.dailyKeys).toHaveLength(7)
    // Daily keys are YYYY-MM-DD strings in the brand's timezone
    expect(w.current.dailyKeys[0]).toBe('2026-04-27')
    expect(w.current.dailyKeys[6]).toBe('2026-05-03')
  })

  it('honors a different IANA timezone (UTC) for boundary math', () => {
    // Wed Apr 29 13:00 UTC — Wednesday in UTC, week is Mon 27 - Sun May 3.
    vi.setSystemTime(new Date('2026-04-29T13:00:00Z'))
    const w = computeWeeklyWindow('UTC')
    expect(w.current.start.toISOString()).toBe('2026-04-27T00:00:00.000Z')
    expect(w.current.end.toISOString()).toBe('2026-05-04T00:00:00.000Z')
    expect(w.current.label).toBe('Apr 27 - May 3')
  })
})

describe('buildWeeklySummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-30T03:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aggregates conversations into the funnel for current and previous weeks', async () => {
    const client = createTableAwareMockClient()

    // Current-week conversations (Apr 27 - May 3 Adelaide).
    // Five conversations spread across the week.
    const currentConversations = [
      { id: 'c1', started_at: '2026-04-27T01:00:00Z' }, // Mon
      { id: 'c2', started_at: '2026-04-28T05:00:00Z' }, // Tue
      { id: 'c3', started_at: '2026-04-28T09:00:00Z' }, // Tue
      { id: 'c4', started_at: '2026-05-01T12:00:00Z' }, // Fri
      { id: 'c5', started_at: '2026-05-02T22:00:00Z' }, // Sun (Adelaide)
    ]
    const previousConversations = [
      { id: 'p1', started_at: '2026-04-21T01:00:00Z' },
      { id: 'p2', started_at: '2026-04-22T05:00:00Z' },
      { id: 'p3', started_at: '2026-04-25T09:00:00Z' },
    ]

    // Two responses to the same `from('conversations').select(...)` chain:
    // First call covers a 14-day window for daily totals, lead joins, etc.
    // The service issues a single combined query against conversations within
    // [previous.start, current.end), and slices in-memory.
    client.forTable('conversations').select.mockReturnValueOnce({
      gte: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [...previousConversations, ...currentConversations],
          error: null,
        }),
      }),
    } as never)

    // Leads: c1 hot, c2 warm, c3 cold, c4 warm + close_crm_id, c5 hot
    // Previous: p1 warm + close_crm_id, p2 cold, p3 cold
    client.forTable('leads').select.mockReturnValueOnce({
      in: vi.fn().mockResolvedValue({
        data: [
          {
            conversation_id: 'c1',
            qualification_status: 'hot',
            close_crm_id: null,
          },
          {
            conversation_id: 'c2',
            qualification_status: 'warm',
            close_crm_id: null,
          },
          {
            conversation_id: 'c3',
            qualification_status: 'cold',
            close_crm_id: null,
          },
          {
            conversation_id: 'c4',
            qualification_status: 'warm',
            close_crm_id: 'lead_abc',
          },
          {
            conversation_id: 'c5',
            qualification_status: 'hot',
            close_crm_id: null,
          },
          {
            conversation_id: 'p1',
            qualification_status: 'warm',
            close_crm_id: 'lead_xyz',
          },
          {
            conversation_id: 'p2',
            qualification_status: 'cold',
            close_crm_id: null,
          },
          {
            conversation_id: 'p3',
            qualification_status: 'cold',
            close_crm_id: null,
          },
        ],
        error: null,
      }),
    } as never)

    // Lead events: c2 has a book_call event, c4 has a book_call event,
    // p1 had a book_call event. Others — none.
    client.forTable('lead_events').select.mockReturnValueOnce({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { conversation_id: 'c2', tool_name: 'book_call' },
            { conversation_id: 'c4', tool_name: 'book_call' },
            { conversation_id: 'p1', tool_name: 'book_call' },
          ],
          error: null,
        }),
      }),
    } as never)

    // Close handoff probe: any non-null close_crm_id in the last 14 days.
    client.forTable('leads').select.mockReturnValueOnce({
      gte: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'lead_abc' }],
            error: null,
          }),
        }),
      }),
    } as never)

    const summary = await buildWeeklySummary(asSupabaseClient(client), TZ)

    expect(summary.current.dms).toBe(5)
    expect(summary.current.qualified).toBe(4) // c1 hot, c2 warm, c4 warm, c5 hot
    expect(summary.current.booked).toBe(2) // c2, c4
    expect(summary.current.sentToClose).toBe(1) // c4

    expect(summary.previous.dms).toBe(3)
    expect(summary.previous.qualified).toBe(1) // p1
    expect(summary.previous.booked).toBe(1) // p1
    expect(summary.previous.sentToClose).toBe(1) // p1

    expect(summary.current.rates.closeFromDms).toBeCloseTo(0.2)
    expect(summary.previous.rates.closeFromDms).toBeCloseTo(1 / 3)

    // dailyDms: Mon Apr 27 through Sun May 3 (Adelaide). 1 Mon, 2 Tue, 0 Wed,
    // 0 Thu, 1 Fri, 0 Sat, 1 Sun. Note c5's UTC stamp 22:00 on May 2
    // becomes 07:30 on May 3 in Adelaide → Sun.
    expect(summary.dailyDms).toEqual([1, 2, 0, 0, 1, 0, 1])

    expect(summary.closeHandoffShipped).toBe(true)
    expect(summary.timeZone).toBe(TZ)
    expect(summary.current.label).toBe('Apr 27 - May 3')
    expect(summary.previous.label).toBe('Apr 20 - 26')
  })

  it('returns zeros + closeHandoffShipped=false when there is no data', async () => {
    const client = createTableAwareMockClient()
    client.forTable('conversations').select.mockReturnValueOnce({
      gte: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as never)
    // No leads-by-conversation / events queries fire when conversationIds
    // is empty (the service short-circuits with a Promise.resolve), so we
    // only mock the close-probe path.
    client.forTable('leads').select.mockReturnValueOnce({
      gte: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as never)

    const summary = await buildWeeklySummary(asSupabaseClient(client), TZ)

    expect(summary.current.dms).toBe(0)
    expect(summary.previous.dms).toBe(0)
    expect(summary.dailyDms).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(summary.current.rates.closeFromDms).toBeNull()
    expect(summary.previous.rates.closeFromDms).toBeNull()
    expect(summary.closeHandoffShipped).toBe(false)
  })

  it('returns null rates when the denominator is zero (avoids divide-by-zero)', async () => {
    const client = createTableAwareMockClient()
    // Current week has 0 dms, previous week has 4.
    client.forTable('conversations').select.mockReturnValueOnce({
      gte: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [
            { id: 'p1', started_at: '2026-04-21T01:00:00Z' },
            { id: 'p2', started_at: '2026-04-22T05:00:00Z' },
            { id: 'p3', started_at: '2026-04-23T05:00:00Z' },
            { id: 'p4', started_at: '2026-04-24T05:00:00Z' },
          ],
          error: null,
        }),
      }),
    } as never)
    client.forTable('leads').select.mockReturnValueOnce({
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as never)
    client.forTable('lead_events').select.mockReturnValueOnce({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as never)
    client.forTable('leads').select.mockReturnValueOnce({
      gte: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as never)

    const summary = await buildWeeklySummary(asSupabaseClient(client), TZ)

    expect(summary.current.rates.closeFromDms).toBeNull()
    expect(summary.previous.rates.closeFromDms).toBe(0)
    expect(summary.previous.rates.qualifiedFromDms).toBe(0)
  })
})
