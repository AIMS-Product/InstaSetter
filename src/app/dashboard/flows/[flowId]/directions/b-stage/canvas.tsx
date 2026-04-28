'use client'

import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { Position } from '@xyflow/react'
import { GitBranch, Maximize2, Minus, Plus, Workflow } from 'lucide-react'
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

const B_COL = 320
const B_ROW = 320
export const B_NODE_W = 240
export const B_NODE_H = 240

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
      aria-label={`Block ${node.name}${selected ? ', selected' : ''}. Arrow keys to move, Enter to edit.`}
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
        height: B_NODE_H,
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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 3, background: color, flexShrink: 0 }} />
      <div
        style={{
          padding: '16px 18px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
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
            fontSize: 12,
            color: B.ink2,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
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
              marginTop: 12,
              flexWrap: 'wrap',
              flexShrink: 0,
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
                {exitCount} path{exitCount === 1 ? '' : 's'}
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

interface RoutedEdge extends EdgeData {
  key: string
  sourcePosition: Position
  sourceIndex: number
  sourceCount: number
  targetPosition: Position
  targetIndex: number
  targetCount: number
}

const EDGE_PORT_PAD_X = 34
const EDGE_PORT_PAD_Y = 16

function edgeKey(edge: EdgeData): string {
  return `${edge.from.id}:${edge.br.id}:${edge.to.id}`
}

function nodeCenter(
  node: FlowNode,
  posOf: (node: FlowNode) => { x: number; y: number }
) {
  const pos = posOf(node)
  return {
    x: pos.x + B_NODE_W / 2,
    y: pos.y + B_NODE_H / 2,
  }
}

function chooseRoute(
  edge: EdgeData,
  posOf: (node: FlowNode) => { x: number; y: number }
): Pick<RoutedEdge, 'sourcePosition' | 'targetPosition'> {
  const fromCenter = nodeCenter(edge.from, posOf)
  const toCenter = nodeCenter(edge.to, posOf)
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y
  const horizontalDominant = Math.abs(dx) > Math.abs(dy) * 1.4

  if (horizontalDominant) {
    return dx >= 0
      ? { sourcePosition: Position.Right, targetPosition: Position.Left }
      : { sourcePosition: Position.Left, targetPosition: Position.Right }
  }

  return dy >= 0
    ? { sourcePosition: Position.Bottom, targetPosition: Position.Top }
    : { sourcePosition: Position.Top, targetPosition: Position.Bottom }
}

function laneRank(
  edge: EdgeData,
  anchor: Position,
  end: 'source' | 'target',
  posOf: (node: FlowNode) => { x: number; y: number }
): [number, number] {
  const other = end === 'source' ? edge.to : edge.from
  const center = nodeCenter(other, posOf)

  return anchor === Position.Top || anchor === Position.Bottom
    ? [center.x, center.y]
    : [center.y, center.x]
}

function compareLaneRank(a: [number, number], b: [number, number]) {
  if (a[0] !== b[0]) return a[0] - b[0]
  return a[1] - b[1]
}

type LaidOutEdge = EdgeData & {
  key: string
  sourcePosition: Position
  targetPosition: Position
}

function buildRoutedEdges(
  edges: EdgeData[],
  posOf: (node: FlowNode) => { x: number; y: number }
): RoutedEdge[] {
  const laidOut: LaidOutEdge[] = edges.map((edge) => ({
    ...edge,
    key: edgeKey(edge),
    ...chooseRoute(edge, posOf),
  }))

  const outgoing = new Map<string, LaidOutEdge[]>()
  const incoming = new Map<string, LaidOutEdge[]>()

  for (const edge of laidOut) {
    const outKey = `${edge.from.id}:${edge.sourcePosition}`
    const inKey = `${edge.to.id}:${edge.targetPosition}`
    outgoing.set(outKey, [...(outgoing.get(outKey) ?? []), edge])
    incoming.set(inKey, [...(incoming.get(inKey) ?? []), edge])
  }

  for (const [groupKey, groupEdges] of outgoing) {
    const anchor = groupKey.endsWith(`:${Position.Left}`)
      ? Position.Left
      : groupKey.endsWith(`:${Position.Right}`)
        ? Position.Right
        : groupKey.endsWith(`:${Position.Top}`)
          ? Position.Top
          : Position.Bottom

    outgoing.set(
      groupKey,
      [...groupEdges].sort((a, b) =>
        compareLaneRank(
          laneRank(a, anchor, 'source', posOf),
          laneRank(b, anchor, 'source', posOf)
        )
      )
    )
  }

  for (const [groupKey, groupEdges] of incoming) {
    const anchor = groupKey.endsWith(`:${Position.Left}`)
      ? Position.Left
      : groupKey.endsWith(`:${Position.Right}`)
        ? Position.Right
        : groupKey.endsWith(`:${Position.Top}`)
          ? Position.Top
          : Position.Bottom

    incoming.set(
      groupKey,
      [...groupEdges].sort((a, b) =>
        compareLaneRank(
          laneRank(a, anchor, 'target', posOf),
          laneRank(b, anchor, 'target', posOf)
        )
      )
    )
  }

  return laidOut.map((edge) => {
    const outGroup =
      outgoing.get(`${edge.from.id}:${edge.sourcePosition}`) ?? []
    const inGroup = incoming.get(`${edge.to.id}:${edge.targetPosition}`) ?? []

    return {
      ...edge,
      sourceIndex: Math.max(outGroup.indexOf(edge), 0),
      sourceCount: outGroup.length || 1,
      targetIndex: Math.max(inGroup.indexOf(edge), 0),
      targetCount: inGroup.length || 1,
    }
  })
}

function edgeDistance(
  edge: EdgeData,
  posOf: (node: FlowNode) => { x: number; y: number }
) {
  const fromCenter = nodeCenter(edge.from, posOf)
  const toCenter = nodeCenter(edge.to, posOf)
  return (
    Math.abs(toCenter.x - fromCenter.x) + Math.abs(toCenter.y - fromCenter.y)
  )
}

function incomingEdgeCoverage(
  targetId: string,
  adjacency: Map<string, string[]>,
  roots: string[]
) {
  let total = 0

  const visit = (nodeId: string, seen: Set<string>) => {
    if (nodeId === targetId) {
      total += 1
      return
    }

    for (const next of adjacency.get(nodeId) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      visit(next, seen)
      seen.delete(next)
    }
  }

  for (const root of roots) {
    const seen = new Set([root])
    visit(root, seen)
  }

  return total
}

function representativeIncomingEdges(
  edges: EdgeData[],
  nodes: FlowNode[],
  posOf: (node: FlowNode) => { x: number; y: number }
) {
  const incoming = new Map<string, EdgeData[]>()
  const indegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    indegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of edges) {
    incoming.set(edge.to.id, [...(incoming.get(edge.to.id) ?? []), edge])
    indegree.set(edge.to.id, (indegree.get(edge.to.id) ?? 0) + 1)
    adjacency.set(edge.from.id, [
      ...(adjacency.get(edge.from.id) ?? []),
      edge.to.id,
    ])
  }

  const roots = nodes
    .map((node) => node.id)
    .filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0)

  const out: EdgeData[] = []

  for (const node of nodes) {
    const edgesIntoNode = incoming.get(node.id) ?? []
    if (edgesIntoNode.length <= 2) {
      out.push(...edgesIntoNode)
      continue
    }

    const sorted = [...edgesIntoNode].sort((a, b) => {
      const coverageA = incomingEdgeCoverage(a.from.id, adjacency, roots)
      const coverageB = incomingEdgeCoverage(b.from.id, adjacency, roots)
      if (coverageA !== coverageB) return coverageB - coverageA

      const distanceA = edgeDistance(a, posOf)
      const distanceB = edgeDistance(b, posOf)
      if (distanceA !== distanceB) return distanceA - distanceB

      return edgeKey(a).localeCompare(edgeKey(b))
    })

    out.push(...sorted.slice(0, 2))
  }

  return out
}

