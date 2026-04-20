'use client'

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
        Draft v{state.draftVersion}
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
        Live on v{state.publishedVersion} · 42 convos today
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
        onClick={() => actions.publish()}
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
        Publish v{state.draftVersion}
      </button>
    </div>
  )
}
