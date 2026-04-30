'use client'

import { Lock } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import {
  FLOW_BUILDER_LOCKS,
  type LockEntry,
  type LockId,
  type LockKind,
} from '@/lib/dashboard/flow-builder-locks'
import { LockPopover } from '@/components/ui/lock-popover'
import { B } from '../palette'

export function PanelCard({
  title,
  subtitle,
  locked,
  lockId,
  children,
  action,
}: {
  title: string
  subtitle?: string
  /** Legacy prop — renders a default safety pill when no lockId is provided. */
  locked?: boolean
  /** Catalog lookup. When set, renders the catalog-aware LockPill. */
  lockId?: LockId
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section
      style={{
        background: B.panel,
        border: `1px solid ${B.line}`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.ink2,
          }}
        >
          {title}
        </div>
        {lockId ? <LockPill id={lockId} /> : locked ? <LockPill /> : null}
        <span style={{ flex: 1 }} />
        {action}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11.5, color: B.ink3, marginBottom: 8 }}>
          {subtitle}
        </div>
      )}
      {children}
    </section>
  )
}

export function LockPill({
  id,
  kind: kindOverride,
  title,
}: {
  /** Catalog lookup. When set, kind/tooltip auto-derive from the catalog. */
  id?: LockId
  /** Override kind if no catalog id is supplied. Default: `safety`. */
  kind?: LockKind
  /** Override hover tooltip if no catalog id is supplied. */
  title?: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const [open, setOpen] = useState(false)

  const entry: LockEntry | null = id ? (FLOW_BUILDER_LOCKS[id] ?? null) : null
  const kind: LockKind = entry?.kind ?? kindOverride ?? 'safety'
  const labels =
    kind === 'admin'
      ? FLOW_BUILDER_LABELS.locks.admin
      : FLOW_BUILDER_LABELS.locks.safety
  const hoverTitle = entry?.tooltip ?? title ?? labels.tooltip

  const isAdmin = kind === 'admin'
  const background = isAdmin ? '#FFF4D9' : B.lineSoft
  const color = isAdmin ? '#7A4B00' : B.ink3
  const ariaLabel = entry
    ? `${labels.display}: ${entry.surface}`
    : `${labels.display} rule`

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        title={hoverTitle}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 6px',
          borderRadius: 999,
          background,
          color,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Lock size={9} /> {labels.display}
      </button>
      {open && entry && (
        <LockPopover
          id={popoverId}
          entry={entry}
          anchorRef={buttonRef}
          onClose={() => setOpen(false)}
        />
      )}
      {open && !entry && (
        <LockPopover
          id={popoverId}
          entry={{
            id: 'legacy',
            kind,
            surface: title ?? labels.display,
            tooltip: hoverTitle,
            escalation: isAdmin
              ? FLOW_BUILDER_LABELS.locks.askJames.display
              : null,
            highImpact: kind === 'safety',
          }}
          anchorRef={buttonRef}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  )
}

export function ReadOnlyText({
  value,
  rows,
}: {
  value: string
  rows?: number
}) {
  return (
    <div
      style={{
        padding: '9px 11px',
        background: B.lineSoft,
        borderRadius: 7,
        fontSize: 12.5,
        lineHeight: 1.5,
        color: B.ink,
        whiteSpace: 'pre-wrap',
        minHeight: rows ? rows * 18 : undefined,
      }}
    >
      {value || <span style={{ color: B.ink3 }}>—</span>}
    </div>
  )
}

export function StatPill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        background: B.accentSoft,
        color: B.accentInk,
        fontSize: 10.5,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  )
}
