'use client'

import {
  BLOCK_BY_TYPE,
  MONO_FAMILY,
  SANS_FAMILY,
  SERIF_FAMILY,
  blockColor,
} from '../shared-data'
import { useFlowState } from '../store'
import {
  StatusBadge,
  StatusNote,
  VARIABLE_REFERENCE_STATUS,
} from '../surface-status'
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
        eyebrow="Reference"
        title="Variables"
        description="A plain-English map of what the bot remembers, where those values are captured, and which details persist across conversations."
        right={
          <StatusBadge
            p={p}
            label={VARIABLE_REFERENCE_STATUS.label}
            tone="neutral"
          />
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 18,
          }}
        >
          {SCOPES.map((sc) => (
            <ScopeCard
              key={sc.key}
              p={p}
              label={sc.label}
              description={sc.sub}
              count={grouped[sc.key].length}
              sample={grouped[sc.key][0]}
            />
          ))}
        </div>
        <div style={{ marginBottom: 26 }}>
          <StatusNote
            p={p}
            label={VARIABLE_REFERENCE_STATUS.label}
            detail={VARIABLE_REFERENCE_STATUS.detail}
            tone="neutral"
            role="note"
          />
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
                  gridTemplateColumns: '1.3fr 1fr 0.7fr 1.3fr',
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
                <span>Draft value</span>
                <span>Type</span>
                <span>Captured by</span>
              </div>
              {grouped[sc.key].map((v) => {
                const fullKey = `${v.scope}.${v.key}`
                const capturedById = captureMap.get(fullKey) ?? v.capturedBy
                return (
                  <div
                    key={v.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.3fr 1fr 0.7fr 1.3fr',
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

function ScopeCard({
  p,
  label,
  description,
  count,
  sample,
}: {
  p: Palette
  label: string
  description: string
  count: number
  sample?: Variable
}) {
  return (
    <div
      style={{
        padding: '16px 16px 14px',
        background: p.panel,
        border: `1px solid ${p.line}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: p.ink,
            fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
          }}
        >
          {label}
        </div>
        <span style={{ fontSize: 11.5, color: p.ink3 }}>{count} total</span>
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: p.ink2,
          lineHeight: 1.55,
          minHeight: 58,
        }}
      >
        {description}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: p.ink3,
          lineHeight: 1.45,
        }}
      >
        {sample ? (
          <>
            Example:{' '}
            <code
              style={{
                fontFamily: MONO_FAMILY,
                fontSize: 11,
                color: p.ink,
              }}
            >
              {sample.scope}.{sample.key}
            </code>
          </>
        ) : (
          'No variables in this scope yet.'
        )}
      </div>
    </div>
  )
}
