import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import type {
  CloseHandoffMetric,
  CloseHandoffWindow,
} from '@/lib/services/dashboard-metrics'
import { CloseHandoffWindowSelect } from './close-handoff-window-select'

interface Props {
  metric: CloseHandoffMetric
  window: CloseHandoffWindow
}

/**
 * "Sent to Close" KPI tile (P3.03).
 *
 * Shows leads pushed to Close in the active window plus the percentage of
 * email-captured leads that were synced. Click-through hits the
 * conversations inbox filtered by `closeSyncStatus=sent` (P3.04 contract).
 *
 * Empty state ("No leads sent yet") fires when there are zero relevant
 * leads — graceful, not loud, per the spec.
 */
export function CloseHandoffTile({ metric, window }: Props) {
  const isEmpty = metric.relevantCount === 0
  const drillDownHref = `/dashboard/conversations?${new URLSearchParams({
    closeSyncStatus: 'sent',
    from: metric.windowFrom,
    to: metric.windowTo,
  }).toString()}`

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#EEEFF3] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#8A8A9B]">
          Sent to Close
        </span>
        <CloseHandoffWindowSelect value={window} />
      </div>

      <Link
        href={drillDownHref}
        aria-label={`Sent to Close — open drill-down (${metric.windowLabel})`}
        className="-mx-1 flex flex-col gap-1 rounded-md px-1 py-1 hover:bg-[#FAFAFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46BA]"
      >
        {isEmpty ? (
          <div className="text-[13px] text-[#6B6A7E]">No leads sent yet</div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold leading-none text-[#161528]">
              {metric.syncedCount}
            </span>
            <span className="text-[12px] text-[#6B6A7E]">
              of {metric.relevantCount}
            </span>
            <Chip tone="accent">{metric.syncedPct}%</Chip>
          </div>
        )}
        <div className="text-[11px] text-[#8A8A9B]">{metric.windowLabel}</div>
      </Link>

      {!metric.flagEnabled && (
        <div className="text-[11px] text-[#8A8A9B]">
          Close sync disabled — flip{' '}
          <code className="rounded bg-[#EEEFF3] px-1 py-0.5 text-[10px] text-[#4B4A5E]">
            close_sync.enabled
          </code>{' '}
          to start syncing.
        </div>
      )}
    </div>
  )
}
