/**
 * Shared formatting helpers used by the dashboard reporting surfaces (P5.02
 * creative funnel, P5.03 weekly summary). Pure, no I/O — safe to import on
 * client and server.
 */

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/**
 * Render a unit-rate (0–1) as `XX.X%`. Negative rates clamp to `0.0%`,
 * over-1 rates clamp to `100.0%`, and `null` becomes a single em-dash so
 * empty cells are obvious without throwing.
 */
export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '—'
  const clamped = Math.max(0, Math.min(1, rate))
  return `${(clamped * 100).toFixed(1)}%`
}

export type PpDeltaSign = 'up' | 'down' | 'flat'

export interface PpDelta {
  sign: PpDeltaSign
  label: string
}

/**
 * Render the pp (percentage-point) difference between two unit-rates.
 * Returns null when either rate is null so callers can hide the chip.
 *
 * Example: formatPpDelta(0.081, 0.062) → { sign: 'up', label: '+1.9pp' }
 */
export function formatPpDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): PpDelta | null {
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined) return null

  const diff = (current - previous) * 100
  const rounded = Math.round(diff * 10) / 10

  if (rounded === 0) {
    return { sign: 'flat', label: '0.0pp' }
  }
  if (rounded > 0) {
    return { sign: 'up', label: `+${rounded.toFixed(1)}pp` }
  }
  return { sign: 'down', label: `${rounded.toFixed(1)}pp` }
}

/**
 * Render a date range like "Apr 27 - May 3". Same-month ranges drop the
 * second month for compactness ("Apr 6 - 12").
 *
 * Both bounds are inclusive.
 */
export function formatDateRange(
  start: Date,
  end: Date,
  timeZone: string
): string {
  const startParts = getDateParts(start, timeZone)
  const endParts = getDateParts(end, timeZone)

  const startLabel = `${MONTHS_SHORT[startParts.month]} ${startParts.day}`
  const endLabel =
    startParts.month === endParts.month
      ? `${endParts.day}`
      : `${MONTHS_SHORT[endParts.month]} ${endParts.day}`

  return `${startLabel} - ${endLabel}`
}

interface DateParts {
  year: number
  month: number // 0-indexed for parity with Date.getMonth()
  day: number
}

function getDateParts(date: Date, timeZone: string): DateParts {
  // Intl.DateTimeFormat is the only stdlib-correct way to extract calendar
  // parts in an arbitrary IANA timezone without pulling in date-fns.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  let year = 0
  let month = 0
  let day = 0
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value)
    else if (p.type === 'month') month = Number(p.value) - 1
    else if (p.type === 'day') day = Number(p.value)
  }
  return { year, month, day }
}

export const __test__ = {
  getDateParts,
  MONTHS_SHORT,
}
