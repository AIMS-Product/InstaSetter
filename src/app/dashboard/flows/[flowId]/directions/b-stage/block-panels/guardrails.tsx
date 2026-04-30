'use client'

import { Lock, Trash2 } from 'lucide-react'
import { type CSSProperties } from 'react'
import type { BrandGuardrail, Guardrail } from '../../../types'
import { B } from '../palette'
import { LockPill, PanelCard } from './shared'

const MAX_GUARDRAILS = 50

// Reserved phrases that conflict with required bot behaviour. We surface a
// warning, not a hard block — operators may legitimately want to override.
const RESERVED_TERMS = ['booking', 'call', 'masterclass', 'email'] as const

interface GuardrailsPanelProps {
  guardrails: BrandGuardrail[]
  lockedPersonaPhrases: Guardrail[]
  onChange?: (next: BrandGuardrail[]) => void
}

export function GuardrailsPanel({
  guardrails,
  lockedPersonaPhrases,
  onChange,
}: GuardrailsPanelProps) {
  const count = guardrails.length

  function update(next: BrandGuardrail[]): void {
    onChange?.(next)
  }

  function addRow(): void {
    if (count >= MAX_GUARDRAILS) return
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : fallbackUuid()
    const next: BrandGuardrail = {
      id,
      phrase: '',
      note: null,
      createdAt: new Date().toISOString(),
    }
    update([...guardrails, next])
  }

  function patchRow(index: number, patch: Partial<BrandGuardrail>): void {
    const next = guardrails.map((row, i) =>
      i === index ? { ...row, ...patch } : row
    )
    update(next)
  }

  function deleteRow(index: number): void {
    update(guardrails.filter((_, i) => i !== index))
  }

  return (
    <>
      <PanelCard
        title="Locked persona phrases"
        subtitle="Data-driven forbidden phrases shipped from the persona section. They apply on every conversation."
      >
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
          {lockedPersonaPhrases.length === 0 && (
            <li style={{ fontSize: 12, color: B.ink3, fontStyle: 'italic' }}>
              No persona-level forbidden phrases parsed.
            </li>
          )}
          {lockedPersonaPhrases.map((g) => (
            <li
              key={g.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 10px',
                background: B.lineSoft,
                borderRadius: 7,
              }}
            >
              <Lock
                size={11}
                color={B.ink3}
                style={{ flexShrink: 0, marginTop: 3 }}
                aria-hidden
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: B.ink, lineHeight: 1.4 }}>
                  {g.text}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: B.ink3,
                    marginTop: 2,
                  }}
                >
                  {g.why}
                </div>
              </div>
              <LockPill />
            </li>
          ))}
        </ul>
      </PanelCard>

      <PanelCard
        title="Brand-specific phrases"
        subtitle="Phrases your brand never wants the bot to write. Plain text, exact wording works best."
        action={
          <span
            style={{
              fontSize: 10.5,
              color: B.ink3,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {count} of {MAX_GUARDRAILS} phrases used
          </span>
        }
      >
        {count === 0 ? (
          <div
            style={{
              padding: '14px 12px',
              background: B.lineSoft,
              borderRadius: 8,
              fontSize: 12.5,
              color: B.ink3,
              lineHeight: 1.5,
            }}
          >
            No brand-specific forbidden phrases yet. The locked persona phrases
            above still apply on every conversation.
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {guardrails.map((row, index) => (
              <GuardrailRow
                key={row.id}
                row={row}
                onPatch={(patch) => patchRow(index, patch)}
                onDelete={() => deleteRow(index)}
              />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addRow}
          disabled={count >= MAX_GUARDRAILS}
          style={{
            ...buttonStyle,
            marginTop: 10,
            opacity: count >= MAX_GUARDRAILS ? 0.4 : 1,
            cursor: count >= MAX_GUARDRAILS ? 'not-allowed' : 'pointer',
          }}
        >
          + Add a forbidden phrase
        </button>
      </PanelCard>
    </>
  )
}

function GuardrailRow({
  row,
  onPatch,
  onDelete,
}: {
  row: BrandGuardrail
  onPatch: (patch: Partial<BrandGuardrail>) => void
  onDelete: () => void
}) {
  const reserved = isReservedTerm(row.phrase)

  return (
    <li>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) auto',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          aria-label="Forbidden phrase"
          value={row.phrase}
          onChange={(e) => onPatch({ phrase: e.target.value })}
          placeholder='e.g. "passive income"'
          style={inputStyle}
        />
        <input
          aria-label="Phrase note"
          value={row.note ?? ''}
          onChange={(e) =>
            onPatch({ note: e.target.value.trim() ? e.target.value : null })
          }
          placeholder="Optional note"
          style={inputStyle}
        />
        <button
          type="button"
          aria-label={`Delete phrase: ${row.phrase || '(empty)'}`}
          onClick={onDelete}
          style={deleteButtonStyle}
        >
          <Trash2 size={13} aria-hidden />
        </button>
      </div>
      {reserved && (
        <div
          role="note"
          style={{
            marginTop: 6,
            padding: '6px 9px',
            background: '#FFF7E6',
            color: '#7A4B00',
            fontSize: 11,
            lineHeight: 1.4,
            borderRadius: 6,
          }}
        >
          Heads up — &ldquo;{row.phrase}&rdquo; is part of required behaviour
          (booking, call, masterclass, email). The bot may need to write this
          word naturally. Override only if you mean it.
        </div>
      )}
    </li>
  )
}

function isReservedTerm(phrase: string): boolean {
  const normalised = phrase.trim().toLowerCase()
  if (!normalised) return false
  return RESERVED_TERMS.some((term) => normalised === term)
}

function fallbackUuid(): string {
  // RFC 4122-shaped v4 UUID for environments without crypto.randomUUID
  // (e.g. older JSDOM). Not cryptographically strong; only used as a key.
  const hex = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      s += '-'
    } else if (i === 14) {
      s += '4'
    } else if (i === 19) {
      s += hex[8 + Math.floor(Math.random() * 4)]
    } else {
      s += hex[Math.floor(Math.random() * 16)]
    }
  }
  return s
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${B.line}`,
  borderRadius: 7,
  padding: '7px 9px',
  background: B.panel,
  color: B.ink,
  fontSize: 12.5,
  fontFamily: 'inherit',
} satisfies CSSProperties

const deleteButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 7,
  border: `1px solid ${B.line}`,
  background: B.panel,
  color: B.ink3,
  cursor: 'pointer',
  fontFamily: 'inherit',
} satisfies CSSProperties

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 7,
  border: `1px solid ${B.line}`,
  background: B.panel,
  color: B.ink,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
} satisfies CSSProperties
