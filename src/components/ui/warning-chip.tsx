import type { ComponentPropsWithoutRef } from 'react'

/**
 * Inline amber chip surfaced next to a high-impact field while it is dirty
 * (P4.04). The Flow Builder workspace has no explicit save button, so this
 * is the operator's first clue that the next autosave tick will fire the
 * confirmation modal instead of saving silently.
 *
 * Light-theme amber styling matches the email panel's "No automatic
 * delivery" warning at `email.tsx`. ARIA `role="status"` so screen readers
 * announce it as a non-blocking advisory, not an alert.
 */
export function WarningChip({
  message,
  className = '',
  ...rest
}: ComponentPropsWithoutRef<'span'> & { message: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-md border border-[#F5DCAA] bg-[#FFF7E6] px-2 py-1 text-[11.5px] font-medium leading-tight text-[#7A4B00] ${className}`}
      {...rest}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C77B12]"
      />
      <span>{message}</span>
    </span>
  )
}
