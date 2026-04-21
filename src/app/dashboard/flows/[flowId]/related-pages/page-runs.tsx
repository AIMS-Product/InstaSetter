'use client'

import { useEffect, useState } from 'react'
import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import type { Palette } from '../types'
import { fetchConversationAction, fetchFlowRunsAction } from '../actions'
import type {
  ConversationDetail,
  ConversationListItem,
  TimelineItem,
} from '@/lib/services/conversation-viewer-types'
import { interleave } from '@/lib/services/conversation-viewer-types'
import { ToolBadge } from '@/components/tool-badge'
import RPHeader from './header'
import { BRAND_INBOX_STATUS, StatusBadge, StatusNote } from '../surface-status'

// Status tones mirror the real write surface in
// src/lib/services/conversation.ts: {active, stalled, completed}.
// Unknown values fall through to `stalled` tone so badges stay visible.
const STATUS_TONE = (
  p: Palette
): Record<string, { bg: string; fg: string; label: string }> => ({
  active: { bg: p.accentSoft, fg: p.accentInk, label: 'Active' },
  stalled: { bg: '#FBE7D9', fg: '#8B4316', label: 'Stalled' },
  completed: { bg: '#E6EFE1', fg: '#3A5A32', label: 'Completed' },
})

const FALLBACK_TONE_KEY = 'stalled'

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

// Discriminated state for the right-hand transcript panel.
// `ok` and `missing` both represent a completed fetch — `missing` exists so
// the UI can distinguish "still loading" from "server returned null" and stop
// showing the loading spinner when a conversation doesn't exist or failed.
type DetailResult =
  | { id: string; status: 'ok'; detail: ConversationDetail }
  | { id: string; status: 'missing' }
  | { id: string; status: 'error'; message: string }

