import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { formatDateRange } from '@/lib/format'

/**
 * Brand timezone for week-boundary math.
 *
 * TODO: replace with `getBrandConfig().BRAND_TIMEZONE` once that env var
 * lands. Tracked as open question 18 in `docs/flow-builder/README.md`. For
 * the VendingPreneurs brand we default to Adelaide because Sofia's daily
 * cadence is the local reporting clock; if a brand asks for a different
 * week start, switch this constant per-brand at the config layer rather
 * than scattering tz literals across the service.
 */
export const BRAND_TIMEZONE_DEFAULT = 'Australia/Adelaide'

export interface WeeklyFunnelTotals {
  label: string
  dms: number
  qualified: number
  booked: number
  sentToClose: number
  rates: {
    qualifiedFromDms: number | null
    bookedFromDms: number | null
    closeFromDms: number | null
  }
}

export interface WeeklyWindow {
  start: Date // inclusive UTC instant of Mon 00:00 in the brand timezone
  end: Date // exclusive UTC instant of next Mon 00:00 in the brand timezone
  label: string
  dailyKeys: string[] // length-7 YYYY-MM-DD strings (brand zone), Mon → Sun
}

export interface WeeklyWindowPair {
  current: WeeklyWindow
  previous: WeeklyWindow
}

export interface WeeklySummary {
  current: WeeklyFunnelTotals
  previous: WeeklyFunnelTotals
  dailyDms: number[] // length-7, Mon → Sun in brand timezone
  closeHandoffShipped: boolean
  timeZone: string
}

/**
 * Compute the Monday-Sunday window pair (current + previous) that contains
 * the current wall-clock instant in the supplied IANA timezone. Pure;
 * deterministic for a given `Date.now()`.
 */
export function computeWeeklyWindow(
  timeZone: string,
  now: Date = new Date()
): WeeklyWindowPair {
  const parts = getZonedParts(now, timeZone)
  // ISO weekday: Mon = 1 ... Sun = 7. Default to ISO so Sunday closes the week.
  const isoWeekday = parts.weekday === 0 ? 7 : parts.weekday
  const daysSinceMonday = isoWeekday - 1

  const currentMonday = addDaysToZonedDate(
    parts.year,
    parts.month,
    parts.day,
    -daysSinceMonday
  )
  const nextMonday = addDaysToZonedDate(
    parts.year,
    parts.month,
    parts.day,
    -daysSinceMonday + 7
  )
  const previousMonday = addDaysToZonedDate(
    parts.year,
    parts.month,
    parts.day,
    -daysSinceMonday - 7
  )

  const currentStart = zonedDateToUtc(
    currentMonday.year,
    currentMonday.month,
    currentMonday.day,
    timeZone
  )
  const currentEnd = zonedDateToUtc(
    nextMonday.year,
    nextMonday.month,
    nextMonday.day,
    timeZone
  )
  const previousStart = zonedDateToUtc(
    previousMonday.year,
    previousMonday.month,
    previousMonday.day,
    timeZone
  )

  const current: WeeklyWindow = {
    start: currentStart,
    end: currentEnd,
    label: formatDateRange(
      currentStart,
      // Subtract 1ms to land on inclusive Sunday for the label
      new Date(currentEnd.getTime() - 1),
      timeZone
    ),
    dailyKeys: buildDailyKeys(currentMonday),
  }

  const previous: WeeklyWindow = {
    start: previousStart,
    end: currentStart,
    label: formatDateRange(
      previousStart,
      new Date(currentStart.getTime() - 1),
      timeZone
    ),
    dailyKeys: buildDailyKeys(previousMonday),
  }

  return { current, previous }
}

/**
 * Server-rendered weekly performance summary. Single read of the
 * conversations + leads + lead_events tables across the previous + current
 * week window. No view, no Postgres function — the existing dashboard load
 * pattern already pays a few round-trips per render and the volume here is
 * small enough that ad-hoc SELECTs win on simplicity vs. introducing a view.
 *
 * Brand timezone defaults to Adelaide. See BRAND_TIMEZONE_DEFAULT JSDoc.
 */
export async function getWeeklyFunnelSummary(
  timeZone: string = BRAND_TIMEZONE_DEFAULT
): Promise<WeeklySummary> {
  const client = createServiceRoleClient()
  return buildWeeklySummary(client, timeZone)
}

/**
 * Test seam — accepts an injected client so unit tests can run without the
 * service-role env var. Production callers go through
 * `getWeeklyFunnelSummary()` which wires up the service-role client.
 */
