'use client'

import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import { useFlowActions, useFlowState } from '../store'
import type { Palette } from '../types'
import RPHeader from './header'

export default function PageBot({ p }: { p: Palette }) {
  const state = useFlowState()
  const actions = useFlowActions()
  const bot = state.bot

  const CONSTRAINTS: Array<{ on: boolean; text: string; locked?: boolean }> = [
    { on: true, text: 'Maximum 2 sentences per reply', locked: true },
    { on: true, text: 'Ask one question at a time', locked: true },
    { on: true, text: 'Never invent pricing or availability', locked: true },
    { on: true, text: 'Never handle pricing post-call alone — escalate' },
    { on: false, text: "Always use the prospect's first name if known" },
    { on: true, text: 'Drop the booking link within 6 turns if qualified' },
  ]

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <RPHeader
        p={p}
        eyebrow="Bot"
        title={`${bot.name} · Appointment Setter`}
        right={
          <button
            onClick={() => actions.toast('Bot settings saved')}
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
            Save changes
          </button>
        }
      />
      <div
        style={{ padding: '28px 32px 60px', maxWidth: 820, margin: '0 auto' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${p.accent}, ${p.accentSoft})`,
              color: p.panel,
              display: 'grid',
              placeItems: 'center',
              fontFamily: SERIF_FAMILY,
              fontSize: 30,
              fontStyle: 'italic',
            }}
          >
            {bot.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: p.ink3, marginBottom: 6 }}>
              Display name
            </div>
            <input
              value={bot.name}
              onChange={(e) => actions.updateBot({ name: e.target.value })}
              style={{
                width: 220,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${p.line}`,
                background: p.panel,
                fontSize: 14,
                color: p.ink,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
          <div
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              background: '#E6EFE1',
              color: '#3A5A32',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#3A5A32',
              }}
            />
            Active across 3 flows
          </div>
        </div>

        <SettingsSection
          p={p}
          label="Personality"
          sub="One paragraph, plain English. This colours every message, every block."
        >
          <textarea
            value={bot.persona}
            onChange={(e) => actions.updateBot({ persona: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 10,
              border: `1px solid ${p.line}`,
              background: p.panel,
              fontSize: 14,
              lineHeight: 1.55,
              color: p.ink,
              fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11, color: p.ink3, marginTop: 6 }}>
            {bot.persona.length} / 600 characters
          </div>
        </SettingsSection>

        <SettingsSection
          p={p}
          label="Hard rules"
          sub="Shared across every block. Locked rules are enforced at runtime."
        >
          <div
            style={{
              background: p.panel,
              border: `1px solid ${p.line}`,
              borderRadius: 10,
            }}
          >
            {CONSTRAINTS.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderTop: i > 0 ? `1px solid ${p.lineSoft}` : 'none',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 16,
                    borderRadius: 999,
                    padding: 2,
                    background: c.on ? p.accent : p.line,
                    transition: 'background .15s',
                    cursor: c.locked ? 'default' : 'pointer',
                    opacity: c.locked ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: p.panel,
                      transform: c.on ? 'translateX(12px)' : 'translateX(0)',
                      transition: 'transform .15s',
                    }}
                  />
                </div>
                <span style={{ flex: 1, fontSize: 13, color: p.ink }}>
                  {c.text}
                </span>
                {c.locked && (
                  <span
                    style={{
                      fontSize: 10,
                      color: p.ink3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      style={{ color: p.ink3 }}
                    >
                      <path
                        d="M2 4.5V3a3 3 0 016 0v1.5M2 4.5h6v4H2z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                    </svg>
                    locked
                  </span>
                )}
              </div>
            ))}
            <div
              style={{
                padding: '10px 14px',
                borderTop: `1px solid ${p.lineSoft}`,
                fontSize: 12,
                color: p.accentInk,
                cursor: 'pointer',
              }}
            >
              + Add a rule
            </div>
          </div>
        </SettingsSection>

        <SettingsSection p={p} label="Channels" sub="Where this bot shows up.">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { name: 'Instagram — Organic DM', vol: '340/wk', live: true },
              { name: 'Instagram — Cold Outbound', vol: '80/wk', live: true },
              { name: 'Instagram — Retargeting', vol: '12/wk', live: false },
            ].map((c) => (
              <div
                key={c.name}
                style={{
                  padding: '12px 14px',
                  background: p.panel,
                  border: `1px solid ${p.line}`,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    background:
                      'conic-gradient(from 200deg, #F5C44A, #F47D5A, #C24585, #6C4BC7, #F5C44A)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: p.ink }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: p.ink3 }}>
                    {c.vol} · last connected today
                  </div>
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 500,
                    background: c.live ? '#E6EFE1' : p.lineSoft,
                    color: c.live ? '#3A5A32' : p.ink3,
                  }}
                >
                  {c.live ? 'Live' : 'Paused'}
                </span>
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection p={p} label="Danger zone" sub="">
          <div
            style={{
              padding: '14px 16px',
              background: p.panel,
              border: '1px solid #F5D9D9',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: p.ink,
                  marginBottom: 2,
                }}
              >
                Pause {bot.name} everywhere
              </div>
              <div style={{ fontSize: 12, color: p.ink3 }}>
                In-flight conversations finish; no new ones start. Instant
                kill-switch.
              </div>
            </div>
            <button
              onClick={() => actions.toast(`${bot.name} paused (pretend)`)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '1px solid #E8B6B6',
                background: '#FBECEC',
                color: '#8B2828',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Pause bot
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}

function SettingsSection({
  p,
  label,
  sub,
  children,
}: {
  p: Palette
  label: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: p.ink,
            letterSpacing: 0.2,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        {sub && <div style={{ fontSize: 12, color: p.ink3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}
