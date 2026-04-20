'use client'

import { useState } from 'react'
import { useFlowActions, useFlowState } from '../../store'
import { B } from './palette'

export default function BHeader({
  simOpen,
  onToggleSim,
}: {
  simOpen: boolean
  onToggleSim: () => void
}) {
  const state = useFlowState()
  const actions = useFlowActions()
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <div
      style={{
        height: 52,
        flexShrink: 0,
        background: B.panel,
        borderBottom: `1px solid ${B.line}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: `linear-gradient(135deg, ${B.accent}, #7B6FE6)`,
          display: 'grid',
          placeItems: 'center',
          color: B.panel,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        i
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: B.ink2,
        }}
      >
        <span>{state.flow.brand}</span>
        <span style={{ color: B.ink3 }}>›</span>
        <span style={{ color: B.ink, fontWeight: 500 }}>{state.flow.name}</span>
      </div>
      <div
        style={{
          marginLeft: 10,
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 999,
          background: B.accentSoft,
          color: B.accentInk,
          fontWeight: 500,
        }}
      >
        Draft version {state.draftVersion}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: B.ink3,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#3FB37F',
          }}
        />
        Live on version {state.publishedVersion} · 42 conversations today
      </div>
      <button
        type="button"
        onClick={onToggleSim}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: `1px solid ${B.line}`,
          background: simOpen ? B.accentSoft : B.panel,
          color: simOpen ? B.accentInk : B.ink2,
          fontSize: 12,
          cursor: 'pointer',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: simOpen ? B.accent : B.ink3,
          }}
        />
        Simulator
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: B.accent,
          color: B.panel,
          fontSize: 12,
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Publish version {state.draftVersion}
      </button>
      {confirmOpen && (
        <PublishConfirm
          draftVersion={state.draftVersion}
          publishedVersion={state.publishedVersion}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            actions.publish()
            setConfirmOpen(false)
          }}
        />
      )}
    </div>
  )
}

function PublishConfirm({
  draftVersion,
  publishedVersion,
  onCancel,
  onConfirm,
}: {
  draftVersion: number
  publishedVersion: number
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(22,21,40,0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 300,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, calc(100vw - 32px))',
          background: B.panel,
          borderRadius: 14,
          padding: '20px 22px 16px',
          boxShadow: '0 24px 60px rgba(22,21,40,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          id="publish-confirm-title"
          style={{ fontSize: 15, fontWeight: 600, color: B.ink }}
        >
          Publish version {draftVersion} to the live bot?
        </div>
        <div style={{ fontSize: 13, color: B.ink2, lineHeight: 1.5 }}>
          Version {publishedVersion} is currently serving live prospects.
          Publishing will make version {draftVersion} the new live version
          immediately. Active conversations will continue under version{' '}
          {publishedVersion} until their next message, then switch to version{' '}
          {draftVersion}.
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1px solid ${B.line}`,
              background: B.panel,
              color: B.ink2,
              fontSize: 12.5,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              background: B.accent,
              color: B.panel,
              fontSize: 12.5,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Publish version {draftVersion}
          </button>
        </div>
      </div>
    </div>
  )
}
