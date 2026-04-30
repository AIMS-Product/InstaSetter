'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { SANS_FAMILY, SERIF_FAMILY } from '../shared-data'
import type { Palette } from '../types'
import { fetchConversationAction, fetchFlowRunsAction } from '../actions'
import type {
  ConversationDetail,
  ConversationListItem,
  TimelineItem,
} from '@/lib/services/conversation-viewer-types'
import { interleave } from '@/lib/services/conversation-viewer-types'
import { Chip } from '@/components/ui/chip'
import { ToolBadge } from '@/components/tool-badge'
import { CloseSyncBadge } from '@/components/close-sync-badge'
import RPHeader from './header'
import { BRAND_INBOX_STATUS, StatusNote } from '../surface-status'

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
const STATUS_OPTIONS = ['all', 'active', 'stalled', 'completed'] as const
const SCOPE_OPTIONS = ['flow', 'all'] as const
const CLOSE_SYNC_OPTIONS = [
  'any',
  'sent',
  'failed',
  'pending',
  'not_synced',
] as const

const CLOSE_SYNC_LABELS: Record<(typeof CLOSE_SYNC_OPTIONS)[number], string> = {
  any: 'All sync states',
  sent: 'Sent to Close',
  failed: 'Failed',
  pending: 'Pending retry',
  not_synced: 'Not synced',
}

type InboxStatusFilter = (typeof STATUS_OPTIONS)[number]
type InboxScopeFilter = (typeof SCOPE_OPTIONS)[number]
type InboxCloseSyncFilter = (typeof CLOSE_SYNC_OPTIONS)[number]

function getInitialParam(name: string): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get(name) ?? ''
}

function getInitialStatus(): InboxStatusFilter {
  const value = getInitialParam('status')
  return STATUS_OPTIONS.includes(value as InboxStatusFilter)
    ? (value as InboxStatusFilter)
    : 'all'
}

function getInitialScope(defaultScope: InboxScopeFilter): InboxScopeFilter {
  const value = getInitialParam('scope')
  return SCOPE_OPTIONS.includes(value as InboxScopeFilter)
    ? (value as InboxScopeFilter)
    : defaultScope
}

function getInitialCloseSyncStatus(): InboxCloseSyncFilter {
  const value = getInitialParam('closeSyncStatus')
  return CLOSE_SYNC_OPTIONS.includes(value as InboxCloseSyncFilter)
    ? (value as InboxCloseSyncFilter)
    : 'any'
}

/**
 * The dashboard tile (P3.03) emits `from`/`to` as ISO 8601 timestamps. The
 * inbox's <input type="date"> expects YYYY-MM-DD. Coerce both shapes so a
 * direct deep-link from the tile pre-populates the date inputs cleanly.
 */
