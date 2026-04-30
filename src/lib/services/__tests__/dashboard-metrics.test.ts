import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getBrandConfig: () => ({ BRAND_NAME: 'VendingPreneurs' }),
  isBotEnabled: () => true,
}))

vi.mock('@/lib/services/feature-flags', () => ({
  flagOn: vi.fn(),
  clearFlagCache: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import {
  resolveWindowBounds,
  getCloseHandoffMetric,
  type CloseHandoffWindow,
} from '@/lib/services/dashboard-metrics'
import { flagOn } from '@/lib/services/feature-flags'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

describe('resolveWindowBounds', () => {
  it("'this_week' returns Monday 00:00 UTC of the current week through now", () => {
    // Wednesday 2026-04-29 12:34Z — Monday of that week is 2026-04-27.
    const now = new Date('2026-04-29T12:34:00.000Z')
    const bounds = resolveWindowBounds('this_week', now)

    expect(bounds.from.toISOString()).toBe('2026-04-27T00:00:00.000Z')
    expect(bounds.to.toISOString()).toBe('2026-04-29T12:34:00.000Z')
    expect(bounds.label).toBe('This week')
  })

  it("'this_week' on a Monday returns that Monday at 00:00 through now", () => {
    const now = new Date('2026-04-27T08:00:00.000Z')
    const bounds = resolveWindowBounds('this_week', now)

    expect(bounds.from.toISOString()).toBe('2026-04-27T00:00:00.000Z')
    expect(bounds.to.toISOString()).toBe('2026-04-27T08:00:00.000Z')
  })

  it("'this_week' on a Sunday returns the previous Monday", () => {
    // Sunday 2026-05-03 — previous Monday is 2026-04-27.
    const now = new Date('2026-05-03T15:00:00.000Z')
    const bounds = resolveWindowBounds('this_week', now)

    expect(bounds.from.toISOString()).toBe('2026-04-27T00:00:00.000Z')
  })

  it("'last_week' returns the previous Monday through this Monday", () => {
    const now = new Date('2026-04-29T12:34:00.000Z')
    const bounds = resolveWindowBounds('last_week', now)

    expect(bounds.from.toISOString()).toBe('2026-04-20T00:00:00.000Z')
    expect(bounds.to.toISOString()).toBe('2026-04-27T00:00:00.000Z')
    expect(bounds.label).toBe('Last week')
  })

  it("'this_month' returns the 1st 00:00 UTC of the current month through now", () => {
    const now = new Date('2026-04-29T12:34:00.000Z')
    const bounds = resolveWindowBounds('this_month', now)

    expect(bounds.from.toISOString()).toBe('2026-04-01T00:00:00.000Z')
    expect(bounds.to.toISOString()).toBe('2026-04-29T12:34:00.000Z')
    expect(bounds.label).toBe('This month')
  })

  it.each<CloseHandoffWindow>(['this_week', 'last_week', 'this_month'])(
    'always returns from < to for window=%s',
    (window) => {
      const now = new Date('2026-04-29T12:34:00.000Z')
      const bounds = resolveWindowBounds(window, now)
      expect(bounds.from.getTime()).toBeLessThan(bounds.to.getTime())
    }
  )
})

describe('getCloseHandoffMetric', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createCountMockClient(syncedCount: number, relevantCount: number) {
    // Each `from('leads')` call returns its own chain. The test can assert
    // both branches were invoked — proving a single round-trip per branch
    // (no JS post-filtering, no N+1).
    const calls: Array<{ filter: string; chain: Record<string, unknown> }> = []

    const client = {
      from: vi.fn((table: string) => {
        if (table !== 'leads') {
          throw new Error(`unexpected table ${table}`)
        }
        const filterTags: string[] = []

        const chain = {
          select: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lt: vi.fn(() => chain),
          eq: vi.fn((col: string, value: unknown) => {
            filterTags.push(`${col}=${String(value)}`)
            return chain
          }),
          not: vi.fn((col: string, op: string, value: unknown) => {
            filterTags.push(`${col} ${op} ${String(value)}`)
            return chain
          }),
          // The `count: 'exact', head: true` pattern resolves the chain.
          // Use a `then` to make the chain awaitable.
          then: undefined as unknown,
        }

        // Make the chain a thenable so `await` resolves with the count.
        Object.defineProperty(chain, 'then', {
          value(onFulfilled: (value: { count: number }) => unknown) {
            const tag = filterTags.join('|')
            const isSynced = tag.includes('close_sync_status=sent')
            const count = isSynced ? syncedCount : relevantCount
            calls.push({ filter: tag, chain })
            return Promise.resolve({ count }).then(onFulfilled)
          },
          enumerable: false,
          writable: true,
        })

        return chain
      }),
    }

    return { client, calls }
  }

  it('returns synced + relevant counts and rounded percentage for this_week', async () => {
    const { client } = createCountMockClient(12, 14)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(true)

    const result = await getCloseHandoffMetric({
      window: 'this_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    expect(result.syncedCount).toBe(12)
    expect(result.relevantCount).toBe(14)
    expect(result.syncedPct).toBe(86) // 12/14 = 0.857 → 86
    expect(result.windowLabel).toBe('This week')
    expect(result.windowFrom).toBe('2026-04-27T00:00:00.000Z')
    expect(result.windowTo).toBe('2026-04-29T12:34:00.000Z')
    expect(result.flagEnabled).toBe(true)
  })

  it('returns 0% when relevantCount is 0 (no division by zero)', async () => {
    const { client } = createCountMockClient(0, 0)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(true)

    const result = await getCloseHandoffMetric({
      window: 'this_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    expect(result.syncedCount).toBe(0)
    expect(result.relevantCount).toBe(0)
    expect(result.syncedPct).toBe(0)
  })

  it('returns 0% when synced is 0 but relevant > 0 (operator sees the gap)', async () => {
    const { client } = createCountMockClient(0, 14)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(true)

    const result = await getCloseHandoffMetric({
      window: 'this_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    expect(result.syncedCount).toBe(0)
    expect(result.relevantCount).toBe(14)
    expect(result.syncedPct).toBe(0)
  })

  it('flagEnabled is false when no row exists for the brand', async () => {
    const { client } = createCountMockClient(2, 4)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(false)

    const result = await getCloseHandoffMetric({
      window: 'this_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    expect(result.flagEnabled).toBe(false)
    // Counts are still computed — the operator sees what would be there
    // when the flag is flipped on.
    expect(result.syncedCount).toBe(2)
  })

  it("'last_week' computes a non-overlapping prior-week window", async () => {
    const { client, calls } = createCountMockClient(3, 5)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(true)

    const result = await getCloseHandoffMetric({
      window: 'last_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    expect(result.windowFrom).toBe('2026-04-20T00:00:00.000Z')
    expect(result.windowTo).toBe('2026-04-27T00:00:00.000Z')
    // Both branches executed.
    expect(calls.length).toBe(2)
  })

  it('rounds the percentage to the nearest integer', async () => {
    // 1/3 = 33.333… → 33
    const { client } = createCountMockClient(1, 3)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(true)

    const result = await getCloseHandoffMetric({
      window: 'this_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    expect(result.syncedPct).toBe(33)
  })

  it('hits a single round-trip per branch (synced + relevant) — no extra reads', async () => {
    const { client, calls } = createCountMockClient(7, 10)
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )
    vi.mocked(flagOn).mockResolvedValue(true)

    await getCloseHandoffMetric({
      window: 'this_week',
      now: new Date('2026-04-29T12:34:00.000Z'),
    })

    // Two leads queries — one for synced, one for relevant. Both run in
    // parallel via Promise.all (FR-5).
    expect(client.from).toHaveBeenCalledTimes(2)
    expect(calls.length).toBe(2)
    expect(calls.some((c) => c.filter.includes('close_sync_status=sent'))).toBe(
      true
    )
    // The "relevant" branch uses .not('email', 'is', null) — that maps to
    // `email is null` in our filter-tag accumulator (op stays "is", value
    // stays null). The synced branch is the one that has the
    // close_sync_status=sent tag; the OTHER branch is "relevant".
    expect(calls.some((c) => !c.filter.includes('close_sync_status'))).toBe(
      true
    )
  })
})