function distributePort(
  index: number,
  count: number,
  length: number,
  pad: number
): number {
  if (count <= 1) return length / 2
  const usable = Math.max(length - pad * 2, 0)
  return pad + (usable * (index + 1)) / (count + 1)
}

function edgeAnchor(
  node: FlowNode,
  position: Position,
  index: number,
  count: number,
  posOf: (node: FlowNode) => { x: number; y: number }
): { x: number; y: number } {
  const pos = posOf(node)

  switch (position) {
    case Position.Top:
      return {
        x: pos.x + distributePort(index, count, B_NODE_W, EDGE_PORT_PAD_X),
        y: pos.y,
      }
    case Position.Right:
      return {
        x: pos.x + B_NODE_W,
        y: pos.y + distributePort(index, count, B_NODE_H, EDGE_PORT_PAD_Y),
      }
    case Position.Bottom:
      return {
        x: pos.x + distributePort(index, count, B_NODE_W, EDGE_PORT_PAD_X),
        y: pos.y + B_NODE_H,
      }
    case Position.Left:
      return {
        x: pos.x,
        y: pos.y + distributePort(index, count, B_NODE_H, EDGE_PORT_PAD_Y),
      }
  }
}

const EDGE_STUB = 22

function horizSegmentCrosses(
  y: number,
  x1: number,
  x2: number,
  nodes: FlowNode[],
  excludeIds: BlockType[],
  posOf: (n: FlowNode) => { x: number; y: number }
): FlowNode[] {
  const xMin = Math.min(x1, x2)
  const xMax = Math.max(x1, x2)
  return nodes.filter((n) => {
    if (excludeIds.includes(n.id)) return false
    const p = posOf(n)
    return (
      p.x < xMax && p.x + B_NODE_W > xMin && p.y <= y && p.y + B_NODE_H >= y
    )
  })
}