export default function PageRuns({ p }: { p: Palette }) {
  const [runs, setRuns] = useState<ConversationListItem[] | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null)

  // The panel is "loading" when a selection exists but no result for THIS id
  // has come back yet. If the last result is for a different id, we're mid-
  // transition between rows — still loading. Derived, not stored, so we never
  // setState synchronously in an effect.
  const detailStatus: 'idle' | 'loading' | 'ok' | 'missing' | 'error' = (() => {
    if (!sel) return 'idle'
    if (!detailResult || detailResult.id !== sel) return 'loading'
    return detailResult.status
  })()
  const detail =
    detailResult && detailResult.status === 'ok' && detailResult.id === sel
      ? detailResult.detail
      : null

  useEffect(() => {
    let alive = true
    fetchFlowRunsAction(50).then((rows) => {
      if (!alive) return
      setRuns(rows)
      if (rows[0]) setSel(rows[0].id)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!sel) return
    let alive = true
    fetchConversationAction(sel)
      .then((d) => {
        if (!alive) return
        setDetailResult(
          d === null
            ? { id: sel, status: 'missing' }
            : { id: sel, status: 'ok', detail: d }
        )
      })
      .catch((err) => {
        if (!alive) return
        setDetailResult({
          id: sel,
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      })
    return () => {
      alive = false
    }
  }, [sel])

  const tones = STATUS_TONE(p)
  const todayStr = new Date().toDateString()
  const startedToday =
    runs?.filter((r) => new Date(r.started_at).toDateString() === todayStr)
      .length ?? 0
  const bookedCount =
    runs?.filter((r) => r.event_tool_names.includes('book_call')).length ?? 0
  const completedCount =
    runs?.filter((r) => r.status === 'completed').length ?? 0
  const stalledCount = runs?.filter((r) => r.status === 'stalled').length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RPHeader
        p={p}
        eyebrow="Brand-wide data"
        title="Brand inbox"
        right={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <StatusBadge
              p={p}
              label={BRAND_INBOX_STATUS.label}
              tone="warning"
            />
            <span style={{ fontSize: 11, color: p.ink3 }}>
              {runs === null
                ? 'Loading…'
                : `${runs.length} recent brand conversations`}
            </span>
          </div>
        }
      />

      <StatusNote
        p={p}
        label={BRAND_INBOX_STATUS.label}
        detail={BRAND_INBOX_STATUS.detail}
        tone="warning"
        role="status"
        ariaLive="polite"
      />

      <div
        style={{
          padding: '18px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          background: p.panel,
          borderBottom: `1px solid ${p.line}`,
        }}
      >
        <Kpi
          p={p}
          label="Started today"
          value={runs === null ? '—' : String(startedToday)}
          detail={runs === null ? '' : `${runs.length} total in brand list`}
        />
        <Kpi
          p={p}
          label="Booked"
          value={runs === null ? '—' : String(bookedCount)}
          detail={
            runs === null
              ? ''
              : bookedCount === 0
                ? 'no brand-wide book_call events yet'
                : `${bookedCount} brand-wide book_call calls`
          }
        />
        <Kpi
          p={p}
          label="Completed"
          value={runs === null ? '—' : String(completedCount)}
          detail={
            runs === null
              ? ''
              : completedCount === 0
                ? 'none completed in brand list'
                : `${completedCount} brand-wide summary-generated`
          }
        />
        <Kpi
          p={p}
          label="Stalled"
          value={runs === null ? '—' : String(stalledCount)}
          detail={
            runs === null
              ? ''
              : stalledCount === 0
                ? 'none stalled in brand list'
                : `${stalledCount} brand-wide inactive`
          }
          bad={stalledCount > 0}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          style={{
            width: 360,
            borderRight: `1px solid ${p.line}`,
            overflow: 'auto',
            background: p.panel,
          }}
        >
          {runs === null && (
            <div
              style={{
                padding: 24,
                fontSize: 12.5,
                color: p.ink3,
                textAlign: 'center',
              }}
            >
              Loading conversations…
            </div>
          )}
          {runs !== null && runs.length === 0 && (
            <div style={{ padding: 24, color: p.ink2, fontSize: 13 }}>
              No brand conversations yet. Real inbound DMs across
              VendingPreneurs appear here once the bot starts handling them.
            </div>
          )}
          {runs?.map((r) => {
            const tone = tones[r.status] ?? tones[FALLBACK_TONE_KEY]!
            const active = sel === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSel(r.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '13px 18px',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderLeft: active
                    ? `3px solid ${p.accent}`
                    : '3px solid transparent',
                  borderBottom: `1px solid ${p.lineSoft}`,
                  background: active ? p.sel : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: p.ink,
                    }}
                  >
                    {r.contact.name ?? r.contact.instagram_handle}
                  </span>
                  <span style={{ fontSize: 10.5, color: p.ink3 }}>
                    {timeAgo(r.last_message_at ?? r.started_at)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 500,
                      background: tone.bg,
                      color: tone.fg,
                    }}
                  >
                    {tone.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: p.ink2,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.last_message_preview ?? '—'}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: p.ink3,
                    marginTop: 4,
                  }}
                >
                  {r.message_count} msg
                  {r.event_count > 0 && ` · ${r.event_count} evt`}
                </div>
              </button>
            )
          })}
        </div>

        <div
          style={{
            flex: 1,
            background: p.bg,
            overflow: 'auto',
            padding: '24px 32px',
          }}
        >
          {detailStatus === 'idle' && (
            <CenteredNote p={p}>
              Select a conversation to view the transcript.
            </CenteredNote>
          )}
          {detailStatus === 'loading' && (
            <CenteredNote p={p}>Loading transcript…</CenteredNote>
          )}
          {detailStatus === 'missing' && (
            <CenteredNote p={p}>
              That conversation is no longer available.
            </CenteredNote>
          )}
          {detailStatus === 'error' && detailResult?.status === 'error' && (
            <CenteredNote p={p} tone="error">
              Couldn&apos;t load transcript: {detailResult.message}
            </CenteredNote>
          )}
          {detailStatus === 'ok' && detail && (
            <TranscriptPanel p={p} detail={detail} />
          )}
        </div>
      </div>
    </div>
  )
}

