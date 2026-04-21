'use client'

import { useState } from 'react'
import { Lock, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { Guardrail } from '../../types'
import { B } from './palette'

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
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {open ? (
          <ChevronDown size={14} color={B.ink3} />
        ) : (
          <ChevronRight size={14} color={B.ink3} />
        )}
        <Lock size={13} color={B.ink3} />
        <span style={{ fontSize: 12, fontWeight: 600, color: B.ink2 }}>
          Locked guardrails · {guardrails.length}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: B.ink3 }}>
          engineering-owned · applies at runtime
        </span>
      </button>
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
          {guardrails.map((g) => (
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
          ))}
        </ul>
      )}
    </div>
  )
}