function vertSegmentCrosses(
  x: number,
  y1: number,
  y2: number,
  nodes: FlowNode[],
  excludeIds: BlockType[],
  posOf: (n: FlowNode) => { x: number; y: number }
): FlowNode[] {
  const yMin = Math.min(y1, y2)
  const yMax = Math.max(y1, y2)
  return nodes.filter((n) => {
    if (excludeIds.includes(n.id)) return false
    const p = posOf(n)
    return (
      p.y < yMax && p.y + B_NODE_H > yMin && p.x <= x && p.x + B_NODE_W >= x
    )
  })
}

const LANE_MARGIN = 22

function findEscape(
  preferredVal: number,
  ranges: Array<{ start: number; end: number }>,
  margin = LANE_MARGIN
): number {
  if (ranges.length === 0) return preferredVal

  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: Array<[number, number]> = []
  for (const r of sorted) {
    const last = merged[merged.length - 1]
    if (last && last[1] >= r.start) {
      last[1] = Math.max(last[1], r.end)
    } else {
      merged.push([r.start, r.end])
    }
  }

  const gapCenter = (gapStart: number, gapEnd: number): number => {
    if (gapStart === -Infinity) return gapEnd - margin
    if (gapEnd === Infinity) return gapStart + margin
    return (gapStart + gapEnd) / 2
  }

  const idx = merged.findIndex(
    (m) => m[0] <= preferredVal && preferredVal <= m[1]
  )

  if (idx === -1) {
    let gapStart = -Infinity
    let gapEnd = Infinity
    for (const m of merged) {
      if (m[1] < preferredVal) gapStart = Math.max(gapStart, m[1])
      if (m[0] > preferredVal) gapEnd = Math.min(gapEnd, m[0])
    }
    return gapCenter(gapStart, gapEnd)
  }

  const aboveStart = idx > 0 ? merged[idx - 1]![1] : -Infinity
  const aboveEnd = merged[idx]![0]
  const belowStart = merged[idx]![1]
  const belowEnd = idx < merged.length - 1 ? merged[idx + 1]![0] : Infinity

  const aboveCandidate = gapCenter(aboveStart, aboveEnd)
  const belowCandidate = gapCenter(belowStart, belowEnd)

  return Math.abs(aboveCandidate - preferredVal) <=
    Math.abs(belowCandidate - preferredVal)
    ? aboveCandidate
    : belowCandidate
}

