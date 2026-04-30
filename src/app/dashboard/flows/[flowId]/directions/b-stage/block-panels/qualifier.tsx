'use client'

import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import type { QualifierConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

export function QualifierPanel({ config }: { config: QualifierConfig }) {
  return (
    <>
      <PanelCard
        title={`${FLOW_BUILDER_LABELS.panelSections.qualifierList.display} · need at least ${config.minToBook}`}
        locked
        subtitle="Ordered by priority. Location first — it's the highest-rapport qualifier."
      >
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {config.qualifiers.map((q) => (
            <li
              key={q.key}
              style={{
                padding: '10px 12px',
                background: B.bg,
                border: `1px solid ${B.line}`,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: B.accentSoft,
                    color: B.accentInk,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {q.priority}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: B.ink,
                  }}
                >
                  {q.label}
                </div>
                {q.locked && <LockPill title="Order is locked" />}
              </div>
              <ReadOnlyText value={q.ask} />
              {q.rules.length > 0 && (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {q.rules.map((rule, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 11,
                        color: B.ink3,
                        lineHeight: 1.45,
                        paddingLeft: 10,
                      }}
                    >
                      — {rule}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </PanelCard>

      {config.thresholds.length > 0 && (
        <PanelCard
          title={FLOW_BUILDER_LABELS.panelSections.qualifierThresholds.display}
          locked
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            {config.thresholds.map((t) => (
              <div
                key={t.name}
                style={{
                  padding: '10px 11px',
                  background: B.bg,
                  borderRadius: 8,
                  border: `1px solid ${B.line}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: B.ink2,
                    marginBottom: 4,
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontSize: 12, color: B.ink, lineHeight: 1.5 }}>
                  {t.criteria}
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      )}
    </>
  )
}
