'use client'

import { useMemo, useState } from 'react'
import { Lock, Info, ChevronDown, ChevronRight } from 'lucide-react'
import {
  extractBotGuardrails,
  parsePersonaSections,
  type PersonaSection,
} from '../directions/b-stage/block-sections'
import { GuardrailsPanel } from '../directions/b-stage/block-panels/guardrails'
import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import { useFlowDispatch, useFlowState } from '../store'
import type { BrandGuardrail, Guardrail, Palette } from '../types'
import RPHeader from './header'

export default function PageBot({ p }: { p: Palette }) {
  const state = useFlowState()
  const dispatch = useFlowDispatch()
  const bot = state.bot
  const displayName = bot.name.trim() || 'No public bot name'

  const personaSections = useMemo(
    () => parsePersonaSections(bot.persona),
    [bot.persona]
  )
  const globalGuardrails = useMemo<Guardrail[]>(
    () =>
      extractBotGuardrails({
        personaText: bot.persona,
        messageConstraintsText: bot.messageConstraints,
      }),
    [bot.messageConstraints, bot.persona]
  )
  const personaForbiddenPhrases = useMemo<Guardrail[]>(
    () => globalGuardrails.filter((g) => g.source.endsWith('persona.ts')),
    [globalGuardrails]
  )

  function handleBrandGuardrailsChange(next: BrandGuardrail[]): void {
    dispatch({ type: 'update_bot', patch: { brandGuardrails: next } })
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <RPHeader
        p={p}
        eyebrow="Bot"
        title="Appointment Setter"
        description="These rules apply across every conversation. Use this page to understand voice, safety limits, and connected channels."
        right={null}
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
            aria-hidden
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
            {state.flow.brand.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: p.ink3, marginBottom: 4 }}>
              Public name
            </div>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px dashed ${p.line}`,
                background: p.lineSoft,
                fontSize: 13,
                color: p.ink3,
                fontStyle: 'italic',
              }}
              title="The Instagram account speaks as the business, not as a named person."
            >
              {displayName}
            </div>
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
            Flow: {state.flow.name}
          </div>
        </div>

        <SettingsSection
          p={p}
          label="Persona"
          sub="Voice guidance. Each section shows what your team can change and what InstaSetter keeps fixed."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {personaSections.map((sec) => (
              <PersonaPanel key={sec.key} p={p} section={sec} />
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          p={p}
          label="Global guardrails"
          sub="Safety rules that apply across every conversation."
        >
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              background: p.panel,
              border: `1px solid ${p.line}`,
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {globalGuardrails.length === 0 && (
              <li
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: p.ink3,
                  fontStyle: 'italic',
                }}
              >
                No rules parsed.
              </li>
            )}
            {globalGuardrails.map((r, i) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '11px 14px',
                  borderTop: i > 0 ? `1px solid ${p.lineSoft}` : 'none',
                }}
              >
                <Lock
                  size={12}
                  color={p.ink3}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: p.ink }}>{r.text}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: p.ink3,
                      marginTop: 2,
                    }}
                  >
                    {r.why} · {r.source.split('/').pop()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection
          p={p}
          label="Brand guardrails — never say"
          sub="Operator-curated forbidden phrases. Stack on top of the persona-locked phrases above."
        >
          <GuardrailsPanel
            guardrails={bot.brandGuardrails ?? []}
            lockedPersonaPhrases={personaForbiddenPhrases}
            onChange={handleBrandGuardrailsChange}
          />
        </SettingsSection>

        <SettingsSection
          p={p}
          label="Channels"
          sub="Where the bot is connected."
        >
          <div
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
              aria-hidden
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
                {state.flow.channel}
              </div>
              <div style={{ fontSize: 11, color: p.ink3 }}>
                Linked to this flow
              </div>
            </div>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 500,
                background: '#E6EFE1',
                color: '#3A5A32',
              }}
            >
              Connected
            </span>
          </div>
        </SettingsSection>

        <SettingsSection p={p} label="Customer-facing wording" sub="">
          <div
            style={{
              padding: '12px 14px',
              background: p.panel,
              border: `1px solid ${p.line}`,
              borderRadius: 10,
              fontSize: 12.5,
              color: p.ink2,
              lineHeight: 1.55,
            }}
          >
            Customer replies are assembled from nine guidance sections. Edits in
            this UI save to the team draft. Customers keep seeing the current
            wording until publishing is ready.
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}

function PersonaPanel({ p, section }: { p: Palette; section: PersonaSection }) {
  const [open, setOpen] = useState(!section.locked)
  return (
    <div
      style={{
        background: p.panel,
        border: `1px solid ${p.line}`,
        borderRadius: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '11px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {open ? (
          <ChevronDown size={14} color={p.ink3} />
        ) : (
          <ChevronRight size={14} color={p.ink3} />
        )}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: p.ink,
            fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
          }}
        >
          {section.heading}
        </div>
        {section.locked ? (
          <span
            title="Set by InstaSetter for safety and compliance."
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background: p.lineSoft,
              color: p.ink3,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            <Lock size={10} /> Fixed
          </span>
        ) : (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: p.accentSoft,
              color: p.accentInk,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Editable
          </span>
        )}
        <span style={{ flex: 1 }} />
        <Info size={12} color={p.ink3} aria-hidden style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            padding: '0 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              color: p.ink3,
              lineHeight: 1.5,
              padding: '7px 10px',
              background: p.lineSoft,
              borderRadius: 6,
            }}
          >
            {section.why}
          </div>
          <div
            style={{
              padding: '10px 12px',
              background: section.locked ? p.lineSoft : p.bg,
              border: `1px solid ${p.line}`,
              borderRadius: 7,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: p.ink,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
            }}
          >
            {section.body}
          </div>
        </div>
      )}
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
