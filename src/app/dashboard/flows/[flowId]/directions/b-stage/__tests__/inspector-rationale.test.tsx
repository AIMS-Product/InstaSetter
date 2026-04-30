import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactNode } from 'react'

import { FlowStoreProvider, useFlowActions } from '../../../store'
import {
  getRationaleEventCounts,
  resetRationaleEventCounts,
} from '@/lib/services/rationale-events'
import BInspector from '../inspector'

// jsdom does not implement scrollTo; the inspector mounts a routing tab
// that may scroll into view when a branch is selected from the canvas.
beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = () => {}
  }
})

beforeEach(() => {
  resetRationaleEventCounts()
})

afterEach(() => {
  cleanup()
  // Each test stubs its own variant explicitly before render — clearing here
  // leaves the next test free to opt into either flag value.
  vi.unstubAllEnvs()
})

function SelectOpening({ children }: { children: ReactNode }) {
  const actions = useFlowActions()
  useEffect(() => {
    actions.select('opening')
  }, [actions])
  return <>{children}</>
}

function Harness() {
  return (
    <FlowStoreProvider flowId="lg-organic-dm" brand="VendingPreneurs">
      <SelectOpening>
        <BInspector onClose={() => {}} />
      </SelectOpening>
    </FlowStoreProvider>
  )
}

describe('Inspector — rationale variant rendering', () => {
  it('renders the rationale section expanded under the always_on variant', () => {
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'always_on')

    render(<Harness />)

    // Two buttons share the accessible name "Why this step exists" when the
    // rationale is open: the outer CollapsibleSection toggle and the inner
    // RationaleBanner pill. That's the signal that the banner mounted.
    const buttons = screen.getAllByRole('button', {
      name: /why this step exists/i,
    })
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    // The wrapper is the first match (rendered above the banner). It must
    // be expanded so the operator sees the supporting insights immediately.
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true')
  })

  it('omits the rationale wrapper entirely under the hidden variant', () => {
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'hidden')

    render(<Harness />)

    // Neither the CollapsibleSection heading nor the banner pill should be
    // in the DOM. Asserting the heading text is absent is the simplest way
    // to confirm both pieces are skipped — there is no stray empty wrapper.
    expect(screen.queryByText(/why this step exists/i)).toBeNull()
  })

  it('records exactly one variant_loaded event per mount under always_on', () => {
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'always_on')

    render(<Harness />)

    const counts = getRationaleEventCounts()
    expect(counts['rationale.variant_loaded']).toBe(1)
  })

  it('records exactly one variant_loaded event per mount under hidden', () => {
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'hidden')

    render(<Harness />)

    const counts = getRationaleEventCounts()
    expect(counts['rationale.variant_loaded']).toBe(1)
  })

  it('emits prompt_reader_opened when the operator clicks "View prompt"', async () => {
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'hidden')

    render(<Harness />)

    const button = screen.getByRole('button', { name: /view prompt/i })
    await userEvent.click(button)

    const counts = getRationaleEventCounts()
    expect(counts['rationale.prompt_reader_opened']).toBeGreaterThanOrEqual(1)
  })

  it('emits expanded then collapsed under always_on as the operator toggles', async () => {
    vi.stubEnv('NEXT_PUBLIC_FLOW_RATIONALE', 'always_on')

    render(<Harness />)

    // The wrapper toggle is the first button with the matching name (the
    // banner pill is the second; both render under always_on). Toggling the
    // wrapper is what the instrumentation listens to — banner pill clicks
    // are local UI state, not engagement.
    const [wrapper] = screen.getAllByRole('button', {
      name: /why this step exists/i,
    })
    if (!wrapper) throw new Error('Expected rationale wrapper button to mount')
    // Default open; first click collapses (records collapsed).
    await userEvent.click(wrapper)
    let counts = getRationaleEventCounts()
    expect(counts['rationale.collapsed']).toBe(1)
    expect(counts['rationale.expanded']).toBe(0)

    // Second click re-expands (records expanded).
    await userEvent.click(wrapper)
    counts = getRationaleEventCounts()
    expect(counts['rationale.collapsed']).toBe(1)
    expect(counts['rationale.expanded']).toBe(1)
  })
})
