'use client'

import { useState } from 'react'
import {
  BLOCK_BY_TYPE,
  CONVERSATION,
  SANS_FAMILY,
  SERIF_FAMILY,
  blockColor,
} from '../shared-data'
import type { BlockType, Palette } from '../types'
import RPHeader from './header'

interface Run {
  id: string
  handle: string
  at: string
  status:
    | 'active'
    | 'booked'
    | 'objection'
    | 'escalated'
    | 'waiting'
    | 'ghosted'
  block: BlockType
  turns: number
  outcome: string | null
  last: string
}

const RUNS: Run[] = [
  {
    id: 'r1',
    handle: '@ashford.k',
    at: '3m ago',
    status: 'active',
    block: 'qualifier',
    turns: 4,
    outcome: null,
    last: 'Dallas, 7K saved, ready',
  },
  {
    id: 'r2',
    handle: '@renee.rx',
    at: '12m ago',
    status: 'booked',
    block: 'summary',
    turns: 7,
    outcome: '+1 booking',
    last: 'cool see you thurs',
  },
  {
    id: 'r3',
    handle: '@travis.co',
    at: '28m ago',
    status: 'objection',
    block: 'objection',
    turns: 5,
    outcome: null,
    last: 'is this like another mlm',
  },
  {
    id: 'r4',
    handle: '@jules.van',
    at: '44m ago',
    status: 'escalated',
    block: 'escalation',
    turns: 9,
    outcome: 'handed off',
    last: 'the 15k seems crazy',
  },
  {
    id: 'r5',
    handle: '@d.wilkes',
    at: '1h ago',
    status: 'waiting',
    block: 'booking',
    turns: 6,
    outcome: null,
    last: 'dropping link now',
  },
  {
    id: 'r6',
    handle: '@mo.ramos',
    at: '2h ago',
    status: 'booked',
    block: 'summary',
    turns: 8,
    outcome: '+1 booking',
    last: 'sent email too',
  },
  {
    id: 'r7',
    handle: '@brea.kay',
    at: '2h ago',
    status: 'ghosted',
    block: 'followup',
    turns: 3,
    outcome: null,
    last: 'radio silence 24h',
  },
  {
    id: 'r8',
    handle: '@k.oduya',
    at: '3h ago',
    status: 'active',
    block: 'opening',
    turns: 2,
    outcome: null,
    last: 'yeah interested',
  },
]

const STATUS_TONE = (p: Palette) => ({
  active: { bg: p.accentSoft, fg: p.accentInk, label: 'Talking' },
  booked: { bg: '#E6EFE1', fg: '#2F4E2A', label: 'Booked' },
  objection: { bg: '#FBE7D9', fg: '#8B4316', label: 'Objection' },
  escalated: { bg: '#FAD9D9', fg: '#882828', label: 'Escalated' },
  waiting: { bg: '#F1ECDD', fg: '#6B5E3B', label: 'Waiting' },
  ghosted: { bg: '#ECECEC', fg: '#666', label: 'Ghosted' },
})