function getInitialDateParam(name: 'from' | 'to'): string {
  const raw = getInitialParam(name)
  if (!raw) return ''
  // Already in YYYY-MM-DD shape — date input accepts it as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // ISO timestamp from the dashboard tile — extract the date portion.
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function dateInputToIso(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

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

export default function PageRuns({
  p,
  flowId,
  defaultScope = 'flow',
  flowScopeLabel = 'This flow',
  allScopeLabel = 'All flows',
  description = 'Spot reply quality issues, stalled leads, and bookings as they happen.',
  showAllFlowsNote = true,
  surfaceLabelKey,
}: {
  p: Palette
  flowId: string
  defaultScope?: InboxScopeFilter
  flowScopeLabel?: string
  allScopeLabel?: string
  description?: React.ReactNode
  showAllFlowsNote?: boolean
  surfaceLabelKey?: import('@/lib/dashboard/surface-labels').SurfaceLabelKey
}) {
  const [runs, setRuns] = useState<ConversationListItem[] | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null)
  const [searchInput, setSearchInput] = useState(() => getInitialParam('q'))
  const [search, setSearch] = useState(() => getInitialParam('q'))
  const [dateFrom, setDateFrom] = useState(() => getInitialDateParam('from'))
  const [dateTo, setDateTo] = useState(() => getInitialDateParam('to'))
  const [statusFilter, setStatusFilter] =
    useState<InboxStatusFilter>(getInitialStatus)
  const [scopeFilter, setScopeFilter] = useState<InboxScopeFilter>(() =>
    getInitialScope(defaultScope)
  )
  const [closeSyncFilter, setCloseSyncFilter] = useState<InboxCloseSyncFilter>(
    getInitialCloseSyncStatus
  )

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

  const filters = useMemo(
    () => ({
      limit: 50,
      flowId: scopeFilter === 'flow' ? flowId : undefined,
      search: search || undefined,
      dateFrom: dateInputToIso(dateFrom),
      dateTo: dateInputToIso(dateTo, true),
      status: statusFilter,
      closeSyncStatus: closeSyncFilter,
    }),
    [
      closeSyncFilter,
      dateFrom,
      dateTo,
      flowId,
      scopeFilter,
      search,
      statusFilter,
    ]
  )
  const hasFilters = Boolean(
    search ||
    dateFrom ||
    dateTo ||
    statusFilter !== 'all' ||
    scopeFilter !== defaultScope ||
    closeSyncFilter !== 'any'
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRuns(null)
      setSearch(searchInput.trim())
    }, 200)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (search) params.set('q', search)
    else params.delete('q')
    if (dateFrom) params.set('from', dateFrom)
    else params.delete('from')
    if (dateTo) params.set('to', dateTo)
    else params.delete('to')
    if (statusFilter !== 'all') params.set('status', statusFilter)
    else params.delete('status')
    if (scopeFilter !== defaultScope) params.set('scope', scopeFilter)
    else params.delete('scope')
    if (closeSyncFilter !== 'any')
      params.set('closeSyncStatus', closeSyncFilter)
    else params.delete('closeSyncStatus')
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`
    window.history.replaceState(null, '', nextUrl)
  }, [
    closeSyncFilter,
    dateFrom,
    dateTo,
    defaultScope,
    scopeFilter,
    search,
    statusFilter,
  ])

  useEffect(() => {
    let alive = true
    fetchFlowRunsAction(filters).then((rows) => {
      if (!alive) return
      setRuns(rows)
      setSel((current) => {
        if (current && rows.some((row) => row.id === current)) return current
        return rows[0]?.id ?? null
      })
    })
    return () => {
      alive = false
    }
  }, [filters])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }
      if (!runs?.length) return

      const direction =
        event.key === 'j' || event.key === 'ArrowDown'
          ? 1
          : event.key === 'k' || event.key === 'ArrowUp'
            ? -1
            : 0
      if (!direction) return

      event.preventDefault()
      const currentIndex = Math.max(
        0,
        runs.findIndex((row) => row.id === sel)
      )
      const nextIndex = Math.min(
        runs.length - 1,
        Math.max(0, currentIndex + direction)
      )
      setSel(runs[nextIndex]?.id ?? null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [runs, sel])

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
    <div
      className="flow-inbox"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <RPHeader
        p={p}
        eyebrow="Inbox"
        title="Inbox"
        description={description}
        surfaceLabelKey={surfaceLabelKey}
        right={
          <div
            className="flow-inbox__filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <div
              role="group"
              aria-label="Inbox scope"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 4,
                borderRadius: 10,
                border: `1px solid ${p.line}`,
                background: p.lineSoft,
              }}
            >
              {SCOPE_OPTIONS.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    setRuns(null)
                    setScopeFilter(scope)
                  }}
                  style={{
                    padding: '6px 9px',
                    borderRadius: 7,
                    border: 'none',
                    background: scopeFilter === scope ? p.panel : 'transparent',
                    color: scopeFilter === scope ? p.ink : p.ink2,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 650,
                  }}
                >
                  {scope === 'flow' ? flowScopeLabel : allScopeLabel}
                </button>
              ))}
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                minWidth: 220,
                padding: '8px 10px',
                borderRadius: 10,
                border: `1px solid ${p.line}`,
                background: p.panel,
                color: p.ink2,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="@handle or name"
                style={{
                  minWidth: 0,
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: p.ink,
                  font: 'inherit',
                  fontSize: 12,
                }}
              />
            </label>
            <input
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => {
                setRuns(null)
                setDateFrom(e.target.value)
              }}
              style={filterInputStyle(p)}
            />
            <input
              type="date"
              aria-label="To date"
              value={dateTo}
              onChange={(e) => {
                setRuns(null)
                setDateTo(e.target.value)
              }}
              style={filterInputStyle(p)}
            />
            <select
              aria-label="Conversation status"
              value={statusFilter}
              onChange={(e) => {
                setRuns(null)
                setStatusFilter(e.target.value as InboxStatusFilter)
              }}
              style={filterInputStyle(p)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="stalled">Stalled</option>
              <option value="completed">Completed</option>
            </select>
            <select
              aria-label="Close sync status"
              value={closeSyncFilter}
              onChange={(e) => {
                setRuns(null)
                setCloseSyncFilter(e.target.value as InboxCloseSyncFilter)
              }}
              style={filterInputStyle(p)}
            >
              {CLOSE_SYNC_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {CLOSE_SYNC_LABELS[opt]}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: p.ink3 }}>
                {runs === null
                  ? 'Loading…'
                  : `${runs.length} recent conversations`}
              </span>
              {closeSyncFilter !== 'any' && (
                <Chip
                  tone="accent"
                  className="!py-0.5"
                  aria-label={`Filtered to Close: ${CLOSE_SYNC_LABELS[closeSyncFilter]}. Press the clear button to remove the filter.`}
                >
                  Close: {CLOSE_SYNC_LABELS[closeSyncFilter]}
                  <button
                    type="button"
                    aria-label="Clear Close sync filter"
                    onClick={() => {
                      setRuns(null)
                      setCloseSyncFilter('any')
                    }}
                    style={{
                      marginLeft: 4,
                      padding: 0,
                      width: 14,
                      height: 14,
                      lineHeight: '14px',
                      borderRadius: 999,
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                </Chip>
              )}
            </div>
          </div>
        }
      />

      {showAllFlowsNote && scopeFilter === 'all' && (
        <StatusNote
          p={p}
          label={BRAND_INBOX_STATUS.label}
          detail="Showing conversations from every flow. Switch back to This flow for the current builder."
          tone="warning"
          role="status"
          ariaLive="polite"
        />
      )}

      <div
        className="flow-inbox__kpis"
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
          value={runs === null ? null : String(startedToday)}
          detail={runs === null ? null : `${runs.length} total in inbox`}
          rule="Conversations whose started time is today in your browser timezone."
        />
        <Kpi
          p={p}
          label="Booked"
          value={runs === null ? null : String(bookedCount)}
          detail={
            runs === null
              ? null
              : bookedCount === 0
                ? 'no book_call events yet'
                : `${bookedCount} book_call calls`
          }
          rule="Booked counts conversations that called the book_call tool."
        />
        <Kpi
          p={p}
          label="Completed"
          value={runs === null ? null : String(completedCount)}
          detail={
            runs === null
              ? null
              : completedCount === 0
                ? 'none completed in inbox'
                : `${completedCount} summary-generated`
          }
          rule="Completed counts conversations marked completed after summary generation."
        />
        <Kpi
          p={p}
          label="No reply"
          value={runs === null ? null : String(stalledCount)}
          detail={
            runs === null
              ? null
              : stalledCount === 0
                ? 'none inactive'
                : `${stalledCount} inactive`
          }
          bad={stalledCount > 0}
          rule="No reply counts stalled conversations with no recent customer response."
        />
      </div>

      <div
        className="flow-inbox__body"
        style={{ flex: 1, display: 'flex', minHeight: 0 }}
      >
        <div
          className="flow-inbox__list"
          style={{
            width: 360,
            borderRight: `1px solid ${p.line}`,
            overflow: 'auto',
            background: p.panel,
          }}
        >
          {runs === null && <ConversationSkeletonList p={p} />}
          {runs !== null && runs.length === 0 && (
            <div style={{ padding: 24, color: p.ink2, fontSize: 13 }}>
              {hasFilters
                ? 'No conversations match those filters.'
                : 'No conversations yet. Real inbound DMs appear here once the bot starts handling them.'}
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
                    flexWrap: 'wrap',
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
                  {/*
                    P3.02: Close-sync badge sits to the left of the
                    existing status pill. `disableLink` keeps the row's
                    button parent valid markup — operators jump to Close
                    from the detail header where the link is live.
                  */}
                  <CloseSyncBadge sync={r.closeSync} size="sm" disableLink />
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
          className="flow-inbox__detail"
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

function filterInputStyle(p: Palette): CSSProperties {
  return {
    minHeight: 34,
    borderRadius: 10,
    border: `1px solid ${p.line}`,
    background: p.panel,
    color: p.ink,
    font: 'inherit',
    fontSize: 12,
    padding: '7px 9px',
  }
}

function SkeletonBar({
  p,
  width = '100%',
  height = 12,
}: {
  p: Palette
  width?: string | number
  height?: number
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width,
        height,
        borderRadius: 999,
        background: `linear-gradient(90deg, ${p.lineSoft}, ${p.line}, ${p.lineSoft})`,
      }}
    />
  )
}

function ConversationSkeletonList({ p }: { p: Palette }) {
  return (
    <div aria-label="Loading conversations" style={{ padding: '8px 18px' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '14px 0',
            borderBottom: `1px solid ${p.lineSoft}`,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SkeletonBar p={p} width="44%" height={13} />
            <SkeletonBar p={p} width={42} height={10} />
            <span style={{ flex: 1 }} />
            <SkeletonBar p={p} width={56} height={18} />
          </div>
          <div style={{ marginTop: 10 }}>
            <SkeletonBar p={p} width="82%" height={11} />
          </div>
          <div style={{ marginTop: 8 }}>
            <SkeletonBar p={p} width="28%" height={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Kpi({
  p,
  label,
  value,
  detail,
  bad,
  rule,
}: {
  p: Palette
  label: string
  value: string | null
  detail: string | null
  bad?: boolean
  rule: string
}) {
  return (
    <div
      title={rule}
      aria-label={`${label}. ${rule}`}
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
        {value === null ? <SkeletonBar p={p} width={44} height={28} /> : value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: bad ? '#8B4316' : p.ink3,
          marginTop: 2,
        }}
      >
        {detail === null ? (
          <SkeletonBar p={p} width="70%" height={11} />
        ) : (
          detail || '\u00A0'
        )}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: p.ink }}>
              {contact.name ?? contact.instagram_handle}
            </div>
            {/*
              P3.02: Close-sync badge — detail header is a div, so the
              link variant is safe here. Operators click through to the
              Close Lead in a new tab.
            */}
            <CloseSyncBadge sync={detail.closeSync} size="md" />
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
