'use client'

// P4.05 — dev-only debug overlay for the rationale-panel decision experiment.
//
// Mounts a fixed-position pill in the top-right corner of the workspace and
// reads `getRationaleEventCounts()` once per second so QA can verify the
// instrumentation fires on click. NEVER exposed to operators in production:
// the overlay only renders when:
//   1. The URL carries `?debug=rationale`, AND
//   2. `process.env.NODE_ENV === 'development'`.
//
// Both gates must pass. The first prevents the overlay from leaking onto a
// customer demo; the second prevents `?debug=rationale` from being a
// supported URL surface in any production build.

import { useEffect, useState } from 'react'

import {
  getRationaleEventCounts,
  type RationaleEvent,
} from '@/lib/services/rationale-events'
import { B } from './palette'

const POLL_INTERVAL_MS = 1000

const ROW_LABELS: Record<RationaleEvent['type'], string> = {
  'rationale.variant_loaded': 'variant_loaded',
  'rationale.expanded': 'expanded',
  'rationale.collapsed': 'collapsed',
  'rationale.prompt_reader_opened': 'prompt_reader_opened',
}

function isOverlayEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('debug') === 'rationale'
}

export function RationaleDebugOverlay() {
  // Initialize from a function so the URL check runs once at mount and
  // we never call setState in an effect (eslint react-hooks rule).
  const [enabled] = useState(() => isOverlayEnabled())
  const [counts, setCounts] = useState(() => getRationaleEventCounts())

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      setCounts(getRationaleEventCounts())
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      role="status"
      aria-label="Rationale instrumentation debug counters"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 1000,
        padding: '10px 12px',
        borderRadius: 10,
        background: B.panel,
        border: `1px solid ${B.line}`,
        boxShadow: '0 8px 24px rgba(22,21,40,0.10)',
        color: B.ink,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: 11,
        lineHeight: 1.5,
        minWidth: 220,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: B.ink2,
          marginBottom: 6,
        }}
      >
        rationale debug
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {(
          Object.entries(ROW_LABELS) as Array<[RationaleEvent['type'], string]>
        ).map(([key, label]) => (
          <li
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '2px 0',
            }}
          >
            <span style={{ color: B.ink3 }}>{label}</span>
            <span style={{ color: B.ink, fontWeight: 600 }}>{counts[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
