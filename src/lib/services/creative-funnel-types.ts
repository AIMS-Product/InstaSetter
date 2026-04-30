// Pure types and aggregation helpers for the creative funnel report.
// Lives outside `creative-funnel.ts` so the client funnel-table component can
// import the row shape and group-by union without pulling in `server-only`.

export const CREATIVE_FUNNEL_GROUP_BYS = [
  'source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'channel',
] as const

export type CreativeFunnelGroupBy = (typeof CREATIVE_FUNNEL_GROUP_BYS)[number]

export const CREATIVE_FUNNEL_SORT_KEYS = [
  'dms',
  'qualified',
  'booked',
  'sentToClose',
  'qualifiedFromDms',
  'bookedFromDms',
  'closeFromDms',
] as const

export type CreativeFunnelSortKey = (typeof CREATIVE_FUNNEL_SORT_KEYS)[number]

/**
 * One row of `v_creative_funnel`. Mirrors the view's column list — the SQL
 * source of truth lives in `supabase/migrations/20260505010000_creative_funnel_view.sql`.
 */
export interface CreativeFunnelRawRow {
  conversation_id: string
  source_id: string | null
  source_label: string | null
  channel: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ad_id: string | null
  ad_set_id: string | null
  is_qualified: boolean
  is_booked: boolean
  is_sent_to_close: boolean
}

export interface CreativeFunnelRow {
  /** Stable key — `source_id` for source grouping; the literal UTM value otherwise. Empty/null UTMs roll up under the `(unattributed)` bucket. */
  groupKey: string
  /** Human-readable label for the row. */
  groupLabel: string
  dms: number
  qualified: number
  booked: number
  sentToClose: number
  rates: {
    qualifiedFromDms: number | null
    bookedFromDms: number | null
    bookedFromQualified: number | null
    closeFromDms: number | null
  }
}

export type CreativeFunnelResult =
  | { success: true; rows: CreativeFunnelRow[] }
  | { success: false; rows: []; error: string }

export const UNATTRIBUTED_KEY = '__unattributed__'
export const UNATTRIBUTED_LABEL = '(unattributed)'

interface GroupAccumulator {
  groupKey: string
  groupLabel: string
  dms: number
  qualified: number
  booked: number
  sentToClose: number
}

function safeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

function bucketForRow(
  row: CreativeFunnelRawRow,
  groupBy: CreativeFunnelGroupBy
): { key: string; label: string } {
  switch (groupBy) {
    case 'source': {
      // Use `source_id` so two sources with the same label don't collide.
      // Conversations with no resolved source roll up into one bucket so
      // operators can see how much legacy traffic predates marketing-sources.
      if (!row.source_id) {
        return { key: UNATTRIBUTED_KEY, label: UNATTRIBUTED_LABEL }
      }
      return {
        key: row.source_id,
        label: row.source_label ?? '(unnamed source)',
      }
    }
    case 'utm_source':
    case 'utm_medium':
    case 'utm_campaign':
    case 'utm_content': {
      const value = row[groupBy]
      if (!value) return { key: UNATTRIBUTED_KEY, label: UNATTRIBUTED_LABEL }
      return { key: value, label: value }
    }
    case 'channel': {
      const value = row.channel
      if (!value) return { key: UNATTRIBUTED_KEY, label: UNATTRIBUTED_LABEL }
      return { key: value, label: value }
    }
  }
}

function compareRows(
  a: CreativeFunnelRow,
  b: CreativeFunnelRow,
  sort: CreativeFunnelSortKey,
  dir: 'asc' | 'desc'
): number {
  const aValue = sortValue(a, sort)
  const bValue = sortValue(b, sort)
  // Null/NaN denominators sort to the end regardless of direction so a
  // 0-DM source never ranks "first" on a percentage column.
  if (aValue === null && bValue === null) return 0
  if (aValue === null) return 1
  if (bValue === null) return -1
  if (aValue === bValue) {
    // Tie-break on label ascending so the table is deterministic.
    return a.groupLabel.localeCompare(b.groupLabel)
  }
  return dir === 'asc' ? aValue - bValue : bValue - aValue
}

function sortValue(
  row: CreativeFunnelRow,
  sort: CreativeFunnelSortKey
): number | null {
  switch (sort) {
    case 'dms':
      return row.dms
    case 'qualified':
      return row.qualified
    case 'booked':
      return row.booked
    case 'sentToClose':
      return row.sentToClose
    case 'qualifiedFromDms':
      return row.rates.qualifiedFromDms
    case 'bookedFromDms':
      return row.rates.bookedFromDms
    case 'closeFromDms':
      return row.rates.closeFromDms
  }
}

/**
 * Groups per-conversation rows into one row per `groupBy` key, computes the
 * funnel counts and the four conversion rates, and sorts by the requested
 * column. Pure / synchronous so it can run in tests, in the page Server
 * Component, or in any future caller that wants to re-aggregate cached rows.
 */
export function aggregateFunnelRows(
  raw: CreativeFunnelRawRow[],
  groupBy: CreativeFunnelGroupBy,
  sort: CreativeFunnelSortKey,
  dir: 'asc' | 'desc'
): CreativeFunnelRow[] {
  const buckets = new Map<string, GroupAccumulator>()

  for (const row of raw) {
    const bucket = bucketForRow(row, groupBy)
    const existing = buckets.get(bucket.key)
    if (existing) {
      existing.dms += 1
      existing.qualified += row.is_qualified ? 1 : 0
      existing.booked += row.is_booked ? 1 : 0
      existing.sentToClose += row.is_sent_to_close ? 1 : 0
    } else {
      buckets.set(bucket.key, {
        groupKey: bucket.key,
        groupLabel: bucket.label,
        dms: 1,
        qualified: row.is_qualified ? 1 : 0,
        booked: row.is_booked ? 1 : 0,
        sentToClose: row.is_sent_to_close ? 1 : 0,
      })
    }
  }

  const rows: CreativeFunnelRow[] = Array.from(buckets.values()).map(
    (bucket) => ({
      groupKey: bucket.groupKey,
      groupLabel: bucket.groupLabel,
      dms: bucket.dms,
      qualified: bucket.qualified,
      booked: bucket.booked,
      sentToClose: bucket.sentToClose,
      rates: {
        qualifiedFromDms: safeRate(bucket.qualified, bucket.dms),
        bookedFromDms: safeRate(bucket.booked, bucket.dms),
        bookedFromQualified: safeRate(bucket.booked, bucket.qualified),
        closeFromDms: safeRate(bucket.sentToClose, bucket.dms),
      },
    })
  )

  rows.sort((a, b) => compareRows(a, b, sort, dir))
  return rows
}
