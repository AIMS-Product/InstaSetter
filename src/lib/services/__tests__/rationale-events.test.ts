import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import {
  getRationaleEventCounts,
  recordRationaleEvent,
  resetRationaleEventCounts,
  useRationaleInstrumentation,
} from '../rationale-events'

beforeEach(() => {
  resetRationaleEventCounts()
})

describe('recordRationaleEvent', () => {
  it('initialises every counter at zero before any record call', () => {
    expect(getRationaleEventCounts()).toEqual({
      'rationale.variant_loaded': 0,
      'rationale.expanded': 0,
      'rationale.collapsed': 0,
      'rationale.prompt_reader_opened': 0,
    })
  })

  it('increments variant_loaded counter on a load event', () => {
    recordRationaleEvent({
      type: 'rationale.variant_loaded',
      variant: 'always_on',
      blockType: 'opening',
    })
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(1)
  })

  it('increments the right counter for each event type independently', () => {
    recordRationaleEvent({ type: 'rationale.expanded', blockType: 'opening' })
    recordRationaleEvent({ type: 'rationale.expanded', blockType: 'qualifier' })
    recordRationaleEvent({ type: 'rationale.collapsed', blockType: 'opening' })
    recordRationaleEvent({
      type: 'rationale.prompt_reader_opened',
      blockType: 'opening',
    })

    const counts = getRationaleEventCounts()
    expect(counts['rationale.expanded']).toBe(2)
    expect(counts['rationale.collapsed']).toBe(1)
    expect(counts['rationale.prompt_reader_opened']).toBe(1)
    expect(counts['rationale.variant_loaded']).toBe(0)
  })

  it('reset clears every counter back to zero', () => {
    recordRationaleEvent({
      type: 'rationale.variant_loaded',
      variant: 'hidden',
      blockType: 'opening',
    })
    recordRationaleEvent({ type: 'rationale.expanded', blockType: 'qualifier' })
    resetRationaleEventCounts()
    expect(getRationaleEventCounts()).toEqual({
      'rationale.variant_loaded': 0,
      'rationale.expanded': 0,
      'rationale.collapsed': 0,
      'rationale.prompt_reader_opened': 0,
    })
  })
})

describe('useRationaleInstrumentation', () => {
  it('records exactly one variant_loaded event per real mount cycle', () => {
    const { unmount } = renderHook(() =>
      useRationaleInstrumentation({
        variant: 'always_on',
        blockType: 'opening',
      })
    )
    // After a single mount, exactly one variant_loaded is recorded. React
    // Strict Mode is the canonical double-render trap; the hook must dedup
    // on identical {variant, blockType} pairs within the same mount cycle.
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(1)
    unmount()
  })

  it('records a fresh event when blockType changes (operator selects a different block)', () => {
    const { rerender } = renderHook(
      ({ blockType }: { blockType: string }) =>
        useRationaleInstrumentation({
          variant: 'always_on',
          blockType,
        }),
      { initialProps: { blockType: 'opening' } }
    )
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(1)

    rerender({ blockType: 'qualifier' })
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(2)
  })

  it('does not double-fire on identical re-renders (e.g. parent re-renders)', () => {
    const { rerender } = renderHook(
      ({ variant }: { variant: 'always_on' | 'hidden' }) =>
        useRationaleInstrumentation({ variant, blockType: 'opening' }),
      { initialProps: { variant: 'always_on' } }
    )
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(1)

    // Re-render with identical props — should not emit another event.
    rerender({ variant: 'always_on' })
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(1)
  })

  it('records a new event when variant changes', () => {
    const { rerender } = renderHook(
      ({ variant }: { variant: 'always_on' | 'hidden' }) =>
        useRationaleInstrumentation({ variant, blockType: 'opening' }),
      { initialProps: { variant: 'always_on' } }
    )
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(1)

    rerender({ variant: 'hidden' })
    expect(getRationaleEventCounts()['rationale.variant_loaded']).toBe(2)
  })
})
