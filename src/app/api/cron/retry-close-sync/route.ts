import { NextResponse } from 'next/server'
import { getCloseConfig } from '@/lib/config'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { syncLeadToClose } from '@/lib/services/sync-lead-to-close'

/**
 * Vercel Cron handler — retries `failed` Close-sync rows hourly.
 *
 * Vercel Cron sends a GET to this route on the schedule registered in
 * vercel.json (`0 * * * *`). The route is gated by a bearer header
 * matching `CLOSE_CRON_SECRET`.
 *
 * Picks rows where:
 *   close_sync_status = 'failed' AND close_sync_attempts < 24
 *
 * Calls syncLeadToClose for each. The orchestrator handles its own flag
 * gate — if the brand's flag is off, the row flips to `skipped` and the
 * cron stops re-trying it.
 *
 * Hard cap of 50 rows per cron tick to keep runtime bounded.
 */

const MAX_ATTEMPTS_BEFORE_PERMANENT = 24
const MAX_ROWS_PER_TICK = 50

function unauthorized(): NextResponse {
  return NextResponse.json(
    { ok: false, error: 'unauthorized' },
    { status: 401 }
  )
}

export async function GET(request: Request): Promise<NextResponse> {
  const closeCfg = getCloseConfig()
  const expected = closeCfg.CLOSE_CRON_SECRET

  // If the secret isn't configured, refuse — cron should never be open.
  if (!expected) {
    return unauthorized()
  }

  const provided = request.headers.get('authorization') ?? ''
  if (provided !== `Bearer ${expected}`) {
    return unauthorized()
  }

  const client = createServiceRoleClient()
  const { data: rows, error } = await client
    .from('leads')
    .select('id, close_sync_attempts')
    .eq('close_sync_status', 'failed')
    .lt('close_sync_attempts', MAX_ATTEMPTS_BEFORE_PERMANENT)
    .order('close_sync_attempted_at', { ascending: true })
    .limit(MAX_ROWS_PER_TICK)

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  let attempted = 0
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const row of rows ?? []) {
    attempted++
    try {
      const result = await syncLeadToClose({ leadId: row.id })
      if ('skipped' in result && result.skipped) {
        skipped++
      } else if (result.success) {
        succeeded++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({
    ok: true,
    attempted,
    succeeded,
    failed,
    skipped,
  })
}
