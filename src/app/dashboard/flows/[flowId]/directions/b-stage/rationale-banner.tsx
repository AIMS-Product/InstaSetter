'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { B } from './palette'

export function RationaleBanner({
  rationale,
  stat,
}: {
  rationale: string[]
  stat?: string
}) {
  const [open, setOpen] = useState(false)
  if (rationale.length === 0 && !stat) return null
  return (
    <div
      style={{
        background: B.accentSoft,
        borderRadius: 10,
        marginBottom: 14,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '9px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <Sparkles size={13} color={B.accentInk} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: B.accentInk,
          }}
        >
          Why this block exists
        </span>
        <span style={{ flex: 1 }} />
        {stat && (
          <span
            style={{
              fontSize: 10.5,
              color: B.accentInk,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.6)',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            {stat}
          </span>
        )}
        {open ? (
          <ChevronDown size={13} color={B.accentInk} />
        ) : (
          <ChevronRight size={13} color={B.accentInk} />
        )}
      </button>
      {open && rationale.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 12px 12px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {rationale.map((r, i) => (
            <li
              key={i}
              style={{
                fontSize: 12,
                color: B.accentInk,
                lineHeight: 1.5,
                position: 'relative',
              }}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: -14,
                  opacity: 0.6,
                }}
              >
                •
              </span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
