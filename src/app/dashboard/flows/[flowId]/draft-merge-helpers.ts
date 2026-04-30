// Helpers for the P4.04 split-state autosave flow.
//
// The autosave loop in `flow-draft-sync.tsx` needs two operations beyond
// what `diffFlowDraft` provides:
//
//   1. Build a low-impact-only snapshot — strip held high-impact fields
//      back to their last-saved values so we can keep the routine
//      autosave running for low-impact edits while the warning modal
//      gates the high-impact ones.
//   2. Roll the held high-impact fields back to baseline on Discard.
//
// Both operations rely on the lock catalog's path-resolver to find the
// canonical "surface prefix" for a changed leaf path (e.g.
// `flow.nodes.email.blockConfig.postEmailBehavior.confirmationMessage`
// resolves to the surface `flow.nodes.email.blockConfig.postEmailBehavior`,
// so the entire post-email-behavior object is replaced as one unit).

import { resolveLockIdForFieldPath } from '@/lib/dashboard/flow-builder-locks'
import type { PersistedFlowDraft } from './draft-persistence'

/**
 * Replace the values at every high-impact path in `current` with the
 * values from `baseline`. Used both for the low-impact save (to persist
 * non-held fields without bleeding the high-impact change into the
 * snapshot) and for the discard path (to roll the held high-impact values
 * back to last-saved).
 *
 * Path-conscious: walks dot-notation paths, with the special node-id
 * indexing convention `flow.nodes.<id>` mirroring `diffFlowDraft`.
 */
export function mergeDraftHighImpactFromBaseline(
  current: PersistedFlowDraft,
  baseline: PersistedFlowDraft,
  highImpactPaths: Set<string>
): PersistedFlowDraft {
  if (highImpactPaths.size === 0) return current
  const nextRaw = JSON.parse(JSON.stringify(current)) as Record<string, unknown>
  const baseRaw = baseline as unknown as Record<string, unknown>
  const surfacePrefixes = new Set<string>()
  for (const path of highImpactPaths) {
    const id = resolveLockIdForFieldPath(path)
    if (!id) continue
    const prefix = findSurfacePrefix(path)
    surfacePrefixes.add(prefix)
  }
  for (const prefix of surfacePrefixes) {
    copyPathFromInto(baseRaw, nextRaw, prefix)
  }
  return nextRaw as unknown as PersistedFlowDraft
}

function findSurfacePrefix(path: string): string {
  const parts = path.split('.')
  for (let i = parts.length; i > 0; i -= 1) {
    const candidate = parts.slice(0, i).join('.')
    if (resolveLockIdForFieldPath(candidate)) return candidate
  }
  return path
}

function copyPathFromInto(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  path: string
): void {
  if (path.startsWith('flow.nodes.')) {
    const remainder = path.slice('flow.nodes.'.length)
    const dotIdx = remainder.indexOf('.')
    const nodeId = dotIdx === -1 ? remainder : remainder.slice(0, dotIdx)
    const innerPath = dotIdx === -1 ? '' : remainder.slice(dotIdx + 1)
    const sourceFlow = source.flow as
      | { nodes?: Array<Record<string, unknown>> }
      | undefined
    const targetFlow = target.flow as
      | { nodes?: Array<Record<string, unknown>> }
      | undefined
    const sourceNode = sourceFlow?.nodes?.find(
      (n) => (n as { id?: unknown }).id === nodeId
    )
    const targetNode = targetFlow?.nodes?.find(
      (n) => (n as { id?: unknown }).id === nodeId
    )
    if (!sourceNode || !targetNode) return
    if (!innerPath) {
      Object.assign(targetNode, JSON.parse(JSON.stringify(sourceNode)))
      return
    }
    copyDottedPath(
      sourceNode as Record<string, unknown>,
      targetNode as Record<string, unknown>,
      innerPath
    )
    return
  }
  copyDottedPath(source, target, path)
}

function copyDottedPath(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  path: string
): void {
  const parts = path.split('.')
  let s: unknown = source
  let t: unknown = target
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]!
    if (s && typeof s === 'object' && key in (s as Record<string, unknown>)) {
      s = (s as Record<string, unknown>)[key]
    } else {
      return
    }
    if (t && typeof t === 'object' && key in (t as Record<string, unknown>)) {
      t = (t as Record<string, unknown>)[key]
    } else {
      return
    }
  }
  const leaf = parts[parts.length - 1]!
  if (
    s &&
    typeof s === 'object' &&
    t &&
    typeof t === 'object' &&
    leaf in (s as Record<string, unknown>)
  ) {
    const sourceValue = (s as Record<string, unknown>)[leaf]
    ;(t as Record<string, unknown>)[leaf] =
      sourceValue === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(sourceValue)) as unknown)
  } else if (
    t &&
    typeof t === 'object' &&
    leaf in (t as Record<string, unknown>)
  ) {
    delete (t as Record<string, unknown>)[leaf]
  }
}

/**
 * Friendlier preview for the modal's bullet list. Keeps the dotted path
 * recognisable to power users while replacing the engineering segments
 * with operator copy.
 */
export function summariseFieldPath(path: string): string {
  if (path.startsWith('flow.nodes.email.blockConfig.postEmailBehavior')) {
    return 'After-email confirmation copy'
  }
  if (path.startsWith('flow.nodes.email.blockConfig.confirmationScript')) {
    return 'After-email confirmation copy'
  }
  if (path.startsWith('flow.nodes.email.blockConfig.hesitationScript')) {
    return 'After-email hesitation reply'
  }
  if (path.startsWith('flow.nodes.booking.blockConfig.linkPattern')) {
    return 'Booking link pattern'
  }
  if (path.startsWith('flow.nodes.booking.blockConfig.mirrorTemplate')) {
    return 'Booking link copy'
  }
  if (path.startsWith('bot.persona')) return 'Bot persona body'
  if (path.startsWith('flow.nodes.qualifier.blockConfig.qualifiers')) {
    return 'Qualifier order'
  }
  return path
}