function findLaneX(
  preferredX: number,
  _y1: number,
  _y2: number,
  nodes: FlowNode[],
  excludeIds: BlockType[],
  posOf: (n: FlowNode) => { x: number; y: number }
): number {
  const ranges = nodes
    .filter((n) => !excludeIds.includes(n.id))
    .map((n) => posOf(n))
    .map((p) => ({ start: p.x, end: p.x + B_NODE_W }))
  return findEscape(preferredX, ranges)
}

function findLaneY(
  preferredY: number,
  _x1: number,
  _x2: number,
  nodes: FlowNode[],
  excludeIds: BlockType[],
  posOf: (n: FlowNode) => { x: number; y: number }
): number {
  const ranges = nodes
    .filter((n) => !excludeIds.includes(n.id))
    .map((n) => posOf(n))
    .map((p) => ({ start: p.y, end: p.y + B_NODE_H }))
  return findEscape(preferredY, ranges)
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  let d = `M${points[0]!.x},${points[0]!.y}`
  for (let i = 1; i < points.length; i += 1) {
    d += ` L${points[i]!.x},${points[i]!.y}`
  }
  return d
}

function findColGaps(
  nodes: FlowNode[],
  posOf: (n: FlowNode) => { x: number; y: number }
): Array<[number, number]> {
  const ranges = nodes
    .map((n) => posOf(n))
    .map((p) => ({ start: p.x, end: p.x + B_NODE_W }))
    .sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && last.end >= r.start) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }
  const gaps: Array<[number, number]> = []
  for (let i = 0; i < merged.length - 1; i += 1) {
    gaps.push([merged[i]!.end, merged[i + 1]!.start])
  }
  return gaps
}

function findRowGaps(
  nodes: FlowNode[],
  posOf: (n: FlowNode) => { x: number; y: number }
): Array<[number, number]> {
  const ranges = nodes
    .map((n) => posOf(n))
    .map((p) => ({ start: p.y, end: p.y + B_NODE_H }))
    .sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && last.end >= r.start) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }
  const gaps: Array<[number, number]> = []
  for (let i = 0; i < merged.length - 1; i += 1) {
    gaps.push([merged[i]!.end, merged[i + 1]!.start])
  }
  return gaps
}

interface SegmentRef {
  pathIdx: number
  startIdx: number
  rangeMin: number
  rangeMax: number
  value: number
}

function clusterByOverlap(segments: SegmentRef[]): SegmentRef[][] {
  if (segments.length === 0) return []
  const sorted = [...segments].sort((a, b) => a.rangeMin - b.rangeMin)
  const clusters: SegmentRef[][] = [[sorted[0]!]]
  for (let i = 1; i < sorted.length; i += 1) {
    const seg = sorted[i]!
    const last = clusters[clusters.length - 1]!
    const lastMax = Math.max(...last.map((s) => s.rangeMax))
    if (seg.rangeMin <= lastMax) {
      last.push(seg)
    } else {
      clusters.push([seg])
    }
  }
  return clusters
}

