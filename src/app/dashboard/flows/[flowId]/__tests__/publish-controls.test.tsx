import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../actions', () => ({
  listFlowVersionsAction: vi.fn().mockResolvedValue({ versions: [] }),
  publishFlowAction: vi.fn(),
  rollbackFlowAction: vi.fn(),
  fetchFlowRuntimeAction: vi.fn().mockResolvedValue(null),
  setFlowRuntimeAction: vi.fn().mockResolvedValue(null),
}))

import PublishControls from '../publish-controls'
import { FlowStoreProvider } from '../store'
import {
  listFlowVersionsAction,
  publishFlowAction,
  rollbackFlowAction,
} from '../actions'

const BRAND = 'VendingPreneurs'
const FLOW_ID = 'ig-organic-dm'

function renderWithStore(props: { brand?: string; flowId?: string } = {}) {
  const brand = props.brand ?? BRAND
  const flowId = props.flowId ?? FLOW_ID
  return render(
    <FlowStoreProvider flowId={flowId} brand={brand}>
      <PublishControls brand={brand} flowId={flowId} />
    </FlowStoreProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listFlowVersionsAction).mockResolvedValue({ versions: [] })
})

afterEach(() => {
  cleanup()
})

describe('PublishControls', () => {
  it('renders Publish and History buttons', () => {
    renderWithStore()

    expect(
      screen.getByRole('button', { name: /publish flow draft/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /open version history/i })
    ).toBeInTheDocument()
  })

  it('opens the publish confirm dialog when Publish is clicked', async () => {
    const user = userEvent.setup()
    renderWithStore()

    await user.click(
      screen.getByRole('button', { name: /publish flow draft/i })
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/affect new conversations/i)).toBeInTheDocument()
  })

  it('publishes via Server Action and closes the dialog on success', async () => {
    vi.mocked(publishFlowAction).mockResolvedValue({
      success: true,
      data: { versionId: 'ver-1', versionNumber: 1, checksum: 'abc' },
    })
    vi.mocked(listFlowVersionsAction).mockResolvedValue({
      versions: [
        {
          versionId: 'ver-1',
          versionNumber: 1,
          publishedAt: new Date().toISOString(),
          publishedBy: 'sofia@example.com',
          note: 'first cutover',
          source: 'editor',
          isActive: true,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithStore()

    await user.click(
      screen.getByRole('button', { name: /publish flow draft/i })
    )
    const note = await screen.findByLabelText(/notes/i)
    await user.type(note, 'first cutover')
    await user.click(screen.getByRole('button', { name: /^publish$/i }))

    await waitFor(() => {
      expect(publishFlowAction).toHaveBeenCalledWith({
        brand: BRAND,
        flowId: FLOW_ID,
        note: 'first cutover',
      })
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('surfaces an error when publish fails', async () => {
    vi.mocked(publishFlowAction).mockResolvedValue({
      success: false,
      error: 'No draft to publish',
    })

    const user = userEvent.setup()
    renderWithStore()

    await user.click(
      screen.getByRole('button', { name: /publish flow draft/i })
    )
    await user.click(await screen.findByRole('button', { name: /^publish$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no draft to publish/i
    )
    // Dialog stays open so the operator can retry
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens the history dialog and lists versions newest first', async () => {
    vi.mocked(listFlowVersionsAction).mockResolvedValue({
      versions: [
        {
          versionId: 'ver-2',
          versionNumber: 2,
          publishedAt: new Date('2026-04-29T10:00:00Z').toISOString(),
          publishedBy: 'sofia@example.com',
          note: 'second',
          source: 'editor',
          isActive: true,
        },
        {
          versionId: 'ver-1',
          versionNumber: 1,
          publishedAt: new Date('2026-04-28T10:00:00Z').toISOString(),
          publishedBy: 'sofia@example.com',
          note: 'first',
          source: 'editor',
          isActive: false,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithStore()

    await user.click(
      screen.getByRole('button', { name: /open version history/i })
    )
    const rows = await screen.findAllByTestId('version-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('v2')
    expect(rows[0]).toHaveTextContent('Active')
    expect(rows[1]).toHaveTextContent('v1')
  })

  it('rolls back via Server Action on click', async () => {
    vi.mocked(listFlowVersionsAction).mockResolvedValue({
      versions: [
        {
          versionId: 'ver-2',
          versionNumber: 2,
          publishedAt: new Date('2026-04-29T10:00:00Z').toISOString(),
          publishedBy: 'sofia@example.com',
          note: 'second',
          source: 'editor',
          isActive: true,
        },
        {
          versionId: 'ver-1',
          versionNumber: 1,
          publishedAt: new Date('2026-04-28T10:00:00Z').toISOString(),
          publishedBy: 'sofia@example.com',
          note: 'first',
          source: 'editor',
          isActive: false,
        },
      ],
    })
    vi.mocked(rollbackFlowAction).mockResolvedValue({
      success: true,
      data: { versionId: 'ver-3', versionNumber: 3, checksum: 'def' },
    })

    const user = userEvent.setup()
    renderWithStore()

    await user.click(
      screen.getByRole('button', { name: /open version history/i })
    )
    const rollbackBtn = await screen.findByRole('button', {
      name: /rollback to v1/i,
    })
    await user.click(rollbackBtn)

    await waitFor(() => {
      expect(rollbackFlowAction).toHaveBeenCalledWith({
        brand: BRAND,
        flowId: FLOW_ID,
        versionId: 'ver-1',
      })
    })
  })
})
