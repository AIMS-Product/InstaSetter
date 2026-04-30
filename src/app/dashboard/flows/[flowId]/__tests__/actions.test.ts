import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the dependent service so the action can be invoked without hitting
// Supabase. The schema test asserts that a valid `closeSyncStatus` value
// flows through Zod and into `listConversations`.
vi.mock('@/lib/services/conversation-viewer', () => ({
  countConversationsStartedSince: vi.fn(),
  getConversation: vi.fn(),
  listConversations: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/services/flow-drafts', () => ({
  loadFlowDraft: vi.fn(),
  saveFlowDraft: vi.fn(),
}))

vi.mock('@/lib/services/flow-runtime', () => ({
  getFlowRuntimeControl: vi.fn(),
  setFlowRuntimePause: vi.fn(),
}))

import { fetchFlowRunsAction } from '../actions'
import { listConversations } from '@/lib/services/conversation-viewer'

describe('fetchFlowRunsAction — closeSyncStatus filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards closeSyncStatus="sent" to listConversations', async () => {
    await fetchFlowRunsAction({ closeSyncStatus: 'sent' })

    expect(listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ closeSyncStatus: 'sent' })
    )
  })

  it.each(['sent', 'failed', 'pending', 'not_synced', 'any'] as const)(
    'accepts closeSyncStatus="%s" and forwards it',
    async (value) => {
      await fetchFlowRunsAction({ closeSyncStatus: value })

      expect(listConversations).toHaveBeenCalledWith(
        expect.objectContaining({ closeSyncStatus: value })
      )
    }
  )

  it('rejects invalid closeSyncStatus values (returns empty list, no service call)', async () => {
    // The strict Zod schema rejects unknown enum values; the action falls
    // through to return an empty list without invoking the service.
    const result = await fetchFlowRunsAction({
      // @ts-expect-error — deliberate invalid value to test runtime guard
      closeSyncStatus: 'totally-invalid',
    })

    expect(result).toEqual([])
    expect(listConversations).not.toHaveBeenCalled()
  })

  it('omitted closeSyncStatus does not appear on the forwarded options', async () => {
    await fetchFlowRunsAction({ limit: 10 })

    expect(listConversations).toHaveBeenCalledTimes(1)
    const call = vi.mocked(listConversations).mock.calls[0]?.[0]
    expect(call).toEqual({ limit: 10 })
  })

  it('rejects unknown keys via strict schema (no service call)', async () => {
    const result = await fetchFlowRunsAction({
      // @ts-expect-error — strict schema must reject unknown keys
      somethingWeird: 'oh no',
    })

    expect(result).toEqual([])
    expect(listConversations).not.toHaveBeenCalled()
  })
})