function distributeLanes(
  paths: Array<{ points: Array<{ x: number; y: number }> }>,
  nodes: FlowNode[],
  posOf: (n: FlowNode) => { x: number; y: number }
) {
  const colGaps = findColGaps(nodes, posOf)
  const rowGaps = findRowGaps(nodes, posOf)

  for (const [gapStart, gapEnd] of colGaps) {
    const segments: SegmentRef[] = []
    for (let p = 0; p < paths.length; p += 1) {
      const pts = paths[p]!.points
      for (let i = 0; i < pts.length - 1; i += 1) {
        const a = pts[i]!
        const b = pts[i + 1]!
        if (a.x === b.x && a.x > gapStart && a.x < gapEnd) {
          segments.push({
            pathIdx: p,
            startIdx: i,
            rangeMin: Math.min(a.y, b.y),
            rangeMax: Math.max(a.y, b.y),
            value: a.x,
          })
        }
      }
    }
    const clusters = clusterByOverlap(segments)
    for (const cluster of clusters) {
      if (cluster.length < 2) continue
      const n = cluster.length
      for (let i = 0; i < n; i += 1) {
        const seg = cluster[i]!
        const newX = gapStart + ((gapEnd - gapStart) * (i + 1)) / (n + 1)
        const pts = paths[seg.pathIdx]!.points
        const oldX = seg.value
        if (pts[seg.startIdx]!.x === oldX) pts[seg.startIdx]!.x = newX
        if (pts[seg.startIdx + 1]!.x === oldX) pts[seg.startIdx + 1]!.x = newX
        seg.value = newX
      }
    }
  }

  for (const [gapStart, gapEnd] of rowGaps) {
    const segments: SegmentRef[] = []
    for (let p = 0; p < paths.length; p += 1) {
      const pts = paths[p]!.points
      for (let i = 0; i < pts.length - 1; i += 1) {
        const a = pts[i]!
        const b = pts[i + 1]!
        if (a.y === b.y && a.y > gapStart && a.y < gapEnd) {
          segments.push({
            pathIdx: p,
            startIdx: i,
            rangeMin: Math.min(a.x, b.x),
            rangeMax: Math.max(a.x, b.x),
            value: a.y,
          })
        }
      }
    }
    const clusters = clusterByOverlap(segments)
    for (const cluster of clusters) {
      if (cluster.length < 2) continue
      const n = cluster.length
      for (let i = 0; i < n; i += 1) {
        const seg = cluster[i]!
        const newY = gapStart + ((gapEnd - gapStart) * (i + 1)) / (n + 1)
        const pts = paths[seg.pathIdx]!.points
        const oldY = seg.value
        if (pts[seg.startIdx]!.y === oldY) pts[seg.startIdx]!.y = newY
        if (pts[seg.startIdx + 1]!.y === oldY) pts[seg.startIdx + 1]!.y = newY
        seg.value = newY
      }
    }
  }
}

