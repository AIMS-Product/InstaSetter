'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ObjectionConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText, StatPill } from './shared'

export function ObjectionPanel({ config }: { config: ObjectionConfig }) {
  return (
    <>
      <PanelCard
        title="Response structure"
        locked
        subtitle="Every objection reply follows this exact sequence. Skipping the probe kills conversion."
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {config.structure.map((step, i) => (
            <div
              key={step}
              style={{
                flex: 1,
                padding: '8px 10px',
                background: B.accentSoft,
                color: B.accentInk,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
                textTransform: 'capitalize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span style={{ opacity: 0.55 }}>{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard
        title={`Typed handlers · ${config.handlers.length}`}
        subtitle="Sorted by frequency in 5,438 classified conversations."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.handlers.map((h) => (
            <HandlerRow key={h.type} handler={h} />
          ))}
        </div>
      </PanelCard>
    </>
  )
}

function HandlerRow({
  handler,
}: {
  handler: ObjectionConfig['handlers'][number]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        background: B.bg,
        border: `1px solid ${B.line}`,
        borderRadius: 8,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
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
        <div style={{ fontSize: 13, color: B.ink, fontWeight: 500, flex: 1 }}>
          {handler.label}
        </div>
        <StatPill>
          {handler.occurrences}× · {handler.resolutionPct}% resolved
        </StatPill>
      </button>
      {open && (
        <div
          style={{
            padding: '0 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: B.ink3,
                marginBottom: 4,
              }}
            >
              Opener
            </div>
            <ReadOnlyText value={handler.opener} />
          </div>
          {handler.followUps.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: B.ink3,
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Follow-ups <LockPill />
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {handler.followUps.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 12,
                      color: B.ink2,
                      background: B.lineSoft,
                      padding: '7px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
