'use client'

// P4.05 — In-memory instrumentation for the rationale-panel decision.
//
// Why this file is intentionally tiny
// -----------------------------------
// The decision spec (`plans/dm-setter-roadmap/p4-flow-builder-ux/05-why-this-exists.md`)
// is a one-week experiment driven by Sofia's real usage. We do NOT need
// analytics-grade event tracking for that — we need a live counter the QA
// surface can read so we can confirm the instrumentation is working before
// the human signal (Slack feedback, Asana note) closes the loop.
//
// What MUST NOT happen
// --------------------
// - No DB writes. No PostHog. No Sentry breadcrumbs. No fetch-out-of-band.
//   Counters live in module scope; they reset on hard refresh and that's
//   intentional.
// - No expansion into a "telemetry" library. The closing PR (per spec) deletes
//   this file in a single-file diff. Keep it scoped.

import { useEffect, useRef } from 'react'

import type { FlowRationaleVariant } from '@/lib/config'

export type RationaleVariant = FlowRationaleVariant

export type RationaleEvent =
  | {
      type: 'rationale.variant_loaded'
      variant: RationaleVariant
      blockType: string
    }
  | { type: 'rationale.expanded'; blockType: string }
  | { type: 'rationale.collapsed'; blockType: string }
  | { type: 'rationale.prompt_reader_opened'; blockType: string }

type RationaleEventType = RationaleEvent['type']

type CountMap = Record<RationaleEventType, number>

function emptyCounts(): CountMap {
  return {
    'rationale.variant_loaded': 0,
    'rationale.expanded': 0,
    'rationale.collapsed': 0,
    'rationale.prompt_reader_opened': 0,
  }
}

let counts: CountMap = emptyCounts()

/**
 * Record a rationale-engagement event. In-memory only; never sent over the
 * wire. The dev `?debug=rationale` overlay reads these counters via
 * `getRationaleEventCounts()`.
 */
export function recordRationaleEvent(event: RationaleEvent): void {
  counts[event.type] += 1
  if (process.env.NODE_ENV === 'development') {
    // Surface event flow during local QA without spamming prod logs.
    // `console.debug` is gated by the browser's verbose-log toggle, so this
    // is opt-in for the operator that needs it.
    console.debug('[rationale-events]', event)
  }
}

/**
 * Snapshot of the current event counters. Returned object is a copy so
 * callers can't mutate module state; the live counter increments via
 * `recordRationaleEvent`.
 */
export function getRationaleEventCounts(): CountMap {
  return { ...counts }
}

/**
 * Test-only helper. Production callers must not reset counters mid-session —
 * that would distort Sofia's signal. Used by Vitest's `beforeEach` to keep
 * tests isolated.
 */
export function resetRationaleEventCounts(): void {
  counts = emptyCounts()
}

interface UseRationaleInstrumentationArgs {
  variant: RationaleVariant
  blockType: string
}

/**
 * Records a `rationale.variant_loaded` event once per real mount cycle.
 *
 * The dedup key is the `{variant, blockType}` pair. React Strict Mode
 * intentionally double-mounts components in dev — without dedup, every
 * inspector mount would record two events. The ref tracks the last-fired
 * key so an effect re-run with identical args is a no-op.
 *
 * Switching blocks (e.g. operator clicks a different node) flips
 * `blockType` and emits a fresh event — that's the signal we want to see.
 */
export function useRationaleInstrumentation({
  variant,
  blockType,
}: UseRationaleInstrumentationArgs): void {
  const lastKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${variant}::${blockType}`
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    recordRationaleEvent({
      type: 'rationale.variant_loaded',
      variant,
      blockType,
    })
  }, [variant, blockType])
}