function routePoints(
  edge: RoutedEdge,
  posOf: (node: FlowNode) => { x: number; y: number },
  allNodes: FlowNode[]
): Array<{ x: number; y: number }> {
  const source = edgeAnchor(
    edge.from,
    edge.sourcePosition,
    edge.sourceIndex,
    edge.sourceCount,
    posOf
  )
  const target = edgeAnchor(
    edge.to,
    edge.targetPosition,
    edge.targetIndex,
    edge.targetCount,
    posOf
  )
  const exclude: BlockType[] = [edge.from.id, edge.to.id]
  const sourceIsVertical =
    edge.sourcePosition === Position.Top ||
    edge.sourcePosition === Position.Bottom

  if (sourceIsVertical) {
    if (Math.abs(source.x - target.x) < 0.5) {
      const crosses = vertSegmentCrosses(
        source.x,
        source.y,
        target.y,
        allNodes,
        exclude,
        posOf
      )
      if (crosses.length === 0) return [source, target]
    }

    const dir = edge.sourcePosition === Position.Bottom ? 1 : -1
    const span = Math.abs(target.y - source.y)
    const stub = Math.min(EDGE_STUB, Math.max(span / 2, 4))
    const sourceStubY = source.y + dir * stub
    const targetStubY = target.y - dir * stub

    const segH = horizSegmentCrosses(
      sourceStubY,
      source.x,
      target.x,
      allNodes,
      exclude,
      posOf
    )
    const segVIn = vertSegmentCrosses(
      target.x,
      sourceStubY,
      target.y,
      allNodes,
      exclude,
      posOf
    )

    if (segH.length === 0 && segVIn.length === 0) {
      return [
        source,
        { x: source.x, y: sourceStubY },
        { x: target.x, y: sourceStubY },
        target,
      ]
    }

    const laneX = findLaneX(
      (source.x + target.x) / 2,
      sourceStubY,
      targetStubY,
      allNodes,
      exclude,
      posOf
    )
    return [
      source,
      { x: source.x, y: sourceStubY },
      { x: laneX, y: sourceStubY },
      { x: laneX, y: targetStubY },
      { x: target.x, y: targetStubY },
      target,
    ]
  }

  if (Math.abs(source.y - target.y) < 0.5) {
    const crosses = horizSegmentCrosses(
      source.y,
      source.x,
      target.x,
      allNodes,
      exclude,
      posOf
    )
    if (crosses.length === 0) return [source, target]
  }

  const dir = edge.sourcePosition === Position.Right ? 1 : -1
  const span = Math.abs(target.x - source.x)
  const stub = Math.min(EDGE_STUB, Math.max(span / 2, 4))
  const sourceStubX = source.x + dir * stub
  const targetStubX = target.x - dir * stub

  const segV = vertSegmentCrosses(
    sourceStubX,
    source.y,
    target.y,
    allNodes,
    exclude,
    posOf
  )
  const segHIn = horizSegmentCrosses(
    target.y,
    sourceStubX,
    target.x,
    allNodes,
    exclude,
    posOf
  )

  if (segV.length === 0 && segHIn.length === 0) {
    return [
      source,
      { x: sourceStubX, y: source.y },
      { x: sourceStubX, y: target.y },
      target,
    ]
  }

  const laneY = findLaneY(
    (source.y + target.y) / 2,
    sourceStubX,
    targetStubX,
    allNodes,
    exclude,
    posOf
  )
  return [
    source,
    { x: sourceStubX, y: source.y },
    { x: sourceStubX, y: laneY },
    { x: targetStubX, y: laneY },
    { x: targetStubX, y: target.y },
    target,
  ]
}

function pairBidirectional(edges: RoutedEdge[]): Array<{
  edge: RoutedEdge
  partnerBranch: { fromId: BlockType; branchId: string } | null
}> {
  const byForwardKey = new Map<string, number>()
  const result: Array<{
    edge: RoutedEdge
    partnerBranch: { fromId: BlockType; branchId: string } | null
  }> = []

  for (const edge of edges) {
    const reverseKey = `${edge.to.id}::${edge.from.id}`
    const existing = byForwardKey.get(reverseKey)
    if (existing !== undefined && result[existing]!.partnerBranch === null) {
      result[existing]!.partnerBranch = {
        fromId: edge.from.id,
        branchId: edge.br.id,
      }
      continue
    }
    const forwardKey = `${edge.from.id}::${edge.to.id}`
    byForwardKey.set(forwardKey, result.length)
    result.push({ edge, partnerBranch: null })
  }

  return result
}

