'use client'

import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import type { LockEntry } from '@/lib/dashboard/flow-builder-locks'

const PALETTE = {
  bg: '#FFFFFF',
  border: '#E5E6EC',
  ink: '#161528',
  ink2: '#3A394A',
  ink3: '#6B6A7E',
  ringSafety: '#EFEFF3',
  ringAdmin: '#FFEDB8',
  // Light theme; matches Linear/Vercel/Stripe aesthetic.
}

/**
 * Click-popover surfaced by `LockPill`. Shows the catalog tooltip + the
 * "Ask James" escalation when the lock is admin-classified.
 *
 * A11y:
 *  - role="dialog" + aria-labelledby pointing at the heading
 *  - Escape and outside-click both close
 *  - focus moves into the popover on open and back to the trigger on close
 */
export function LockPopover({
  id,
  entry,
  anchorRef,
  onClose,
}: {
  id: string
  entry: LockEntry
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingId = `${id}-heading`

  useEffect(() => {
    const target = dialogRef.current
    if (!target) return
    // Focus the close button so keyboard users can dismiss right away.
    const focusable = target.querySelector<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
  }, [])

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const dialog = dialogRef.current
      const anchor = anchorRef.current
      if (!dialog) return
      const target = e.target as Node | null
      if (!target) return
      if (dialog.contains(target)) return
      if (anchor && anchor.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [anchorRef, onClose])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      anchorRef.current?.focus()
    }
  }

  const isAdmin = entry.kind === 'admin'
  const ringColor = isAdmin ? PALETTE.ringAdmin : PALETTE.ringSafety
  const tag = isAdmin
    ? FLOW_BUILDER_LABELS.locks.admin.display
    : FLOW_BUILDER_LABELS.locks.safety.display

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        zIndex: 50,
        minWidth: 240,
        maxWidth: 320,
        padding: 12,
        background: PALETTE.bg,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(20, 20, 40, 0.12)',
        textAlign: 'left',
        textTransform: 'none',
        letterSpacing: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: ringColor,
            color: PALETTE.ink2,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {tag}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: PALETTE.ink,
          }}
        >
          {entry.surface}
        </span>
      </div>
      <div
        id={headingId}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: PALETTE.ink3,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: 4,
        }}
      >
        {FLOW_BUILDER_LABELS.locks.popoverHeading.display}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: PALETTE.ink2,
        }}
      >
        {entry.tooltip}
      </p>
      {entry.escalation && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: '#FFF7E6',
            color: '#7A4B00',
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {entry.escalation}
        </div>
      )}
      <div style={{ marginTop: 10, textAlign: 'right' }}>
        <button
          type="button"
          onClick={() => {
            onClose()
            anchorRef.current?.focus()
          }}
          style={{
            background: 'transparent',
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11.5,
            color: PALETTE.ink2,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
