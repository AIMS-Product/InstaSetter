import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { useEffect, useRef, type ReactNode } from 'react'

import { FlowStoreProvider, useFlowDispatch } from '../../store'
import type { FlowNode, Palette } from '../../types'
import PageVariables from '../page-variables'

const PALETTE: Palette = {
  bg: '#fff',
  panel: '#fff',
  ink: '#111',
  ink2: '#444',
  ink3: '#888',
  line: '#eee',
  lineSoft: '#f5f5f5',
  accent: '#4f46ba',
  accentSoft: '#eef0ff',
  accentInk: '#352bb8',
  sel: '#dde1ff',
  serif: false,
}

afterEach(() => {
  cleanup()
})

// Drive the reducer to inject a duplicated booking node — this mirrors what
// the canvas does when a marketer drops a second booking block (see
// canvas.tsx, where ids like `booking_2` are produced for duplicates).
function SeedDuplicatedBookingNode({ children }: { children: ReactNode }) {
  const dispatch = useFlowDispatch()
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const node: FlowNode = {
      // Suffixed id like the canvas produces for duplicates. Cast through
      // unknown because BlockType is the catalog union — runtime ids for
      // duplicates carry a numeric suffix.
      id: 'booking_2' as unknown as FlowNode['id'],
      type: 'booking',
      name: 'Booking copy',
      goal: 'duplicate',
      guidance: '',
      examples: [],
      captures: [{ label: 'Email', variable: 'contact.duplicate_email' }],
      branches: [],
      pos: { x: 0, y: 0 },
    }
    dispatch({ type: 'add_node', node })
  }, [dispatch])
  return <>{children}</>
}

function Harness() {
  return (
    <FlowStoreProvider flowId="lg-organic-dm" brand="VendingPreneurs">
      <SeedDuplicatedBookingNode>
        <PageVariables p={PALETTE} />
      </SeedDuplicatedBookingNode>
    </FlowStoreProvider>
  )
}

describe('PageVariables — duplicated block ids', () => {
  it('does not crash when a captured variable comes from a suffixed node id', () => {
    expect(() => render(<Harness />)).not.toThrow()
    // The duplicated booking node owns contact.duplicate_email — confirm the
    // row renders without throwing on the catalog lookup.
    expect(screen.getByText('contact.duplicate_email')).toBeInTheDocument()
  })

  it('renders the canonical block label for a suffixed node id', () => {
    render(<Harness />)
    // The duplicated booking_2 node resolves through its canonical block
    // type, so the operator-facing label still reads "Send the booking link".
    const labels = screen.getAllByText(/Send the booking link/i)
    expect(labels.length).toBeGreaterThan(0)
  })
})