export async function buildWeeklySummary(
  client: SupabaseClient<Database>,
  timeZone: string,
  now: Date = new Date()
): Promise<WeeklySummary> {
  const start = Date.now()
  const window = computeWeeklyWindow(timeZone, now)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const conversationsRes = await client
    .from('conversations')
    .select('id, started_at')
    .gte('started_at', window.previous.start.toISOString())
    .lt('started_at', window.current.end.toISOString())

  const conversations = (conversationsRes.data ?? []) as Array<{
    id: string
    started_at: string
  }>

  const conversationIds = conversations.map((c) => c.id)

  const [leadsRes, eventsRes, closeProbeRes] = await Promise.all([
    conversationIds.length > 0
      ? client
          .from('leads')
          .select('conversation_id, qualification_status, close_crm_id')
          .in('conversation_id', conversationIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length > 0
      ? client
          .from('lead_events')
          .select('conversation_id, tool_name')
          .in('conversation_id', conversationIds)
          .eq('tool_name', 'book_call')
      : Promise.resolve({ data: [], error: null }),
    client
      .from('leads')
      .select('id')
      .gte('updated_at', fourteenDaysAgo.toISOString())
      .not('close_crm_id', 'is', null)
      .limit(1),
  ])

  const leads = ((leadsRes as { data: unknown }).data ?? []) as Array<{
    conversation_id: string
    qualification_status: string | null
    close_crm_id: string | null
  }>
  const events = ((eventsRes as { data: unknown }).data ?? []) as Array<{
    conversation_id: string
    tool_name: string
  }>
  const closeProbe = ((closeProbeRes as { data: unknown }).data ?? []) as Array<
    Record<string, unknown>
  >

  const leadsByConversation = new Map<
    string,
    { qualification_status: string | null; close_crm_id: string | null }
  >()
  for (const l of leads) {
    leadsByConversation.set(l.conversation_id, {
      qualification_status: l.qualification_status,
      close_crm_id: l.close_crm_id,
    })
  }
  const bookedConversationIds = new Set(events.map((e) => e.conversation_id))

  const currentTotals = aggregateWindow(
    conversations,
    window.current,
    leadsByConversation,
    bookedConversationIds
  )
  const previousTotals = aggregateWindow(
    conversations,
    window.previous,
    leadsByConversation,
    bookedConversationIds
  )

  const dailyDms = computeDailyDmsVector(
    conversations,
    window.current,
    timeZone
  )

  const elapsedMs = Date.now() - start
  // Lightweight observability — operator-readable, captured by Vercel logs.
  console.log(
    JSON.stringify({
      kind: 'weekly_summary.query_ms',
      ms: elapsedMs,
      conversations: conversations.length,
    })
  )

  return {
    current: currentTotals,
    previous: previousTotals,
    dailyDms,
    closeHandoffShipped: closeProbe.length > 0,
    timeZone,
  }
}

function aggregateWindow(
  conversations: Array<{ id: string; started_at: string }>,
  window: WeeklyWindow,
  leadsByConversation: Map<
    string,
    { qualification_status: string | null; close_crm_id: string | null }
  >,
  bookedConversationIds: Set<string>
): WeeklyFunnelTotals {
  let dms = 0
  let qualified = 0
  let booked = 0
  let sentToClose = 0

  for (const conv of conversations) {
    const startedMs = new Date(conv.started_at).getTime()
    if (startedMs < window.start.getTime()) continue
    if (startedMs >= window.end.getTime()) continue

    dms += 1
    const lead = leadsByConversation.get(conv.id)
    if (lead) {
      if (
        lead.qualification_status === 'hot' ||
        lead.qualification_status === 'warm'
      ) {
        qualified += 1
      }
      if (lead.close_crm_id) {
        sentToClose += 1
      }
    }
    if (bookedConversationIds.has(conv.id)) {
      booked += 1
    }
  }

  return {
    label: window.label,
    dms,
    qualified,
    booked,
    sentToClose,
    rates: {
      qualifiedFromDms: dms === 0 ? null : qualified / dms,
      bookedFromDms: dms === 0 ? null : booked / dms,
      closeFromDms: dms === 0 ? null : sentToClose / dms,
    },
  }
}

function computeDailyDmsVector(
  conversations: Array<{ started_at: string }>,
  window: WeeklyWindow,
  timeZone: string
): number[] {
  const counts = window.dailyKeys.map(() => 0)
  const dayIndex = new Map(window.dailyKeys.map((k, i) => [k, i]))

  for (const conv of conversations) {
    const d = new Date(conv.started_at)
    if (d.getTime() < window.start.getTime()) continue
    if (d.getTime() >= window.end.getTime()) continue
    const key = formatZonedDateKey(d, timeZone)
    const idx = dayIndex.get(key)
    if (idx !== undefined) counts[idx] += 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  weekday: number // 0 = Sun ... 6 = Sat (matches Date.getUTCDay)
  hour: number
  minute: number
  second: number
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = formatter.formatToParts(date)
  let year = 0
  let month = 0
  let day = 0
  let hour = 0
  let minute = 0
  let second = 0
  let weekday = 0
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value)
    else if (p.type === 'month') month = Number(p.value)
    else if (p.type === 'day') day = Number(p.value)
    else if (p.type === 'hour') hour = Number(p.value) % 24
    else if (p.type === 'minute') minute = Number(p.value)
    else if (p.type === 'second') second = Number(p.value)
    else if (p.type === 'weekday') weekday = weekdayMap[p.value] ?? 0
  }
  return { year, month, day, hour, minute, second, weekday }
}

