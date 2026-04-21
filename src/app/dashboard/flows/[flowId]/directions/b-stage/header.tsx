'use client'

import { useEffect, useState } from 'react'
import { useFlowState } from '../../store'
import { fetchTodayConversationCountAction } from '../../actions'
import { B } from './palette'

export default function BHeader({
  simOpen,
  onToggleSim,
}: {
  simOpen: boolean
  onToggleSim: () => void
}) {
  const state = useFlowState()
  const [todayCount, setTodayCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetchTodayConversationCountAction().then((n) => {
      if (alive) setTodayCount(n)
    })
    return () => {
      alive = false
    }
  }, [])
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
      {state.dirtySincePublish && (
        <div
          role="status"
          aria-label="Draft has unpublished changes"
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            background: '#FBE7D9',
            color: '#8B4316',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#E08040',
            }}
          />
          Unsaved changes
        </div>
      )}
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
            background: todayCount && todayCount > 0 ? '#3FB37F' : B.line,
          }}
        />
        Prompt setter-v2
        {todayCount !== null && todayCount > 0 && (
          <span>
            {' '}
            · {todayCount} conversation{todayCount === 1 ? '' : 's'} today
          </span>
        )}
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
        disabled
        aria-disabled="true"
        title="Publishing not wired yet — your edits save locally for now."
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: 'none',
          background: B.accent,
          color: B.panel,
          fontSize: 12,
          cursor: 'not-allowed',
          fontWeight: 500,
          opacity: 0.45,
        }}
      >
        Publish
      </button>
    </div>
  )
}