export default function PageRuns({ p }: { p: Palette }) {
  const [sel, setSel] = useState('r1')
  const run = RUNS.find((r) => r.id === sel) ?? RUNS[0]!
  const tones = STATUS_TONE(p)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RPHeader
        p={p}
        eyebrow="IG Organic DM"
        title="Conversations"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                background: p.lineSoft,
                borderRadius: 8,
                padding: 2,
                fontSize: 12,
              }}
            >
              {['Today', 'Week', 'Month'].map((t, i) => (
                <div
                  key={t}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    background: i === 0 ? p.panel : 'transparent',
                    color: i === 0 ? p.ink : p.ink2,
                    fontWeight: i === 0 ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <button
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${p.line}`,
                background: p.panel,
                fontSize: 12,
                color: p.ink2,
                cursor: 'pointer',
              }}
            >
              Export
            </button>
          </div>
        }
      />

      <div
        style={{
          padding: '18px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          background: p.panel,
          borderBottom: `1px solid ${p.line}`,
        }}
      >
        {[
          {
            k: '146',
            l: 'Started today',
            d: '+18 vs yesterday',
            good: true as const,
          },
          { k: '42', l: 'Booked', d: '29% conversion', good: true as const },
          {
            k: '11',
            l: 'Escalated',
            d: '3 price, 8 unqualified',
            good: false as const,
          },
          { k: '2.1m', l: 'Avg. response', d: 'p50 · p95 8m', good: null },
        ].map((s) => (
          <div
            key={s.l}
            style={{
              padding: '12px 16px',
              background: p.lineSoft,
              borderRadius: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: p.ink3,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              {s.l}
            </div>
            <div
              style={{
                fontSize: 26,
                color: p.ink,
                marginTop: 4,
                fontWeight: 500,
                fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
                letterSpacing: -0.3,
              }}
            >
              {s.k}
            </div>
            <div
              style={{
                fontSize: 11,
                color:
                  s.good === true
                    ? '#3A5A32'
                    : s.good === false
                      ? '#8B4316'
                      : p.ink3,
                marginTop: 2,
              }}
            >
              {s.d}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          style={{
            width: 360,
            borderRight: `1px solid ${p.line}`,
            overflow: 'auto',
            background: p.panel,
          }}
        >
          {RUNS.map((r) => {
            const tone = tones[r.status]
            const active = sel === r.id
            return (
              <div
                key={r.id}
                onClick={() => setSel(r.id)}
                style={{
                  padding: '13px 18px',
                  borderBottom: `1px solid ${p.lineSoft}`,
                  background: active ? p.sel : 'transparent',
                  cursor: 'pointer',
                  borderLeft: active
                    ? `3px solid ${p.accent}`
                    : '3px solid transparent',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: p.ink }}>
                    {r.handle}
                  </span>
                  <span style={{ fontSize: 10.5, color: p.ink3 }}>{r.at}</span>
                  <span style={{ flex: 1 }} />
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 500,
                      background: tone.bg,
                      color: tone.fg,
                    }}
                  >
                    {tone.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: p.ink2,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.last}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: p.ink3,
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: blockColor(r.block, { l: 0.55, c: 0.13 }),
                    }}
                  />
                  in {BLOCK_BY_TYPE[r.block]?.label} · {r.turns} turns
                </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            flex: 1,
            background: p.bg,
            overflow: 'auto',
            padding: '24px 32px',
          }}
        >
          <div
            style={{
              background: p.panel,
              borderRadius: 12,
              border: `1px solid ${p.line}`,
              padding: 22,
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${p.accent}, ${p.accentSoft})`,
                  display: 'grid',
                  placeItems: 'center',
                  color: p.panel,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {run.handle.slice(1, 3).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: p.ink }}>
                  {run.handle}
                </div>
                <div style={{ fontSize: 11.5, color: p.ink3 }}>
                  Instagram DM · started {run.at}
                </div>
              </div>
              <button
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${p.line}`,
                  background: p.panel,
                  fontSize: 12,
                  color: p.ink2,
                  cursor: 'pointer',
                }}
              >
                Replay in graph
              </button>
              <button
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: p.ink,
                  color: p.panel,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Take over →
              </button>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: p.sel,
                fontSize: 12,
                color: p.ink2,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: p.accent,
                }}
              />
              Currently in{' '}
              <b style={{ color: p.ink }}>{BLOCK_BY_TYPE[run.block]?.label}</b>{' '}
              · waiting on prospect response
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {CONVERSATION.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection:
                      m.role === 'prospect' ? 'row-reverse' : 'row',
                    gap: 8,
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '9px 13px',
                      borderRadius: 14,
                      background: m.role === 'prospect' ? p.ink : p.panel,
                      color: m.role === 'prospect' ? p.panel : p.ink,
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      border: m.role === 'bot' ? `1px solid ${p.line}` : 'none',
                      position: 'relative',
                    }}
                  >
                    {m.text}
                    {m.block && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -8,
                          left: 10,
                          fontSize: 9.5,
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: p.panel,
                          color: p.ink3,
                          border: `1px solid ${p.line}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: blockColor(m.block),
                          }}
                        />
                        {BLOCK_BY_TYPE[m.block]?.label}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 22,
                padding: 14,
                borderRadius: 10,
                border: `1px dashed ${p.line}`,
                background: p.lineSoft,
                fontSize: 12.5,
                color: p.ink2,
              }}
            >
              <div style={{ fontWeight: 500, color: p.ink, marginBottom: 4 }}>
                What Mike&rsquo;s thinking
              </div>
              Location{' '}
              <code
                style={{
                  background: p.panel,
                  padding: '1px 5px',
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                Dallas
              </code>
              , motivation{' '}
              <code
                style={{
                  background: p.panel,
                  padding: '1px 5px',
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                side income
              </code>{' '}
              — both set. Next turn will enter <b>Booking Handoff</b> and send
              the link.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
