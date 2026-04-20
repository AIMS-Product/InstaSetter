'use client'

import { useState } from 'react'
import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import { useFlowActions, useFlowState } from '../store'
import type { Palette } from '../types'
import RPHeader from './header'

export default function PageVersions({ p }: { p: Palette }) {
  const state = useFlowState()
  const actions = useFlowActions()
  const versions = state.versions
  const [sel, setSel] = useState<number>(state.draftVersion)
  const tones = {
    draft: { bg: p.accentSoft, fg: p.accentInk, label: 'Draft' },
    live: { bg: '#E6EFE1', fg: '#3A5A32', label: 'Live' },
    archived: { bg: p.lineSoft, fg: p.ink3, label: 'Archived' },
  }
  const cur = versions.find((v) => v.v === sel) ?? versions[0]!

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <RPHeader
        p={p}
        eyebrow={state.flow.name}
        title="Version history"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => actions.publish()}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                background: p.accent,
                color: p.panel,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Publish draft v{state.draftVersion}
            </button>
          </div>
        }
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          style={{
            width: 380,
            borderRight: `1px solid ${p.line}`,
            overflow: 'auto',
            background: p.panel,
          }}
        >
          {versions.map((v) => {
            const t = tones[v.status]
            const active = sel === v.v
            return (
              <div
                key={v.v}
                onClick={() => setSel(v.v)}
                style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${p.lineSoft}`,
                  background: active ? p.sel : 'transparent',
                  borderLeft: active
                    ? `3px solid ${p.accent}`
                    : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: p.ink,
                      fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
                    }}
                  >
                    v{v.v}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 500,
                      background: t.bg,
                      color: t.fg,
                    }}
                  >
                    {t.label}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: p.ink3 }}>{v.at}</span>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: p.ink2,
                    marginBottom: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {v.note ?? '—'}
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
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 18,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 500,
                  color: p.ink,
                  fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
                  letterSpacing: -0.3,
                }}
              >
                Version {cur.v}
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: tones[cur.status].bg,
                  color: tones[cur.status].fg,
                }}
              >
                {tones[cur.status].label}
              </span>
              <span style={{ flex: 1 }} />
              {cur.status === 'archived' && (
                <button
                  onClick={() => actions.rollback(cur.v)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: `1px solid ${p.line}`,
                    background: p.panel,
                    fontSize: 12,
                    color: p.ink2,
                    cursor: 'pointer',
                  }}
                >
                  ↻ Roll back to v{cur.v}
                </button>
              )}
            </div>

            <div
              style={{
                fontSize: 13.5,
                color: p.ink2,
                marginBottom: 22,
                lineHeight: 1.5,
              }}
            >
              &ldquo;{cur.note ?? '—'}&rdquo; · {cur.at}.
            </div>

            {cur.status === 'live' && (
              <div
                style={{
                  marginTop: 0,
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: '#E6EFE1',
                  fontSize: 12.5,
                  color: '#3A5A32',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 16 }}>●</span>
                Serving all new conversations. In-flight conversations stay on
                their started version.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
