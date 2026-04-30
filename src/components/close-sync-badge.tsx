import type { CloseSyncState } from '@/lib/services/conversation-viewer-types'
import { Chip } from '@/components/ui/chip'

// The badge surfaces the latest lead's Close-CRM sync state alongside the
// conversation status. Returning null for "not synced" is intentional —
// most rows lack a lead until the bot fires generate_summary, so an
// always-on badge would make the inbox noisy. See P3.02 spec for the
// full state matrix.
//
// Click-through opens https://app.close.com/lead/{id}/ in a new tab.
// We hardcode the URL template (Close's `html_url` field is documented
// to use this exact shape) rather than fetching per-call.

interface CloseSyncBadgeProps {
  sync: CloseSyncState | null
  size?: 'sm' | 'md'
  className?: string
}

const ERROR_TITLE_MAX = 140

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  // Reserve one char for the ellipsis so the rendered string never
  // exceeds `max`.
  return `${value.slice(0, max - 1)}…`
}

function buildCloseUrl(closeLeadId: string): string {
  // Pre-encoded just in case Close ever issues IDs with reserved chars;
  // current `lead_xxx` IDs are safe URL components but defensive code
  // here means the link doesn't break when format evolves.
  return `https://app.close.com/lead/${encodeURIComponent(closeLeadId)}/`
}

export function CloseSyncBadge({
  sync,
  size = 'sm',
  className = '',
}: CloseSyncBadgeProps) {
  if (!sync) return null

  // No-show states. `skipped` = brand flag off / cold lead skipped.
  // `pending` with zero attempts = waiting for the orchestrator to fire.
  // Both are operationally "not yet synced" — keep the row uncluttered.
  if (sync.status === 'skipped') return null
  if (sync.status === 'pending' && sync.attempts === 0) return null

  const sizeClass = size === 'md' ? 'text-xs' : ''
  const composed = `${sizeClass} ${className}`.trim()

  if (sync.status === 'sent') {
    const label = 'Sent to Close'
    if (sync.closeLeadId) {
      return (
        <a
          href={buildCloseUrl(sync.closeLeadId)}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Sent to Close — open lead in new tab"
          className="no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6B3A] rounded-full"
        >
          <Chip tone="success" dot className={composed}>
            {label}
          </Chip>
        </a>
      )
    }
    // Race: sent but `close_crm_id` not yet written. Show the pill,
    // skip the link — keeps the operator informed without a dead URL.
    return (
      <Chip tone="success" dot aria-label="Sent to Close" className={composed}>
        {label}
      </Chip>
    )
  }

  if (sync.status === 'failed' || sync.status === 'failed_permanent') {
    const errorPreview = sync.errorMessage
      ? truncate(sync.errorMessage, ERROR_TITLE_MAX)
      : 'Close sync failed'
    return (
      <Chip
        tone="danger"
        dot
        title={errorPreview}
        aria-label={`Close sync failed: ${errorPreview}`}
        className={composed}
      >
        <span aria-hidden>Close sync failed</span>
        <span className="sr-only">{errorPreview}</span>
      </Chip>
    )
  }

  // status === 'pending' with attempts >= 1 — orchestrator has tried at
  // least once and is in the retry window.
  return (
    <Chip tone="warn" dot aria-label="Syncing to Close" className={composed}>
      Syncing to Close…
    </Chip>
  )
}
