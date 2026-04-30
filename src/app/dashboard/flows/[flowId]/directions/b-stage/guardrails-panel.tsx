'use client'

import { useState } from 'react'
import { Lock, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import {
  getLockBySourceHint,
  type LockId,
} from '@/lib/dashboard/flow-builder-locks'
import { LockPill } from './block-panels/shared'
import type { Guardrail } from '../../types'
import { B } from './palette'

// `guardrails.global` is referenced from the LockPill below — keep this id
// literal so the catalog drift-guard test resolves it via the source scan.
const GLOBAL_GUARDRAIL_LOCK_ID = 'guardrails.global' as const

export function GuardrailsPanel({
  guardrails,
  onOpenSource,
}: {
  guardrails: Guardrail[]
  onOpenSource?: (source: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (guardrails.length === 0) return null

  return (
    <div
      style={{
        background: B.bg,
        border: `1px solid ${B.line}`,
        borderRadius: 10,
        marginTop: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          aria-expanded={open}
          aria-label={
            open
              ? `Collapse ${FLOW_BUILDER_LABELS.panelSections.lockedSafetyRules.display}`
              : `Expand ${FLOW_BUILDER_LABELS.panelSections.lockedSafetyRules.display}`
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            padding: 0,
          }}
        >
          {open ? (
            <ChevronDown size={14} color={B.ink3} />
          ) : (
            <ChevronRight size={14} color={B.ink3} />
          )}
          <Lock size={13} color={B.ink3} />
          <span
            style={{ fontSize: 12, fontWeight: 600, color: B.ink2 }}
            title={FLOW_BUILDER_LABELS.panelSections.lockedSafetyRules.tooltip}
          >
            {FLOW_BUILDER_LABELS.panelSections.lockedSafetyRules.display} ·{' '}
            {guardrails.length}
          </span>
        </button>
        <LockPill id={GLOBAL_GUARDRAIL_LOCK_ID} />
      </div>
      {open && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {guardrails.map((g) => {
            const catalogEntry = getLockBySourceHint(g.source)
            return (
              <li
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  background: B.panel,
                  border: `1px solid ${B.line}`,
                  borderRadius: 8,
                }}
              >
                <Lock
                  size={11}
                  color={B.ink3}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: B.ink }}>{g.text}</div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: B.ink3,
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {g.why}
                  </div>
                </div>
                {catalogEntry && catalogEntry.kind === 'admin' && (
                  <LockPill id={catalogEntry.id as LockId} />
                )}
                {onOpenSource && (
                  <button
                    type="button"
                    onClick={() => onOpenSource(g.source)}
                    title={`Open ${g.source}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      color: B.ink3,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
