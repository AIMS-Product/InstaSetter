'use client'

import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { B } from '../palette'

export function PanelCard({
  title,
  subtitle,
  locked,
  children,
  action,
}: {
  title: string
  subtitle?: string
  locked?: boolean
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
        {locked && <LockPill />}
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

export function LockPill({ title }: { title?: string }) {
  return (
    <span
      title={title ?? 'Fixed by InstaSetter for safety and compliance'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        borderRadius: 999,
        background: B.lineSoft,
        color: B.ink3,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      <Lock size={9} /> fixed
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
