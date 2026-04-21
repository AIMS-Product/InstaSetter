'use client'

import type { OpeningConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

export function OpeningPanel({ config }: { config: OpeningConfig }) {
  return (
    <>
      <PanelCard
        title="Opening question"
        subtitle="The first thing the bot asks."
      >
        <ReadOnlyText value={config.firstQuestion} />
      </PanelCard>

      <PanelCard
        title="Supported markets"
        locked
        subtitle="Out-of-region prospects are warmly declined before any qualification."
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {config.supportedMarkets.map((m) => (
            <span
              key={m}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: B.accentSoft,
                color: B.accentInk,
                fontSize: 11.5,
                fontWeight: 500,
              }}
            >
              {m}
            </span>
          ))}
          <LockPill title="Hard compliance gate" />
        </div>
      </PanelCard>

      <PanelCard title="Out-of-area decline script" locked>
        <ReadOnlyText value={config.outOfAreaScript} rows={3} />
      </PanelCard>
    </>
  )
}