function Edges({
  nodes,
  dragOverrides,
  selectedBranch,
  onSelectBranch,
}: {
  nodes: FlowNode[]
  dragOverrides: Record<string, { x: number; y: number }>
  selectedBranch: { fromId: BlockType; branchId: string } | null
  onSelectBranch: (
    selection: { fromId: BlockType; branchId: string } | null
  ) => void
}) {
  const edges: EdgeData[] = nodes.flatMap((n) =>
    n.branches.reduce<EdgeData[]>((acc, br) => {
      const to = nodes.find((x) => x.id === br.target)
      if (to) acc.push({ from: n, to, br })
      return acc
    }, [])
  )
  const posOf = (n: FlowNode) => dragOverrides[n.id] ?? nodePx(n)
  const routedEdges = buildRoutedEdges(
    representativeIncomingEdges(edges, nodes, posOf),
    posOf
  )
  const pairedEdges = pairBidirectional(routedEdges)
  const pathsWithPoints = pairedEdges.map((pe) => ({
    paired: pe,
    points: routePoints(pe.edge, posOf, nodes),
  }))
  distributeLanes(pathsWithPoints, nodes, posOf)
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
      <defs>
        <marker
          id="flow-arrow"
          viewBox="0 0 8 8"
          markerWidth="7"
          markerHeight="7"
          refX="8"
          refY="4"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
        </marker>
      </defs>
      {pathsWithPoints.map(({ paired: { edge, partnerBranch }, points }) => {
        const color = blockColor(edge.from.type, { l: 0.58, c: 0.14 })
        const d = pointsToPath(points)
        const isSelected =
          (selectedBranch?.fromId === edge.from.id &&
            selectedBranch?.branchId === edge.br.id) ||
          (partnerBranch !== null &&
            selectedBranch?.fromId === partnerBranch.fromId &&
            selectedBranch?.branchId === partnerBranch.branchId)
        const handleSelect = (e: React.MouseEvent) => {
          e.stopPropagation()
          onSelectBranch({ fromId: edge.from.id, branchId: edge.br.id })
        }
        return (
          <g key={edge.key}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={handleSelect}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              opacity={isSelected ? 1 : 0.55}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              markerEnd="url(#flow-arrow)"
              markerStart={
                partnerBranch !== null ? 'url(#flow-arrow)' : undefined
              }
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}
    </svg>
  )
}

function snapToGrid(val: number, grid = 20): number {
  return Math.round(val / grid) * grid
}

const WORLD_W = 1800
const WORLD_H = 1500

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
    const target = e.target as HTMLElement
    const isMiddle = e.button === 1
    const isLeftSpace = e.button === 0 && spaceDown
    const isLeftPlain = e.button === 0 && !spaceDown
    const onNode = !!target.closest('[data-node]')
    const onEdge = target.closest('svg') !== null && target.tagName === 'path'
    if (isLeftPlain && !onNode && !onEdge && state.selectedBranch) {
      actions.selectBranch(null)
    }
    if (!isMiddle && !isLeftSpace) return
    if (onNode) return
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

  // Keyboard node editing (WCAG 2.1.1) — arrow keys nudge, Tab/Shift+Tab
  // moves between nodes via native focus order, Escape blurs.
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
  const selectedNode = state.selectedId
    ? (state.flow.nodes.find((node) => node.id === state.selectedId) ?? null)
    : null
  const routeCount = state.flow.nodes.reduce(
    (total, node) => total + node.branches.length,
    0
  )
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
          <Edges
            nodes={state.flow.nodes}
            dragOverrides={dragOverrides}
            selectedBranch={state.selectedBranch}
            onSelectBranch={actions.selectBranch}
          />
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

      {/* canvas summary */}
      <div
        aria-label="Canvas summary"
        style={{
          position: 'absolute',
          left: 72,
          top: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 9px',
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: 12,
          color: B.ink2,
          border: `1px solid ${B.line}`,
          zIndex: 5,
          boxShadow: '0 8px 24px rgba(22,21,40,0.06)',
        }}
      >
        <CanvasPill
          icon={<Workflow aria-hidden size={13} strokeWidth={1.8} />}
          label={`${state.flow.nodes.length} blocks`}
        />
        <CanvasPill
          icon={<GitBranch aria-hidden size={13} strokeWidth={1.8} />}
          label={`${routeCount} routes`}
        />
        <span
          style={{
            height: 18,
            width: 1,
            background: B.line,
          }}
        />
        <span
          style={{
            maxWidth: 280,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 11.5,
            color: selectedNode ? B.ink : B.ink3,
            fontWeight: selectedNode ? 600 : 500,
          }}
          title={
            selectedNode ? `Editing ${selectedNode.name}` : 'No step selected'
          }
        >
          {selectedNode ? `Editing ${selectedNode.name}` : 'No step selected'}
        </span>
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

function CanvasPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 24,
        padding: '0 8px',
        borderRadius: 999,
        background: B.lineSoft,
        color: B.ink2,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </span>
  )
}
