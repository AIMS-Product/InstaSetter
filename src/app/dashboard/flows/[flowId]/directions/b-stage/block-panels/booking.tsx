'use client'

import type { BookingConfig } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

export function BookingPanel({ config }: { config: BookingConfig }) {
  return (
    <>
      <PanelCard
        title="Mirror template"
        subtitle="Reflect what's known before sending the link."
      >
        <ReadOnlyText value={config.mirrorTemplate} rows={2} />
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <VarChip>{'{{contact.location}}'}</VarChip>
          <VarChip>{'{{contact.motivation}}'}</VarChip>
        </div>
      </PanelCard>

      <PanelCard title="Booking link + email ask (combined)">
        <ReadOnlyText value={config.emailAskCombined} rows={2} />
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <VarChip>{config.linkPattern}</VarChip>
        </div>
      </PanelCard>

      <PanelCard title="Re-engagement" locked>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <Stat
            label="After"
            value={`${config.reengagementAfterHours} h`}
            note="silent window before reminder"
          />
          <Stat
            label="Max link sends"
            value={String(config.maxLinkSends)}
            note="then wait for prospect"
          />
        </div>
        {config.reengagementScript && (
          <>
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
              Reminder script <LockPill />
            </div>
            <ReadOnlyText value={config.reengagementScript} rows={2} />
          </>
        )}
      </PanelCard>
    </>
  )
}

function VarChip({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 5,
        background: B.accentSoft,
        color: B.accentInk,
      }}
    >
      {children}
    </code>
  )
}

function Stat({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: B.bg,
        borderRadius: 8,
        border: `1px solid ${B.line}`,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: B.ink3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: B.ink,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: B.ink3, marginTop: 2 }}>{note}</div>
    </div>
  )
}
