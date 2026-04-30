import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getBrandConfig, isBotEnabled } from '@/lib/config'
import { flagOn } from '@/lib/services/feature-flags'

export interface DashboardMetrics {
  bot: {
    enabled: boolean
  }
  conversations: {
    total: number
    active: number
    today: number
    last7d: number
    last30d: number
  }
  lastMessageAt: string | null
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const client = createServiceRoleClient()
  const today = startOfToday().toISOString()
  const d7 = daysAgo(7).toISOString()
  const d30 = daysAgo(30).toISOString()

  const [totalRes, activeRes, todayRes, w7Res, m30Res, lastMsgRes] =
    await Promise.all([
      client.from('conversations').select('id', { count: 'exact', head: true }),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', today),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', d7),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', d30),
      client
        .from('messages')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  return {
    bot: { enabled: isBotEnabled() },
    conversations: {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      today: todayRes.count ?? 0,
      last7d: w7Res.count ?? 0,
      last30d: m30Res.count ?? 0,
    },
    lastMessageAt: lastMsgRes.data?.created_at ?? null,
  }
}

// -----------------------------------------------------------------------
// Close handoff metric (P3.03)
//
// "Sent to Close" tile: count of leads pushed to Close in the active
// time-window plus the percentage of "relevant" (email captured) leads
// that were synced. Drives a click-through to the conversations inbox
// filtered by `closeSyncStatus=sent` (P3.04).
// -----------------------------------------------------------------------

export type CloseHandoffWindow = 'this_week' | 'last_week' | 'this_month'

export interface CloseHandoffMetric {
  syncedCount: number
  relevantCount: number
  /** Rounded to the nearest integer. 0 when relevantCount === 0. */
  syncedPct: number
  /** ISO 8601 inclusive lower bound. */
  windowFrom: string
  /** ISO 8601 exclusive upper bound. */
  windowTo: string
  /** Human label for the window — used in the tile selector. */
  windowLabel: string
  /**
   * Whether `close_sync.enabled` is on for the active brand. When false,
   * the tile renders a "Close sync disabled" footnote so the operator
   * knows the zero is expected, not a bug.
   */
  flagEnabled: boolean
}

interface ResolvedWindow {
  from: Date
  to: Date
  label: string
}

const WINDOW_LABELS: Record<CloseHandoffWindow, string> = {
  this_week: 'This week',
  last_week: 'Last week',
  this_month: 'This month',
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  )
}

function startOfIsoWeekUtc(d: Date): Date {
  // ISO week: Monday is day 1. JS getUTCDay() returns 0 for Sunday.
  const day = d.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  const dayStart = startOfUtcDay(d)
  return new Date(dayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
}

/**
 * Resolve a window enum into UTC bounds + label. Pure — accepts `now` for
 * deterministic tests.
 */
export function resolveWindowBounds(
  window: CloseHandoffWindow,
  now: Date
): ResolvedWindow {
  const label = WINDOW_LABELS[window]
  if (window === 'this_week') {
    return { from: startOfIsoWeekUtc(now), to: now, label }
  }
  if (window === 'last_week') {
    const thisMonday = startOfIsoWeekUtc(now)
    const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { from: lastMonday, to: thisMonday, label }
  }
  // this_month
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  )
  return { from: monthStart, to: now, label }
}

function pctOf(num: number, den: number): number {
  if (den <= 0) return 0
  return Math.round((num / den) * 100)
}

export interface GetCloseHandoffMetricOptions {
  window?: CloseHandoffWindow
  /** Override the wall-clock — used in tests. Defaults to `new Date()`. */
  now?: Date
  /** Override the brand for flag lookup. Defaults to BRAND_NAME. */
  brand?: string
}

/**
 * Aggregate "leads sent to Close" + "relevant leads (email captured)" for
 * a time window. Two parallel `count` queries hit the leads table — no JS
 * post-filtering, no N+1, indexes do the work.
 */
export async function getCloseHandoffMetric(
  options: GetCloseHandoffMetricOptions = {}
): Promise<CloseHandoffMetric> {
  const window = options.window ?? 'this_week'
  const now = options.now ?? new Date()
  const brand = options.brand ?? getBrandConfig().BRAND_NAME

  const bounds = resolveWindowBounds(window, now)
  const windowFrom = bounds.from.toISOString()
  const windowTo = bounds.to.toISOString()

  const client = createServiceRoleClient()

  const [syncedRes, relevantRes, flagEnabled] = await Promise.all([
    client
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowFrom)
      .lt('created_at', windowTo)
      .eq('close_sync_status', 'sent'),
    client
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowFrom)
      .lt('created_at', windowTo)
      .not('email', 'is', null),
    flagOn('close_sync.enabled', { brand }, client),
  ])

  const syncedCount = syncedRes.count ?? 0
  const relevantCount = relevantRes.count ?? 0

  return {
    syncedCount,
    relevantCount,
    syncedPct: pctOf(syncedCount, relevantCount),
    windowFrom,
    windowTo,
    windowLabel: bounds.label,
    flagEnabled,
  }
}