function CenteredNote({
  p,
  children,
  tone,
}: {
  p: Palette
  children: React.ReactNode
  tone?: 'error'
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: 80,
        color: tone === 'error' ? '#8E2A2A' : p.ink3,
        fontSize: 13,
      }}
    >
      {children}
    </div>
  )
}

function Kpi({
  p,
  label,
  value,
  detail,
  bad,
}: {
  p: Palette
  label: string
  value: string
  detail: string
  bad?: boolean
}) {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: p.lineSoft,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: p.ink3,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          color: p.ink,
          marginTop: 4,
          fontWeight: 500,
          fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: bad ? '#8B4316' : p.ink3,
          marginTop: 2,
        }}
      >
        {detail || '\u00A0'}
      </div>
    </div>
  )
}

function TranscriptPanel({
  p,
  detail,
}: {
  p: Palette
  detail: ConversationDetail
}) {
  const timeline = interleave(detail.messages, detail.events)
  const contact = detail.contact
  const knownFromEvents = findKnownQualifiers(detail)
  const thinking =
    detail.summary ??
    (knownFromEvents
      ? `Known qualifiers: ${knownFromEvents}`
      : 'No summary yet — the bot generates one when the conversation ends.')

  return (
    <div
      style={{
        background: p.panel,
        borderRadius: 12,
        border: `1px solid ${p.line}`,
        padding: 22,
        maxWidth: 760,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${p.accent}, ${p.accentSoft})`,
            display: 'grid',
            placeItems: 'center',
            color: p.panel,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {(contact.instagram_handle ?? 'U').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: p.ink }}>
            {contact.name ?? contact.instagram_handle}
          </div>
          <div style={{ fontSize: 11.5, color: p.ink3 }}>
            {contact.instagram_handle} · {detail.status} ·{' '}
            {detail.prompt_version}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 10,
          border: `1px dashed ${p.line}`,
          background: p.lineSoft,
          fontSize: 12.5,
          color: p.ink2,
          marginBottom: 18,
        }}
      >
        <div style={{ fontWeight: 500, color: p.ink, marginBottom: 4 }}>
          Summary
        </div>
        {thinking}
      </div>

      {timeline.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: p.ink3,
            fontSize: 13,
            padding: 24,
          }}
        >
          No messages in this conversation yet.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {timeline.map((item) => {
          if (item.kind === 'message') {
            return <MessageBubble key={item.id} p={p} item={item} />
          }
          return (
            <div key={item.id} style={{ paddingLeft: 2 }}>
              <ToolBadge
                call={{ name: item.toolName, input: item.toolInput }}
                tone="block"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MessageBubble({
  p,
  item,
}: {
  p: Palette
  item: Extract<TimelineItem, { kind: 'message' }>
}) {
  const isBot = item.role === 'assistant'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isBot ? 'row' : 'row-reverse',
      }}
    >
      <div
        style={{
          maxWidth: '78%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          alignItems: isBot ? 'flex-start' : 'flex-end',
        }}
      >
        <div
          style={{
            padding: '9px 13px',
            borderRadius: 14,
            background: isBot ? p.lineSoft : p.ink,
            color: isBot ? p.ink : p.panel,
            fontSize: 13.5,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
          }}
        >
          {item.content}
        </div>
        <div style={{ fontSize: 10.5, color: p.ink3 }}>
          {formatTime(item.createdAt)}
        </div>
      </div>
    </div>
  )
}

function findKnownQualifiers(detail: ConversationDetail): string | null {
  // qualify_lead can fire multiple times as new data emerges. Merge all calls
  // in chronological order (later values win per key) so earlier captures
  // aren't lost if later calls only carry one new field.
  const merged: Record<string, string> = {}
  for (const event of detail.events) {
    if (event.tool_name !== 'qualify_lead') continue
    for (const [k, v] of Object.entries(event.tool_input ?? {})) {
      if (v === null || v === undefined || v === '') continue
      merged[k] = String(v)
    }
  }
  const entries = Object.entries(merged)
  if (entries.length === 0) return null
  return entries.map(([k, v]) => `${k}=${v}`).join(', ')
}
