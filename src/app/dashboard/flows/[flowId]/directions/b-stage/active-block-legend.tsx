'use client'

// Small legend that explains what the canvas highlight means while the
// simulator is running. Shares the active-block signal with the inspector
// pill and the simulator chip so an operator sees one coherent story across
// every surface.
//
// The legend is purely informational and only renders when:
//   1. There's an active block in the store (after a sim_receive turn lands).
//   2. The conversation has at least one turn (otherwise the highlight is
//      just the initial state and there's nothing to explain).
//
// Clicking the legend selects the active block — a quick way for the
// operator to jump from "what's replying right now" to "let me edit it".

import { blockColor } from '../../shared-data'
import { useFlowActions, useFlowState } from '../../store'
import { getActiveBlockLabel } from './active-block'
import { B } from './palette'

export function ActiveBlockLegend() {
  const state = useFlowState()
  const actions = useFlowActions()

  // Only render when the simulator has produced at least one turn AND we
  // have an active-block signal. `simReset` clears the conversation, which
  // is exactly when we want to hide the legend again.
  if (!state.simActiveBlock) return null
  if (state.conversation.length === 0) return null

  const activeNode = state.flow.nodes.find(
    (node) => node.id === state.simActiveBlock
  )
  if (!activeNode) return null

  const label = getActiveBlockLabel(activeNode.type)
  const dotColor = blockColor(activeNode.type, { l: 0.58, c: 0.14 })

  return (
    <button
      type="button"
      aria-label={`Currently replying as ${label}. Click to edit this step.`}
      onClick={() => actions.select(activeNode.id)}
      style={{
        position: 'absolute',
        left: 72,
        top: 64,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: `1px solid ${B.line}`,
        borderRadius: 999,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(22,21,40,0.06)',
        zIndex: 5,
        color: B.ink,
        fontFamily: 'inherit',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: B.ink2,
        }}
      >
        Currently replying as
      </span>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: B.ink,
        }}
      >
        {label}
      </span>
    </button>
  )
}
