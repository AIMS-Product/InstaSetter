'use client'

import { FLOW_BUILDER_LABELS } from '@/lib/dashboard/flow-builder-labels'
import type { EscalationConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

export function EscalationPanel({ config }: { config: EscalationConfig }) {
  return (
    <>
      <PanelCard
        title={FLOW_BUILDER_LABELS.panelSections.escalationTriggers.display}
        lockId="escalation.requiredTriggers"
      >
        {config.triggers.length === 0 ? (
          <div style={{ fontSize: 12, color: B.ink3 }}>
            No explicit triggers defined in decision-routing.
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {config.triggers.map((t, i) => (
              <li
                key={i}
                style={{
                  padding: '5px 10px',
                  background: '#FAD9D9',
                  color: '#882828',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title="Handoff script">
        <ReadOnlyText value={config.handoffScript} rows={2} />
      </PanelCard>

      <PanelCard title="Capture method">
        <div
          style={{
            padding: '9px 11px',
            background: B.bg,
            borderRadius: 7,
            border: `1px solid ${B.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <code
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 11.5,
              color: B.accentInk,
              background: B.accentSoft,
              padding: '2px 8px',
              borderRadius: 5,
            }}
          >
            {config.captureMethod}
          </code>
          <span style={{ fontSize: 11.5, color: B.ink3 }}>
            best way to reach them
          </span>
          <span style={{ flex: 1 }} />
          <LockPill id="escalation.captureMethod" />
        </div>
      </PanelCard>
    </>
  )
}
