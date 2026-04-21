'use client'

import type { FollowupConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

export function FollowupPanel({ config }: { config: FollowupConfig }) {
  return (
    <>
      <PanelCard title="Timing" locked>
        <div
          style={{
            padding: '10px 12px',
            background: B.bg,
            borderRadius: 8,
            border: `1px solid ${B.line}`,
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: B.ink,
            }}
          >
            {config.delayHours}
          </div>
          <div style={{ fontSize: 12, color: B.ink2 }}>
            hours after the scheduled call
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Re-engagement script">
        <ReadOnlyText value={config.script} rows={2} />
      </PanelCard>

      <PanelCard title="Branch outcomes">
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {config.outcomes.map((o, i) => (
            <li
              key={i}
              style={{
                padding: '9px 11px',
                background: B.bg,
                borderRadius: 7,
                border: `1px solid ${B.line}`,
                fontSize: 12.5,
                color: B.ink,
              }}
            >
              {o}
            </li>
          ))}
        </ul>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: B.ink3,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <LockPill /> One touch only, then let it rest.
        </div>
      </PanelCard>
    </>
  )
}
