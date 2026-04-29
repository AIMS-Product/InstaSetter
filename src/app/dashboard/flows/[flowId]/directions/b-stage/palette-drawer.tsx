'use client'

import { useRef } from 'react'
import { PanelLeftClose, Plus, PlusCircle } from 'lucide-react'
import { getBlockDisplayLabel } from '@/lib/dashboard/flow-builder-labels'
import { BLOCK_CATALOG, blockColor } from '../../shared-data'
import { useFlowActions, useFlowState } from '../../store'
import type { BlockCatalogEntry, BlockType, FlowNode } from '../../types'
import { B } from './palette'
import { FloatingPanel } from './floating-panel'

const GRID_STEP = { x: 1, y: 0 }

export default function PaletteDrawer() {
  const state = useFlowState()
  const actions = useFlowActions()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const titleId = 'flow-palette-title'
  const selectedNode = state.selectedId
    ? (state.flow.nodes.find((node) => node.id === state.selectedId) ?? null)
    : null

  const onDragStart = (e: React.DragEvent<HTMLElement>, type: BlockType) => {
    e.dataTransfer.setData('application/x-block-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const nextUniqueId = (type: BlockType): BlockType => {
    const existingIds = new Set(state.flow.nodes.map((node) => node.id))
    let id = type
    let suffix = 2
    while (existingIds.has(id)) {
      id = `${type}_${suffix}` as BlockType
      suffix += 1
    }
    return id
  }

  const nextOpenPosition = (base: FlowNode['pos']) => {
    const occupied = new Set(
      state.flow.nodes.map((node) => `${node.pos.x}:${node.pos.y}`)
    )
    let pos = { ...base }
    while (occupied.has(`${pos.x}:${pos.y}`)) {
      pos = { x: pos.x + GRID_STEP.x, y: pos.y + GRID_STEP.y }
      if (pos.x > 5) pos = { x: 0, y: pos.y + 1 }
    }
    return pos
  }

  const nextBranchId = (fromId: BlockType, toId: BlockType): string => {
    const existingIds = new Set(
      state.flow.nodes.flatMap((node) =>
        node.branches.map((branch) => branch.id)
      )
    )
    let id = `br_${fromId}_${toId}`
    let suffix = 2
    while (existingIds.has(id)) {
      id = `br_${fromId}_${toId}_${suffix}`
      suffix += 1
    }
    return id
  }

  const addBlock = (entry: BlockCatalogEntry) => {
    const id = nextUniqueId(entry.type)
    const pos = nextOpenPosition(
      selectedNode
        ? { x: selectedNode.pos.x + 1, y: selectedNode.pos.y }
        : {
            x:
              Math.max(
                0,
                ...state.flow.nodes.map((node) => Math.floor(node.pos.x))
              ) + 1,
            y: 0,
          }
    )

    const idParts = String(id).split('_')
    const duplicateSuffix = idParts[idParts.length - 1]
    const displayLabel = getBlockDisplayLabel(entry.type)

    actions.addNode({
      id,
      type: entry.type,
      name:
        id === entry.type ? displayLabel : `${displayLabel} ${duplicateSuffix}`,
      goal: entry.blurb,
      guidance: '',
      examples: [],
      captures: [],
      branches: [],
      pos,
    })

    if (selectedNode) {
      actions.addBranch(selectedNode.id, {
        id: nextBranchId(selectedNode.id, id),
        label: displayLabel,
        when: 'next step',
        target: id,
      })
      actions.toast(`Added ${displayLabel} after ${selectedNode.name}.`)
      return
    }

    actions.toast(`Added ${displayLabel}.`)
  }

  return (
    <FloatingPanel
      open={state.paletteOpen}
      titleId={titleId}
      onClose={() => actions.togglePalette()}
      initialFocusRef={toggleRef}
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
        // Cosmetic frame doesn't intercept canvas pointer events; controls
        // re-enable themselves below.
        pointerEvents: 'none',
      }}
    >
      <button
        ref={toggleRef}
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
          pointerEvents: 'auto',
        }}
        title={state.paletteOpen ? 'Hide step library' : 'Add step'}
        aria-label={state.paletteOpen ? 'Hide step library' : 'Add step'}
        aria-expanded={state.paletteOpen}
      >
        {state.paletteOpen ? (
          <PanelLeftClose aria-hidden size={14} strokeWidth={1.75} />
        ) : (
          <Plus aria-hidden size={14} strokeWidth={2} />
        )}
        {state.paletteOpen && <span id={titleId}>Steps</span>}
      </button>
      {state.paletteOpen && (
        <div
          style={{
            padding: '10px 8px',
            overflow: 'auto',
            flex: 1,
            pointerEvents: 'auto',
          }}
        >
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
            Step library
          </div>
          {selectedNode && (
            <div
              style={{
                margin: '0 8px 8px',
                padding: '7px 9px',
                borderRadius: 8,
                background: B.accentSoft,
                color: B.accentInk,
                fontSize: 11,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`Target: ${selectedNode.name}`}
            >
              Target: {selectedNode.name}
            </div>
          )}
          {BLOCK_CATALOG.map((b) => (
            <button
              key={b.type}
              type="button"
              draggable
              onDragStart={(e) => onDragStart(e, b.type)}
              onClick={() => addBlock(b)}
              style={{
                width: '100%',
                padding: '7px 8px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                marginBottom: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                cursor: 'pointer',
                transition: 'background .12s',
                fontFamily: 'inherit',
                textAlign: 'left',
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
                  {getBlockDisplayLabel(b.type)}
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
              <PlusCircle
                aria-hidden
                size={14}
                strokeWidth={1.8}
                color={B.ink3}
              />
            </button>
          ))}
        </div>
      )}
    </FloatingPanel>
  )
}
