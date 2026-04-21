'use client'

import { PanelLeftClose, Plus } from 'lucide-react'
import { BLOCK_CATALOG, blockColor } from '../../shared-data'
import { useFlowActions, useFlowState } from '../../store'
import type { BlockType } from '../../types'
import { B } from './palette'

export default function PaletteDrawer() {
  const state = useFlowState()
  const actions = useFlowActions()

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, type: BlockType) => {
    e.dataTransfer.setData('application/x-block-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      style={{
        position: 'absolute',
        // 12px from the tabpanel's left edge. The tabpanel already excludes
        // PageNav (they're flex siblings), so the collapsed drawer no longer
        // overlaps the nav — the original layout bug from pass 1 stays fixed.
        left: 12,
        top: 12,
        bottom: 12,
        width: state.paletteOpen ? 230 : 44,
        background: B.panel,
        borderRadius: 12,
        border: `1px solid ${B.line}`,
        boxShadow: '0 6px 18px rgba(22,21,40,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 15,
        transition: 'width .15s',
      }}
    >
      <button
        type="button"
        onClick={() => actions.togglePalette()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: state.paletteOpen ? '10px 12px' : '10px 0',
          justifyContent: state.paletteOpen ? 'flex-start' : 'center',
          border: 'none',
          borderBottom: state.paletteOpen ? `1px solid ${B.line}` : 'none',
          background: 'transparent',
          color: B.ink2,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
        }}
        title={state.paletteOpen ? 'Hide palette' : 'Add block'}
        aria-label={state.paletteOpen ? 'Hide palette' : 'Add block'}
        aria-expanded={state.paletteOpen}
      >
        {state.paletteOpen ? (
          <PanelLeftClose aria-hidden size={14} strokeWidth={1.75} />
        ) : (
          <Plus aria-hidden size={14} strokeWidth={2} />
        )}
        {state.paletteOpen && <span>Blocks</span>}
      </button>
      {state.paletteOpen && (
        <div style={{ padding: '10px 8px', overflow: 'auto', flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: B.ink3,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 600,
              padding: '2px 8px 8px',
            }}
          >
            Drag onto canvas
          </div>
          {BLOCK_CATALOG.map((b) => (
            <div
              key={b.type}
              draggable
              onDragStart={(e) => onDragStart(e, b.type)}
              style={{
                padding: '7px 8px',
                borderRadius: 8,
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                cursor: 'grab',
                transition: 'background .12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = B.lineSoft
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: blockColor(b.type, { l: 0.58, c: 0.14 }),
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: B.ink }}>
                  {b.label}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: B.ink3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.blurb}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
