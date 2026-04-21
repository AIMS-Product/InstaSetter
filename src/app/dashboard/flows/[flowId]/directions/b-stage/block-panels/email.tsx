'use client'

import { useState } from 'react'
import type { EmailConfig, EmailTrigger } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard, ReadOnlyText } from './shared'

const LABEL: Record<EmailTrigger['priority'], string> = {
  primary: 'Primary',
  backup: 'Backup',
  secondary: 'Secondary',
}

export function EmailPanel({ config }: { config: EmailConfig }) {
  const [tab, setTab] = useState<EmailTrigger['priority']>(
    config.triggers[0]?.priority ?? 'primary'
  )
  const trigger =
    config.triggers.find((t) => t.priority === tab) ?? config.triggers[0]
  return (
    <>
      <PanelCard
        title="Capture triggers"
        subtitle="Three moments at which the bot is allowed to ask for email."
      >
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            background: B.lineSoft,
            borderRadius: 8,
            padding: 3,
            marginBottom: 10,
          }}
        >
          {config.triggers.map((t) => (
            <button
              key={t.priority}
              type="button"
              role="tab"
              aria-selected={tab === t.priority}
              onClick={() => setTab(t.priority)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background: tab === t.priority ? B.panel : 'transparent',
                color: tab === t.priority ? B.ink : B.ink2,
                fontSize: 12,
                fontWeight: tab === t.priority ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {LABEL[t.priority]}
              {t.mandatory && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    color: '#8B4316',
                    fontWeight: 700,
                  }}
                >
                  ●
                </span>
              )}
            </button>
          ))}
        </div>
        {trigger && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                color: B.ink3,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  fontSize: 10.5,
                }}
              >
                When
              </span>
              <span style={{ color: B.ink2, flex: 1 }}>{trigger.when}</span>
              {trigger.mandatory && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#8B4316',
                    background: '#FBE7D9',
                    padding: '2px 7px',
                    borderRadius: 999,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Mandatory
                </span>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: B.ink3,
                  marginBottom: 4,
                }}
              >
                Script
              </div>
              <ReadOnlyText value={trigger.script} rows={2} />
            </div>
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="Confirmation loop"
        locked
        subtitle="Always confirm receipt of the email. Closes the loop + adds perceived value."
      >
        <ReadOnlyText value={config.confirmationScript} />
      </PanelCard>

      {config.hesitationScript && (
        <PanelCard title="Hesitation response">
          <ReadOnlyText value={config.hesitationScript} />
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: B.ink3,
            }}
          >
            <LockPill /> tool: capture_email called immediately after email
            received
          </div>
        </PanelCard>
      )}
    </>
  )
}
