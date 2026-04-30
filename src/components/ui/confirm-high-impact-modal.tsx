'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const REASON_LIMIT = 240

export type ConfirmHighImpactModalMode = 'save' | 'restore'

export interface ConfirmHighImpactModalCopy {
  /** Modal heading. */
  title: string
  /** Body paragraph above the reason input. */
  description: string
  /** Reason field label. */
  reasonLabel: string
  /** Reason field placeholder hint. */
  reasonPlaceholder?: string
  /** Confirm button label. */
  confirmLabel: string
  /** Discard / cancel button label. */
  discardLabel: string
  /** Optional secondary text under the reason field. */
  helper?: string
}

const DEFAULT_SAVE_COPY: ConfirmHighImpactModalCopy = {
  title: 'Confirm a high-impact change',
  description:
    'This change affects what prospects see. Add a one-line reason so the team can review it later.',
  reasonLabel: 'Why did you change this?',
  reasonPlaceholder: 'e.g. Updated the post-email confirmation copy',
  confirmLabel: 'Save and record version',
  discardLabel: 'Discard change',
  helper: 'No live IG DMs change yet — the draft is what saves.',
}

const DEFAULT_RESTORE_COPY: ConfirmHighImpactModalCopy = {
  title: 'Restore this version?',
  description:
    'This will replace the current draft with the contents of the selected version. The current draft is snapshotted automatically. No live IG DMs change.',
  reasonLabel: 'Why are you rolling back? (optional)',
  reasonPlaceholder: 'e.g. Reverting an over-promise in the post-email copy',
  confirmLabel: 'Restore version',
  discardLabel: 'Cancel',
  helper: 'A new version row records the restore.',
}

export function defaultModalCopy(
  mode: ConfirmHighImpactModalMode
): ConfirmHighImpactModalCopy {
  return mode === 'save' ? DEFAULT_SAVE_COPY : DEFAULT_RESTORE_COPY
}

/**
 * Modal that fires on the next autosave tick when at least one high-impact
 * field is dirty. Re-used for the rollback confirmation as well — pass
 * `mode="restore"` and the matching copy.
 *
 * A11y: focus traps inside the dialog, Escape triggers Discard, the reason
 * textarea receives initial focus, the Confirm button is disabled until the
 * reason is non-empty (only when `requireReason` is true — saves require a
 * reason; restores leave it optional).
 */
export function ConfirmHighImpactModal({
  open,
  mode = 'save',
  copy,
  changedFieldSummary,
  requireReason,
  onConfirm,
  onDiscard,
}: {
  open: boolean
  mode?: ConfirmHighImpactModalMode
  copy?: Partial<ConfirmHighImpactModalCopy>
  changedFieldSummary?: string[]
  requireReason?: boolean
  onConfirm: (reason: string) => void | Promise<void>
  onDiscard: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleId = useId()
  const descId = useId()
  const helperId = useId()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reasonRequired = requireReason ?? mode === 'save'
  const merged: ConfirmHighImpactModalCopy = {
    ...defaultModalCopy(mode),
    ...copy,
  }
  const trimmedReason = reason.trim()
  const tooLong = trimmedReason.length > REASON_LIMIT
  const canConfirm =
    !submitting && !tooLong && (!reasonRequired || trimmedReason.length > 0)

  useEffect(() => {
    if (!open) return
    setReason('')
    setSubmitting(false)
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
    return () => {
      window.clearTimeout(focusTimer)
      previousFocusRef.current?.focus()
    }
  }, [open])

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      if (!canConfirm) return
      setSubmitting(true)
      try {
        await onConfirm(trimmedReason)
      } finally {
        setSubmitting(false)
      }
    },
    [canConfirm, onConfirm, trimmedReason]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onDiscard()
        return
      }
      if (event.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusable.length === 0) {
        event.preventDefault()
        root.focus()
        return
      }
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const current = document.activeElement
      if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onDiscard, open]
  )

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(20, 20, 40, 0.32)',
        padding: 16,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          color: '#161528',
          border: '1px solid #E5E6EC',
          borderRadius: 12,
          boxShadow: '0 20px 50px rgba(20, 20, 40, 0.18)',
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              height: 8,
              width: 8,
              borderRadius: 999,
              background: '#C77B12',
            }}
          />
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: -0.2,
            }}
          >
            {merged.title}
          </h2>
        </div>
        <p
          id={descId}
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            lineHeight: 1.55,
            color: '#3A394A',
          }}
        >
          {merged.description}
        </p>

        {changedFieldSummary && changedFieldSummary.length > 0 && (
          <ul
            aria-label="Fields that will save"
            style={{
              margin: '0 0 14px',
              padding: '8px 12px',
              listStyle: 'disc inside',
              fontSize: 12,
              color: '#3A394A',
              background: '#F8F8FB',
              border: '1px solid #EEEFF3',
              borderRadius: 8,
            }}
          >
            {changedFieldSummary.slice(0, 6).map((line) => (
              <li key={line} style={{ lineHeight: 1.6 }}>
                {line}
              </li>
            ))}
            {changedFieldSummary.length > 6 && (
              <li style={{ lineHeight: 1.6, color: '#6B6A7E' }}>
                +{changedFieldSummary.length - 6} more
              </li>
            )}
          </ul>
        )}

        <form onSubmit={handleSubmit}>
          <label
            htmlFor={`${titleId}-reason`}
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#3A394A',
              marginBottom: 6,
            }}
          >
            {merged.reasonLabel}
            {reasonRequired && (
              <span style={{ color: '#C13A3A', marginLeft: 4 }}>*</span>
            )}
          </label>
          <textarea
            id={`${titleId}-reason`}
            ref={textareaRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={merged.reasonPlaceholder}
            maxLength={REASON_LIMIT + 40}
            rows={3}
            aria-describedby={helperId}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #DDDEE6',
              background: '#FFFFFF',
              fontSize: 13,
              lineHeight: 1.5,
              color: '#161528',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <div
            id={helperId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 6,
              fontSize: 11,
              color: tooLong ? '#C13A3A' : '#6B6A7E',
            }}
          >
            <span>{merged.helper}</span>
            <span aria-live="polite">
              {trimmedReason.length}/{REASON_LIMIT}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={onDiscard}
              disabled={submitting}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #DDDEE6',
                background: '#FFFFFF',
                color: '#3A394A',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {merged.discardLabel}
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #2B2A3E',
                background: canConfirm ? '#161528' : '#9C9BAB',
                color: '#FFFFFF',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: canConfirm ? 'pointer' : 'not-allowed',
              }}
            >
              {merged.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
