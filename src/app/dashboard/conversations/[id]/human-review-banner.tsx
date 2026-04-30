'use client'

import { useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import type { ConversationHumanReviewPauseSummary } from '@/lib/services/conversation-viewer-types'
import { resumeConversationAction } from './actions'

interface Props {
  conversationId: string
  pause: ConversationHumanReviewPauseSummary
}

const SEVERITY_COPY: Record<
  ConversationHumanReviewPauseSummary['severity'],
  { label: string; tone: 'warn' | 'danger' }
> = {
  concern: { label: 'Concern', tone: 'warn' },
  hostile: { label: 'Hostile', tone: 'danger' },
  compliance: { label: 'Compliance', tone: 'danger' },
}

const TONE_STYLES: Record<
  'warn' | 'danger',
  {
    background: string
    border: string
    color: string
    chipBg: string
    chipColor: string
  }
> = {
  warn: {
    background: '#FFF7E6',
    border: '#F4D27A',
    color: '#7A4F12',
    chipBg: '#FBE7B0',
    chipColor: '#7A4F12',
  },
  danger: {
    background: '#FBEAEA',
    border: '#E2A2A2',
    color: '#8E2A2A',
    chipBg: '#F1C9C9',
    chipColor: '#8E2A2A',
  },
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return 'just now'
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function HumanReviewBanner({ conversationId, pause }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const severity = SEVERITY_COPY[pause.severity]
  const tone = TONE_STYLES[severity.tone]
  const requestedBy = pause.requestedBy === 'operator' ? 'operator' : 'bot'

  const handleResume = () => {
    setError(null)
    startTransition(async () => {
      const result = await resumeConversationAction({ conversationId })
      if (!result.success) {
        setError(result.error ?? 'Could not resume the conversation.')
      }
    })
  }

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 16px',
    background: tone.background,
    color: tone.color,
    border: `1px solid ${tone.border}`,
    borderRadius: 10,
    marginBottom: 18,
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  }

  const chipStyle: CSSProperties = {
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 600,
    background: tone.chipBg,
    color: tone.chipColor,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  }

  const buttonStyle: CSSProperties = {
    background: '#161528',
    color: 'white',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: pending ? 'wait' : 'pointer',
    opacity: pending ? 0.7 : 1,
  }

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Conversation paused for human review"
      style={wrapperStyle}
    >
      <div style={headerStyle}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Paused for human review
        </span>
        <span style={chipStyle}>{severity.label}</span>
        <span style={{ fontSize: 11.5, color: tone.color, opacity: 0.8 }}>
          Requested by {requestedBy} · {formatRelative(pause.requestedAt)}
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleResume}
          disabled={pending}
          style={buttonStyle}
        >
          {pending ? 'Resuming…' : 'Resume bot'}
        </button>
      </div>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
        {pause.reason}
      </p>
      <p style={{ fontSize: 11, lineHeight: 1.5, margin: 0, opacity: 0.8 }}>
        Inbound messages are still saved while paused. The bot will only reply
        again after you resume.
      </p>
      {error && (
        <p
          style={{
            fontSize: 11.5,
            color: '#8E2A2A',
            margin: 0,
          }}
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  )
}
