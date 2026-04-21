'use client'

import type { SummaryConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

export function SummaryPanel({ config }: { config: SummaryConfig }) {
  return (
    <>
      <PanelCard
        title="Pre-booking mirror"
        subtitle="Spoken to prospect right before the link."
      >
        <ReadOnlyText value={config.mirrorTemplate} rows={2} />
      </PanelCard>

      <PanelCard
        title={`Required fields · ${config.requiredFields.length}`}
        locked
        subtitle="Every call to generate_summary must include these."
      >
        <FieldTable fields={config.requiredFields} />
      </PanelCard>

      <PanelCard
        title={`Optional fields · ${config.optionalFields.length}`}
        subtitle="Included when the data is available."
      >
        <FieldTable fields={config.optionalFields} />
      </PanelCard>

      {config.triggerWords.length > 0 && (
        <PanelCard
          title={`Trigger words · ${config.triggerWords.length}`}
          subtitle="If the prospect says any of these, summary MUST be called."
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {config.triggerWords.map((w) => (
              <span
                key={w}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: B.accentSoft,
                  color: B.accentInk,
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                {w}
              </span>
            ))}
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: B.ink3,
            }}
          >
            <LockPill /> Missing summary is a failure. Extra summary is fine.
          </div>
        </PanelCard>
      )}
    </>
  )
}

function FieldTable({ fields }: { fields: SummaryConfig['requiredFields'] }) {
  if (fields.length === 0) {
    return (
      <div style={{ fontSize: 12, color: B.ink3 }}>
        None defined in summary-generation.
      </div>
    )
  }
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      {fields.map((f) => (
        <li
          key={f.key}
          style={{
            padding: '8px 11px',
            background: B.bg,
            border: `1px solid ${B.line}`,
            borderRadius: 7,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 10,
            alignItems: 'baseline',
          }}
        >
          <code
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 11,
              color: B.accentInk,
              background: B.accentSoft,
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            {f.key}
          </code>
          <span style={{ fontSize: 12, color: B.ink2, lineHeight: 1.4 }}>
            {f.notes}
          </span>
        </li>
      ))}
    </ul>
  )
}
