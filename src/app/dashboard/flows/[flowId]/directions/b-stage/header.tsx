'use client'

import { useFlowState } from '../../store'
import type { PageId } from '../../types'
import { B } from './palette'

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

  return (
    <div
      style={{
        height: 56,
        flexShrink: 0,
        background: B.panel,
        borderBottom: `1px solid ${B.line}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
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
          flexDirection: 'column',
          minWidth: 0,
          gap: 1,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: B.ink3,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontWeight: 700,
          }}
        >
          {state.flow.brand}
        </div>
        <div
          style={{
            fontSize: 14,
            color: B.ink,
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {state.flow.name}
        </div>
      </div>
      {state.dirtySincePublish && (
        <div
          role="status"
          aria-label="Draft has unpublished changes"
          style={{
            fontSize: 11,
            padding: '4px 8px',
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
          Draft changes
        </div>
      )}
      <div style={{ flex: 1 }} />
      {page === 'flow' && (
        <button
          type="button"
          onClick={onToggleSim}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${simOpen ? B.accentSoft : B.line}`,
            background: simOpen ? B.accentSoft : B.lineSoft,
            color: simOpen ? B.accentInk : B.ink2,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
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
          {simOpen ? 'Hide test' : 'Test flow'}
        </button>
      )}
    </div>
  )
}
