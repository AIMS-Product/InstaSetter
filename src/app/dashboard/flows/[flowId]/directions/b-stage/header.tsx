'use client'

import { MessageSquareText } from 'lucide-react'
import { useFlowState } from '../../store'
import {
  StatusBadge,
  getDraftSaveStatus,
  getDraftWorkspaceStatus,
  getLiveRuntimeStatus,
} from '../../surface-status'
import type { PageId } from '../../types'
import { B } from './palette'

const PAGE_SUMMARY: Record<PageId, string> = {
  flow: 'Edit the shared draft and sanity-check tone before anything ships.',
  runs: 'Review brand-wide conversations and booking signals.',
  variables: 'Check what the bot remembers and where each value comes from.',
  versions: 'See what is saved in draft versus what powers live replies.',
  bot: 'Inspect the global persona and guardrails behind every reply.',
}

export default function BHeader({
  page,
  simOpen,
  onToggleSim,
}: {
  page: PageId
  simOpen: boolean
  onToggleSim: () => void
}) {
  const state = useFlowState()
  const draftStatus = getDraftWorkspaceStatus(state.dirtySincePublish)
  const saveStatus = getDraftSaveStatus(state.draftSyncStatus)
  const liveStatus = getLiveRuntimeStatus()
  const saveTone =
    state.draftSyncStatus === 'error'
      ? 'danger'
      : state.draftSyncStatus === 'saved'
        ? 'success'
        : 'info'

  return (
    <div
      style={{
        minHeight: 72,
        flexShrink: 0,
        background: B.panel,
        borderBottom: `1px solid ${B.line}`,
        display: 'flex',
        alignItems: 'center',
        padding: '12px 18px',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${B.accent}, #7B6FE6)`,
          display: 'grid',
          placeItems: 'center',
          color: B.panel,
          fontSize: 16,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        i
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: B.ink3,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontWeight: 700,
          }}
        >
          {state.flow.brand}
        </div>
        <div
          style={{
            fontSize: 18,
            color: B.ink,
            fontWeight: 650,
            lineHeight: 1.15,
          }}
        >
          {state.flow.name}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: B.ink2,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {page === 'flow'
            ? `${state.flow.channel} · ${PAGE_SUMMARY.flow}`
            : PAGE_SUMMARY[page]}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginLeft: 8,
          flexWrap: 'wrap',
        }}
      >
        <StatusBadge
          p={B}
          label={draftStatus.label}
          tone={state.dirtySincePublish ? 'warning' : 'neutral'}
        />
        <StatusBadge p={B} label={saveStatus.label} tone={saveTone} />
        <StatusBadge p={B} label={liveStatus.label} tone="success" />
      </div>
      <div style={{ flex: 1 }} />
      {page === 'flow' && (
        <button
          type="button"
          onClick={onToggleSim}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid ${simOpen ? B.accentSoft : B.line}`,
            background: simOpen ? B.accentSoft : B.lineSoft,
            color: simOpen ? B.accentInk : B.ink,
            fontSize: 12.5,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: simOpen ? '0 10px 24px rgba(79,70,186,0.10)' : 'none',
          }}
        >
          <MessageSquareText size={15} strokeWidth={1.9} aria-hidden />
          {simOpen ? 'Hide preview' : 'Preview replies'}
        </button>
      )}
    </div>
  )
}
