// Date window helpers for the creative funnel report. Exports presets +
// parsers used by both the Server Component (to seed initial state) and the
// client funnel-table (to drive the URL state).

import {
  CREATIVE_FUNNEL_GROUP_BYS,
  CREATIVE_FUNNEL_SORT_KEYS,
  type CreativeFunnelGroupBy,
  type CreativeFunnelSortKey,
} from '@/lib/services/creative-funnel-types'

export const DATE_PRESETS = [
  '7d',
  '30d',
  '90d',
  'this_month',
  'last_month',
  'custom',
] as const

export type DatePreset = (typeof DATE_PRESETS)[number]

export interface DateWindow {
  from: string // ISO start of day, inclusive
  to: string // ISO start of next day, exclusive
  preset: DatePreset
  /** Operator-facing label shown above the table ("Last 30 days"). */
  label: string
}

function startOfDay(d: Date): Date {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  return next
}

function shiftDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

function startOfMonth(d: Date): Date {
  const next = new Date(d)
  next.setDate(1)
  next.setHours(0, 0, 0, 0)
  return next
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Resolves a `from`/`to`/`preset` querystring triple into a concrete window.
 * - When `preset === 'custom'`, both `from` and `to` are honored as user input
 *   (ISO date `YYYY-MM-DD`). Falls back to last-30-days if either is invalid.
 * - When the preset is a fixed range, `from`/`to` from the URL are ignored.
 * - The `to` field is always set to the START of the day AFTER the inclusive
 *   end so SQL `started_at < to` includes the full final day.
 */
export function resolveDateWindow(input: {
  preset?: string | null
  from?: string | null
  to?: string | null
  /** Override "now" — only used in tests. */
  now?: Date
}): DateWindow {
  const now = input.now ?? new Date()
  const today = startOfDay(now)
  const preset: DatePreset = (DATE_PRESETS as readonly string[]).includes(
    input.preset ?? ''
  )
    ? (input.preset as DatePreset)
    : '30d'

  switch (preset) {
    case '7d': {
      const from = shiftDays(today, -6)
      const to = shiftDays(today, 1)
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        preset,
        label: 'Last 7 days',
      }
    }
    case '30d': {
      const from = shiftDays(today, -29)
      const to = shiftDays(today, 1)
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        preset,
        label: 'Last 30 days',
      }
    }
    case '90d': {
      const from = shiftDays(today, -89)
      const to = shiftDays(today, 1)
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        preset,
        label: 'Last 90 days',
      }
    }
    case 'this_month': {
      const from = startOfMonth(today)
      const to = shiftDays(today, 1)
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        preset,
        label: 'This month',
      }
    }
    case 'last_month': {
      const lastMonthEnd = shiftDays(startOfMonth(today), 0) // first of this month
      const lastMonthStart = startOfMonth(shiftDays(lastMonthEnd, -1))
      return {
        from: lastMonthStart.toISOString(),
        to: lastMonthEnd.toISOString(),
        preset,
        label: 'Last month',
      }
    }
    case 'custom': {
      const fromDate = parseDate(input.from)
      const toDate = parseDate(input.to)
      if (fromDate && toDate && fromDate <= toDate) {
        return {
          from: fromDate.toISOString(),
          to: shiftDays(toDate, 1).toISOString(),
          preset,
          label: `${isoDate(fromDate)} → ${isoDate(toDate)}`,
        }
      }
      // Bad custom input — fall back to 30d so the report stays usable.
      return resolveDateWindow({ preset: '30d', now })
    }
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : startOfDay(date)
}

export function resolveGroupBy(
  value: string | null | undefined
): CreativeFunnelGroupBy {
  return (CREATIVE_FUNNEL_GROUP_BYS as readonly string[]).includes(value ?? '')
    ? (value as CreativeFunnelGroupBy)
    : 'source'
}

export function resolveSort(
  value: string | null | undefined
): CreativeFunnelSortKey {
  return (CREATIVE_FUNNEL_SORT_KEYS as readonly string[]).includes(value ?? '')
    ? (value as CreativeFunnelSortKey)
    : 'dms'
}

export function resolveDir(value: string | null | undefined): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc'
}
