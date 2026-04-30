import { useId } from 'react'
import type { SurfaceLabelState } from '@/lib/dashboard/surface-labels'
import { Chip } from './chip'

const STATE_DEFAULTS: Record<
  SurfaceLabelState,
  { display: string; tone: 'success' | 'neutral' | 'accent' | 'warn' }
> = {
  LIVE: { display: 'Live', tone: 'success' },
  READ_ONLY: { display: 'Read-only', tone: 'neutral' },
  COMING_SOON: { display: 'Coming soon', tone: 'accent' },
  UNDER_CONSTRUCTION: { display: 'Under construction', tone: 'warn' },
}

export interface SurfaceBadgeProps {
  state: SurfaceLabelState
  /** Optional override; defaults to the canonical state display. */
  display?: string
  /** One-sentence operator-facing detail. Surfaces via title + aria-describedby. */
  detail?: string
  /**
   * When true (default), expose the detail to screen readers via
   * aria-describedby. Set false when the parent already announces the detail.
   */
  withDescription?: boolean
  className?: string
}

/**
 * Per-surface scope badge ("Live", "Read-only", "Coming soon", "Under
 * construction"). Composes the existing `Chip` tone palette so colours stay
 * consistent across the dashboard. Designed to sit alongside page titles in
 * each `/dashboard/*` surface so operators can tell what is usable now versus
 * still being wired up at a glance.
 */
export function SurfaceBadge({
  state,
  display,
  detail,
  withDescription = true,
  className = '',
}: SurfaceBadgeProps) {
  const defaults = STATE_DEFAULTS[state]
  const labelText = display ?? defaults.display
  const describedById = useId()
  const shouldDescribe = withDescription && Boolean(detail)

  return (
    <>
      <Chip
        tone={defaults.tone}
        dot
        role="status"
        aria-label={labelText}
        aria-describedby={shouldDescribe ? describedById : undefined}
        title={detail}
        className={className}
      >
        {labelText}
      </Chip>
      {shouldDescribe && (
        <span id={describedById} className="sr-only">
          {detail}
        </span>
      )}
    </>
  )
}
