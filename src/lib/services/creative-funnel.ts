import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  aggregateFunnelRows,
  type CreativeFunnelGroupBy,
  type CreativeFunnelRawRow,
  type CreativeFunnelResult,
  type CreativeFunnelSortKey,
} from './creative-funnel-types'

export interface GetCreativeFunnelRowsInput {
  /** ISO timestamp marking the inclusive start of the window. */
  from: string
  /** ISO timestamp marking the exclusive end of the window. */
  to: string
  groupBy: CreativeFunnelGroupBy
  sort: CreativeFunnelSortKey
  dir: 'asc' | 'desc'
}

/**
 * Reads the per-conversation grain `v_creative_funnel` view, then aggregates
 * in memory by the requested grouping. Aggregation in JS lets the caller
 * change `groupBy` without re-issuing SQL — the view is the expensive bit and
 * we keep its output cached at the page-level via Next.js revalidate.
 *
 * Performance note: the spec budget is 30k conversations / 90 days in <800ms.
 * The view has no joins on this side; the main cost is the `EXISTS (book_call)`
 * subquery and the LATERAL leads pick. Existing indexes on conversations.started_at
 * + the new utm_* indexes from P5.01 cover the hot paths.
 */
export async function getCreativeFunnelRows(
  input: GetCreativeFunnelRowsInput
): Promise<CreativeFunnelResult> {
  const t0 = Date.now()
  const client = createServiceRoleClient()

  const { data, error } = await client
    .from('v_creative_funnel')
    .select(
      'conversation_id, source_id, source_label, channel, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ad_id, ad_set_id, is_qualified, is_booked, is_sent_to_close'
    )
    .gte('started_at', input.from)
    .lt('started_at', input.to)

  if (error) {
    console.error('getCreativeFunnelRows query failed', error)
    return {
      success: false,
      rows: [],
      error: 'Could not load the creative funnel report.',
    }
  }

  // Structured log for observability — helps spot when we cross the
  // materialization threshold (~250k conversations / page load).
  const queryMs = Date.now() - t0
  console.log(
    JSON.stringify({
      event: 'creative_funnel.query_ms',
      query_ms: queryMs,
      row_count: data?.length ?? 0,
      group_by: input.groupBy,
      from: input.from,
      to: input.to,
    })
  )

  const rows = aggregateFunnelRows(
    (data ?? []) as CreativeFunnelRawRow[],
    input.groupBy,
    input.sort,
    input.dir
  )

  return { success: true, rows }
}
