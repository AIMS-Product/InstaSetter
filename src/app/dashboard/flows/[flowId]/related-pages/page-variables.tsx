'use client'

import {
  BLOCK_BY_TYPE,
  MONO_FAMILY,
  SANS_FAMILY,
  SERIF_FAMILY,
  blockColor,
} from '../shared-data'
import { useFlowState } from '../store'
import type { BlockType, Palette, Variable } from '../types'
import RPHeader from './header'

const SCOPES: Array<{
  key: Variable['scope']
  label: string
  sub: string
}> = [
  {
    key: 'brand',
    label: 'Brand',
    sub: 'Set once per brand. Booking link, brand name, timezone.',
  },
  {
    key: 'contact',
    label: 'Contact',
    sub: 'Persists across conversations with a person.',
  },
  {
    key: 'conversation',
    label: 'Conversation',
    sub: 'One DM thread only. Resets next time.',
  },
]

export default function PageVariables({ p }: { p: Palette }) {
  const state = useFlowState()
  const allVars = state.variables

  // Augment contact vars with capturing blocks from current flow
  const captureMap = new Map<string, BlockType>()
  state.flow.nodes.forEach((n) => {
    n.captures.forEach((c) => {
      captureMap.set(c.variable, n.id)
    })
  })

  const grouped = {
    brand: allVars.filter((v) => v.scope === 'brand'),
    contact: allVars.filter((v) => v.scope === 'contact'),
    conversation: allVars.filter((v) => v.scope === 'conversation'),
  } as const

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <RPHeader
        p={p}
        eyebrow="Library"
        title="Variables"
        right={
          <button
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              background: p.ink,
              color: p.panel,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + New variable
          </button>
        }
      />
      <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
        <div
          style={{
            fontSize: 13.5,
            color: p.ink2,
            lineHeight: 1.55,
            marginBottom: 12,
          }}
        >
          What the bot remembers. <b>Brand</b> stays put forever, <b>Contact</b>{' '}
          follows a person across every conversation, and <b>Conversation</b> is
          scoped to a single thread.
        </div>
        <div
          role="note"
          style={{
            padding: '10px 12px',
            background: p.lineSoft,
            borderRadius: 8,
            fontSize: 12,
            color: p.ink3,
            marginBottom: 26,
          }}
        >
          Values populate at runtime from each conversation. Brand defaults in
          this editor now persist in the shared Supabase draft.
        </div>
        {SCOPES.map((sc) => (
          <div key={sc.key} style={{ marginBottom: 26 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 500,
                  color: p.ink,
                  fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
                }}
              >
                {sc.label}
              </h3>
              <span style={{ fontSize: 12, color: p.ink3 }}>{sc.sub}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: p.ink3 }}>
                {grouped[sc.key].length} variables
              </span>
            </div>
            <div
              style={{
                background: p.panel,
                border: `1px solid ${p.line}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 1fr 0.7fr 1.3fr 40px',
                  padding: '10px 14px',
                  background: p.lineSoft,
                  fontSize: 11,
                  color: p.ink3,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                <span>Name</span>
                <span>Current value</span>
                <span>Type</span>
                <span>Captured by</span>
                <span />
              </div>
              {grouped[sc.key].map((v) => {
                const fullKey = `${v.scope}.${v.key}`
                const capturedById = captureMap.get(fullKey) ?? v.capturedBy
                return (
                  <div
                    key={v.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.3fr 1fr 0.7fr 1.3fr 40px',
                      padding: '11px 14px',
                      borderTop: `1px solid ${p.lineSoft}`,
                      alignItems: 'center',
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <code
                        style={{
                          fontFamily: MONO_FAMILY,
                          fontSize: 12,
                          color: p.ink,
                        }}
                      >
                        {fullKey}
                      </code>
                    </div>
                    <div
                      style={{
                        color: p.ink,
                        fontWeight: v.value != null ? 500 : 400,
                      }}
                    >
                      {v.value != null ? (
                        String(v.value)
                      ) : (
                        <span style={{ color: p.ink3, fontStyle: 'italic' }}>
                          not set
                        </span>
                      )}
                    </div>
                    <div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: p.lineSoft,
                          color: p.ink2,
                          fontSize: 11,
                          fontFamily: MONO_FAMILY,
                        }}
                      >
                        {v.kind}
                      </span>
                    </div>
                    <div style={{ color: p.ink3, fontSize: 12 }}>
                      {capturedById ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: blockColor(capturedById),
                            }}
                          />
                          {BLOCK_BY_TYPE[capturedById]?.label ?? capturedById}
                        </span>
                      ) : v.scope === 'brand' ? (
                        'Set manually'
                      ) : (
                        '—'
                      )}
                    </div>
                    <div
                      style={{
                        color: p.ink3,
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      ⋯
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
