'use client'

import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import {
  BLOCK_BY_TYPE,
  blockColor,
  blockInk,
  blockTint,
} from '../../shared-data'
import { useFlowActions, useFlowState } from '../../store'
import type { BlockType, FlowNode } from '../../types'
import { B } from './palette'

const B_COL = 290
const B_ROW = 180
export const B_NODE_W = 250
export const B_NODE_H = 118

const nodePx = (n: FlowNode) => ({
  x: 80 + n.pos.x * B_COL,
  y: 80 + n.pos.y * B_ROW,
})

interface Viewport {
  x: number
  y: number
  zoom: number
}

function Node({
  node,
  selected,
  active,
  onSelect,
  onDragStart,
  onKeyDown,
  dragOverridePx,
  nodeRef,
}: {
  node: FlowNode
  selected: boolean
  active: boolean
  onSelect: (id: BlockType) => void
  onDragStart: (id: BlockType, e: ReactPointerEvent) => void
  onKeyDown: (id: BlockType, e: React.KeyboardEvent) => void
  dragOverridePx?: { x: number; y: number } | null
  nodeRef?: (el: HTMLDivElement | null) => void
}) {
  const color = blockColor(node.type, { l: 0.58, c: 0.14 })
  const tint = blockTint(node.type)
  const p = dragOverridePx ?? nodePx(node)
  const exitCount = node.branches.length

  return (
    <div
      ref={nodeRef}
      role="button"
      tabIndex={0}
      aria-label={`Block ${node.name}${selected ? ', selected' : ''}. Arrow keys to move, Enter to edit, Delete to remove.`}
      aria-pressed={selected}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        onDragStart(node.id, e)
      }}
      onClick={() => onSelect(node.id)}
      onFocus={() => onSelect(node.id)}
      onKeyDown={(e) => onKeyDown(node.id, e)}
      style={{
        position: 'absolute',
        left: p.x,
        top: p.y,
        width: B_NODE_W,
        background: B.panel,
        borderRadius: 12,
        cursor: 'grab',
        border: `1px solid ${selected ? B.accent : B.line}`,
        boxShadow: selected
          ? `0 0 0 3px ${B.accentSoft}, 0 8px 24px rgba(22,21,40,0.10)`
          : active
            ? `0 0 0 3px ${tint}, 0 4px 14px rgba(22,21,40,0.08)`
            : '0 1px 2px rgba(22,21,40,0.04)',
        overflow: 'hidden',
        transition: 'box-shadow .18s, border-color .18s',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: '12px 14px 10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: B.ink3,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 600,
            }}
          >
            {BLOCK_BY_TYPE[node.type]?.label}
          </span>
        </div>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: B.ink,
            marginBottom: 4,
          }}
        >
          {node.name}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: B.ink2,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {node.goal || (
            <span style={{ color: B.ink3, fontStyle: 'italic' }}>
              No goal set
            </span>
          )}
        </div>
        {(active || exitCount > 0) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            {active && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  background: tint,
                  color: blockInk(node.type),
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                Active
              </span>
            )}
            {exitCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: B.lineSoft,
                  color: B.ink2,
                  fontWeight: 600,
                }}
              >
                {exitCount} exit{exitCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface EdgeData {
  from: FlowNode
  to: FlowNode
  br: { id: string }
}

function Edges({
  nodes,
  dragOverrides,
}: {
  nodes: FlowNode[]
  dragOverrides: Record<string, { x: number; y: number }>
}) {
  const edges: EdgeData[] = nodes.flatMap((n) =>
    n.branches.reduce<EdgeData[]>((acc, br) => {
      const to = nodes.find((x) => x.id === br.target)
      if (to) acc.push({ from: n, to, br })
      return acc
    }, [])
  )
  const posOf = (n: FlowNode) => dragOverrides[n.id] ?? nodePx(n)
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    >
      {edges.map((e, i) => {
        const p1 = posOf(e.from)
        const p2 = posOf(e.to)
        const color = blockColor(e.from.type, { l: 0.58, c: 0.14 })
        const sx = p1.x + B_NODE_W / 2
        const sy = p1.y + B_NODE_H
        const tx = p2.x + B_NODE_W / 2
        const ty = p2.y
        const midY = (sy + ty) / 2
        const d = `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.55}
          />
        )
      })}
    </svg>
  )
}

function snapToGrid(val: number, grid = 20): number {
  return Math.round(val / grid) * grid
}

const WORLD_W = 1600
const WORLD_H = 1200

export default function BCanvas() {
  const state = useFlowState()
  const actions = useFlowActions()
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [panning, setPanning] = useState(false)
  const panStart = useRef<{
    x: number
    y: number
    vx: number
    vy: number
  } | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // Track container size for the minimap viewport rect
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [nodeDrag, setNodeDrag] = useState<{
    id: BlockType
    startPx: { x: number; y: number }
    pointerStart: { x: number; y: number }
    currentPx: { x: number; y: number }
  } | null>(null)

  // Keyboard: hold space for pan cursor
  useEffect(() => {
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // don't hijack when typing in inputs
        const t = e.target as HTMLElement | null
        if (
          t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.isContentEditable)
        )
          return
        e.preventDefault()
        setSpaceDown(down)
      }
    }
    const onDown = onKey(true)
    const onUp = onKey(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return // only zoom on ctrl/cmd+wheel; normal wheel scrolls
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const delta = -e.deltaY * 0.002
    const nextZoom = Math.min(2, Math.max(0.25, viewport.zoom * (1 + delta)))
    // zoom around cursor
    const ratio = nextZoom / viewport.zoom
    const nextX = cx - (cx - viewport.x) * ratio
    const nextY = cy - (cy - viewport.y) * ratio
    setViewport({ x: nextX, y: nextY, zoom: nextZoom })
  }

  const onPointerDownContainer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const isMiddle = e.button === 1
    const isLeftSpace = e.button === 0 && spaceDown
    if (!isMiddle && !isLeftSpace) return
    if ((e.target as HTMLElement).closest('[data-node]')) return
    e.preventDefault()
    setPanning(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      vx: viewport.x,
      vy: viewport.y,
    }
    containerRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMoveContainer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panning || !panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setViewport((v) => ({
      ...v,
      x: panStart.current!.vx + dx,
      y: panStart.current!.vy + dy,
    }))
  }
  const onPointerUpContainer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panning) {
      setPanning(false)
      panStart.current = null
      containerRef.current?.releasePointerCapture(e.pointerId)
    }
  }

  const onNodeDragStart = (id: BlockType, e: ReactPointerEvent) => {
    const node = state.flow.nodes.find((n) => n.id === id)
    if (!node) return
    const startPx = nodePx(node)
    setNodeDrag({
      id,
      startPx,
      pointerStart: { x: e.clientX, y: e.clientY },
      currentPx: startPx,
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.stopPropagation()
  }

  const onNodeDragMove = (e: ReactPointerEvent) => {
    if (!nodeDrag) return
    const dx = (e.clientX - nodeDrag.pointerStart.x) / viewport.zoom
    const dy = (e.clientY - nodeDrag.pointerStart.y) / viewport.zoom
    setNodeDrag({
      ...nodeDrag,
      currentPx: { x: nodeDrag.startPx.x + dx, y: nodeDrag.startPx.y + dy },
    })
  }

  const onNodeDragEnd = (e: ReactPointerEvent) => {
    if (!nodeDrag) return
    const snapped = {
      x: snapToGrid(nodeDrag.currentPx.x - 80),
      y: snapToGrid(nodeDrag.currentPx.y - 80),
    }
    actions.moveNode(nodeDrag.id, {
      x: snapped.x / B_COL,
      y: snapped.y / B_ROW,
    })
    setNodeDrag(null)
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const dragOverrides: Record<string, { x: number; y: number }> = {}
  if (nodeDrag) dragOverrides[nodeDrag.id] = nodeDrag.currentPx

  // Keyboard node editing (WCAG 2.1.1) — arrow keys nudge, Delete removes,
  // Tab/Shift+Tab moves between nodes via native focus order, Escape blurs.
  // Step size matches one grid-snap (0.5 of a column/row) so repeated keys
  // line up with the grid. Shift multiplies for faster moves.
  const onNodeKeyDown = (id: BlockType, e: React.KeyboardEvent) => {
    const n = state.flow.nodes.find((x) => x.id === id)
    if (!n) return
    const step = e.shiftKey ? 1 : 0.5
    let dx = 0
    let dy = 0
    switch (e.key) {
      case 'ArrowLeft':
        dx = -step
        break
      case 'ArrowRight':
        dx = step
        break
      case 'ArrowUp':
        dy = -step
        break
      case 'ArrowDown':
        dy = step
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        actions.deleteNode(id)
        return
      case 'Escape':
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).blur()
        actions.select(null)
        return
      case 'Enter':
      case ' ':
        // Open inspector (already selected via onFocus). Prevent page scroll.
        e.preventDefault()
        actions.select(id)
        return
      default:
        return
    }
    e.preventDefault()
    const nextPos = {
      x: Math.max(0, n.pos.x + dx),
      y: Math.max(0, n.pos.y + dy),
    }
    actions.moveNode(id, nextPos)
    // Refocus — the re-render keeps the same ref, so focus survives naturally.
  }

  // Drop from palette
  const onDropFromPalette = (e: ReactDragEvent<HTMLDivElement>) => {
    const type = e.dataTransfer.getData('application/x-block-type') as BlockType
    if (!type) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // transform screen coords → world coords
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    const worldX = (localX - viewport.x) / viewport.zoom
    const worldY = (localY - viewport.y) / viewport.zoom
    const gridX = snapToGrid(worldX - 80 - B_NODE_W / 2) / B_COL
    const gridY = snapToGrid(worldY - 80 - B_NODE_H / 2) / B_ROW

    // unique id; append a suffix for duplicates
    const existingIds = new Set(state.flow.nodes.map((n) => n.id))
    let id: string = type
    let i = 2
    while (existingIds.has(id as BlockType)) {
      id = `${type}_${i}` as BlockType
      i++
    }
    const def = BLOCK_BY_TYPE[type]
    actions.addNode({
      id: id as BlockType,
      type,
      name: def?.label ?? 'New block',
      goal: def?.blurb ?? '',
      guidance: '',
      examples: [],
      captures: [],
      branches: [],
      pos: { x: gridX, y: gridY },
    })
  }

  const zoomPct = Math.round(viewport.zoom * 100)
  const fitView = () => setViewport({ x: 0, y: 0, zoom: 1 })
  const zoomIn = () =>
    setViewport((v) => ({ ...v, zoom: Math.min(2, v.zoom * 1.2) }))
  const zoomOut = () =>
    setViewport((v) => ({ ...v, zoom: Math.max(0.25, v.zoom / 1.2) }))

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onPointerDown={onPointerDownContainer}
      onPointerMove={(e) => {
        onPointerMoveContainer(e)
        if (nodeDrag) onNodeDragMove(e)
      }}
      onPointerUp={(e) => {
        onPointerUpContainer(e)
        if (nodeDrag) onNodeDragEnd(e)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={onDropFromPalette}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        cursor: panning ? 'grabbing' : spaceDown ? 'grab' : 'default',
        background: `radial-gradient(circle at 50% 30%, rgba(79,70,186,0.05), transparent 60%), ${B.bg}`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: WORLD_W,
            height: WORLD_H,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(22,21,40,0.06) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div style={{ position: 'relative', width: WORLD_W, height: WORLD_H }}>
          <Edges nodes={state.flow.nodes} dragOverrides={dragOverrides} />
          {state.flow.nodes.map((n) => (
            <div data-node={n.id} key={n.id}>
              <Node
                node={n}
                selected={state.selectedId === n.id}
                active={
                  state.simActiveBlock === n.id && state.conversation.length > 0
                }
                onSelect={actions.select}
                onDragStart={onNodeDragStart}
                onKeyDown={onNodeKeyDown}
                nodeRef={(el) => {
                  nodeRefs.current[n.id] = el
                }}
                dragOverridePx={
                  nodeDrag?.id === n.id ? nodeDrag.currentPx : null
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* zoom controls */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          background: B.panel,
          borderRadius: 10,
          border: `1px solid ${B.line}`,
          padding: 4,
          display: 'flex',
          gap: 2,
          boxShadow: '0 4px 12px rgba(22,21,40,0.06)',
          zIndex: 5,
        }}
      >
        <IconButton
          icon={Minus}
          label="Zoom out"
          onClick={zoomOut}
          size={28}
          iconSize={14}
          style={{ color: B.ink2 }}
        />
        <span
          style={{
            padding: '6px 10px',
            fontSize: 12,
            color: B.ink2,
            minWidth: 50,
            textAlign: 'center',
          }}
        >
          {zoomPct}%
        </span>
        <IconButton
          icon={Plus}
          label="Zoom in"
          onClick={zoomIn}
          size={28}
          iconSize={14}
          style={{ color: B.ink2 }}
        />
        <IconButton
          icon={Maximize2}
          label="Fit view"
          onClick={fitView}
          size={28}
          iconSize={13}
          style={{ color: B.ink2 }}
        />
      </div>

      {/* hint */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          padding: '5px 10px',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: 8,
          fontSize: 10.5,
          color: B.ink3,
          border: `1px solid ${B.line}`,
          zIndex: 5,
        }}
      >
        drag nodes · hold{' '}
        <kbd style={{ fontFamily: 'inherit', fontWeight: 600 }}>Space</kbd> to
        pan ·{' '}
        <kbd style={{ fontFamily: 'inherit', fontWeight: 600 }}>⌘/Ctrl</kbd>
        +wheel to zoom · focus a node then{' '}
        <kbd style={{ fontFamily: 'inherit', fontWeight: 600 }}>↑↓←→</kbd> to
        move
      </div>

      {/* minimap */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: 180,
          height: 120,
          background: B.panel,
          borderRadius: 10,
          border: `1px solid ${B.line}`,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(22,21,40,0.06)',
          zIndex: 5,
        }}
      >
        <svg width="180" height="120" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}>
          {state.flow.nodes.map((n) => {
            const p = nodePx(n)
            return (
              <rect
                key={n.id}
                x={p.x}
                y={p.y}
                width={B_NODE_W}
                height={B_NODE_H}
                rx="12"
                fill={blockColor(n.type, { l: 0.8, c: 0.08 })}
              />
            )
          })}
          {containerSize.w > 0 && (
            <rect
              x={-viewport.x / viewport.zoom}
              y={-viewport.y / viewport.zoom}
              width={containerSize.w / viewport.zoom}
              height={containerSize.h / viewport.zoom}
              fill="none"
              stroke={B.accent}
              strokeWidth="6"
              strokeDasharray="20 8"
            />
          )}
        </svg>
      </div>
    </div>
  )
}