interface ZonedDate {
  year: number
  month: number // 1-12
  day: number
}

function addDaysToZonedDate(
  year: number,
  month: number,
  day: number,
  delta: number
): ZonedDate {
  // Use a UTC anchor so the arithmetic doesn't drift across DST when we
  // re-resolve to the zone. The day field is a calendar day, not a wall
  // time, so the math is purely arithmetic.
  const anchor = new Date(Date.UTC(year, month - 1, day))
  anchor.setUTCDate(anchor.getUTCDate() + delta)
  return {
    year: anchor.getUTCFullYear(),
    month: anchor.getUTCMonth() + 1,
    day: anchor.getUTCDate(),
  }
}

/**
 * Resolve a wall-clock date in the given zone to the UTC instant of
 * 00:00 local time. Two-pass back-solve handles arbitrary IANA zones,
 * including those that observe DST.
 */
function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string
): Date {
  // First pass: pretend the wall clock is UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  // What does that instant look like in the target zone?
  const zoned = getZonedParts(guess, timeZone)
  // Compute the offset (in minutes) between the wall time the zone sees and
  // the wall time we wanted (00:00).
  const observedMinutes = zoned.hour * 60 + zoned.minute + zoned.second / 60
  // If observed > 0, the zone is ahead of UTC, so the UTC instant must be
  // earlier by that amount.
  const correctionMs = observedMinutes * 60 * 1000
  // We also need to account for cross-day flips: if `zoned.day` is the day
  // after our target, the zone is ahead of UTC by more than 24h-observed.
  const targetDay = day
  const observedDay = zoned.day
  let dayDelta = 0
  if (
    observedDay !== targetDay ||
    zoned.month !== month ||
    zoned.year !== year
  ) {
    // The guessed instant landed on a different calendar day in the zone.
    // Compute signed day delta using calendar arithmetic.
    const targetUtc = Date.UTC(year, month - 1, targetDay)
    const observedUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day)
    dayDelta = (observedUtc - targetUtc) / (24 * 60 * 60 * 1000)
  }
  const adjusted = new Date(
    guess.getTime() - correctionMs - dayDelta * 24 * 60 * 60 * 1000
  )

  // Second pass — verify and correct any DST edge. If the second resolution
  // doesn't land on 00:00 of the target day, nudge by the residual offset.
  const verify = getZonedParts(adjusted, timeZone)
  if (
    verify.year !== year ||
    verify.month !== month ||
    verify.day !== day ||
    verify.hour !== 0 ||
    verify.minute !== 0 ||
    verify.second !== 0
  ) {
    const residual = verify.hour * 60 + verify.minute + verify.second / 60
    let residualDayDelta = 0
    if (verify.day !== day || verify.month !== month || verify.year !== year) {
      const targetUtc = Date.UTC(year, month - 1, day)
      const verifiedUtc = Date.UTC(verify.year, verify.month - 1, verify.day)
      residualDayDelta = (verifiedUtc - targetUtc) / (24 * 60 * 60 * 1000)
    }
    return new Date(
      adjusted.getTime() -
        residual * 60 * 1000 -
        residualDayDelta * 24 * 60 * 60 * 1000
    )
  }

  return adjusted
}

function buildDailyKeys(monday: ZonedDate): string[] {
  const keys: string[] = []
  for (let i = 0; i < 7; i += 1) {
    const d = addDaysToZonedDate(monday.year, monday.month, monday.day, i)
    keys.push(`${d.year}-${pad2(d.month)}-${pad2(d.day)}`)
  }
  return keys
}

function formatZonedDateKey(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}
