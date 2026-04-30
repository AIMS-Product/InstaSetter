'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { MessageSquareText, Undo2 } from 'lucide-react'
import { fetchFlowRuntimeAction, setFlowRuntimeAction } from '../../actions'
import PublishControls from '../../publish-controls'
import { useFlowActions, useFlowState } from '../../store'
import {
  StatusBadge,
  getDraftSaveStatus,
  getDraftWorkspaceStatus,
} from '../../surface-status'
import type { PageId } from '../../types'
import { HeaderHelpMenu } from './header-help-menu'
import { B } from './palette'

const PAGE_SUMMARY: Record<PageId, string> = {
  flow: 'Edit the team draft and check the tone before publishing.',
  variables: 'Check what the bot remembers and where each value comes from.',
  versions: 'See what is saved in draft versus what powers live replies.',
  bot: 'Inspect the global persona and guardrails behind every reply.',
}

export default function BHeader({
  flowId,
  page,
  simOpen,
  onToggleSim,
  botEnabled,
}: {
  flowId: string
  page: PageId
  simOpen: boolean
  onToggleSim: () => void
  botEnabled: boolean
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const [runtimeEnabled, setRuntimeEnabled] = useState(botEnabled)
  const [runtimeOpen, setRuntimeOpen] = useState(false)
  const [runtimeBusy, setRuntimeBusy] = useState(false)
  const draftStatus = getDraftWorkspaceStatus(state.dirtySincePublish)
  const saveStatus = getDraftSaveStatus(state.draftSyncStatus)
  const saveTone =
    state.draftSyncStatus === 'error'
      ? 'danger'
      : state.draftSyncStatus === 'saved'
        ? 'success'
        : 'info'
  const draftSummary = `${draftStatus.label} · ${saveStatus.label}`

  useEffect(() => {
    let alive = true
    fetchFlowRuntimeAction({ flowId }).then((runtime) => {
      if (!alive || !runtime) return
      setRuntimeEnabled(runtime.botEnabled)
    })
    return () => {
      alive = false
    }
  }, [flowId])

  const setPause = async (paused: boolean, durationMinutes?: number) => {
    setRuntimeBusy(true)
    const runtime = await setFlowRuntimeAction({
      flowId,
      paused,
      durationMinutes,
    })
    if (runtime) setRuntimeEnabled(runtime.botEnabled)
    setRuntimeBusy(false)
    setRuntimeOpen(false)
  }

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
          label={`Draft: ${draftSummary}`}
          tone={state.dirtySincePublish ? 'warning' : saveTone}
        />
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setRuntimeOpen((open) => !open)}
            aria-expanded={runtimeOpen}
            aria-haspopup="dialog"
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <StatusBadge
              p={B}
              label={`Runtime: ${runtimeEnabled ? 'Bot active' : 'Bot paused'}`}
              tone={runtimeEnabled ? 'success' : 'danger'}
            />
          </button>
          {runtimeOpen && (
            <div
              role="dialog"
              aria-label="Bot runtime controls"
              style={{
                position: 'absolute',
                top: 30,
                left: 0,
                zIndex: 50,
                width: 230,
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${B.line}`,
                background: B.panel,
                boxShadow: '0 18px 40px rgba(22,21,40,0.16)',
                display: 'grid',
                gap: 8,
              }}
            >
              <button
                type="button"
                disabled={runtimeBusy || !runtimeEnabled}
                onClick={() => setPause(true, 60)}
                style={runtimeMenuButtonStyle(runtimeBusy || !runtimeEnabled)}
              >
                Pause 1 hour
              </button>
              <button
                type="button"
                disabled={runtimeBusy || !runtimeEnabled}
                onClick={() => setPause(true)}
                style={runtimeMenuButtonStyle(runtimeBusy || !runtimeEnabled)}
              >
                Pause until I resume
              </button>
              <button
                type="button"
                disabled={runtimeBusy || runtimeEnabled}
                onClick={() => setPause(false)}
                style={runtimeMenuButtonStyle(runtimeBusy || runtimeEnabled)}
              >
                Resume bot
              </button>
              <button
                type="button"
                onClick={() => setRuntimeOpen(false)}
                style={runtimeMenuButtonStyle(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {state.undo && (
          <button
            type="button"
            onClick={() => actions.undoLastDelete()}
            style={headerButtonStyle(false)}
          >
            <Undo2 size={15} strokeWidth={1.9} aria-hidden />
            Undo delete
          </button>
        )}
        {page === 'flow' && (
          <button
            type="button"
            onClick={onToggleSim}
            style={headerButtonStyle(simOpen)}
          >
            <MessageSquareText size={15} strokeWidth={1.9} aria-hidden />
            {simOpen ? 'Hide preview' : 'Preview replies'}
          </button>
        )}
        <PublishControls brand={state.flow.brand} flowId={flowId} />
        <HeaderHelpMenu />
      </div>
    </div>
  )
}

function headerButtonStyle(active: boolean): CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 12,
    border: `1px solid ${active ? B.accentSoft : B.line}`,
    background: active ? B.accentSoft : B.lineSoft,
    color: active ? B.accentInk : B.ink,
    fontSize: 12.5,
    cursor: 'pointer',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: active ? '0 10px 24px rgba(79,70,186,0.10)' : 'none',
  }
}

function runtimeMenuButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '9px 10px',
    borderRadius: 9,
    border: `1px solid ${B.line}`,
    background: disabled ? B.lineSoft : B.panel,
    color: disabled ? B.ink3 : B.ink,
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
