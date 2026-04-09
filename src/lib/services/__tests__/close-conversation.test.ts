import { describe, it, expect, vi, beforeEach } from 'vitest'
import { closeConversation } from '@/lib/services/conversation'

// Mock the service role client
const mockUpdate = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdateSelect = vi.fn()
const mockUpdateSingle = vi.fn()

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      update: mockUpdate,
    }),
  }),
}))

describe('closeConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default chain: update().eq().select().single()
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockUpdateEq.mockReturnValue({ select: mockUpdateSelect })
    mockUpdateSelect.mockReturnValue({ single: mockUpdateSingle })
  })

  it('sets status to completed, stores summary, and sets ended_at', async () => {
    const closedConvo = {
      id: 'conv-123',
      status: 'completed',
      summary: 'Customer was interested in vending machines.',
      ended_at: '2026-04-09T12:00:00Z',
    }

    mockUpdateSingle.mockResolvedValue({ data: closedConvo, error: null })

    const result = await closeConversation(
      'conv-123',
      'Customer was interested in vending machines.'
    )

    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        summary: 'Customer was interested in vending machines.',
      })
    )
    // ended_at should be an ISO string
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.ended_at).toBeDefined()
    expect(typeof updateArg.ended_at).toBe('string')
  })

  it('is idempotent — succeeds when conversation is already completed', async () => {
    const alreadyClosed = {
      id: 'conv-123',
      status: 'completed',
      summary: 'Already closed.',
      ended_at: '2026-04-09T11:00:00Z',
    }

    mockUpdateSingle.mockResolvedValue({ data: alreadyClosed, error: null })

    const result = await closeConversation('conv-123', 'Already closed.')

    expect(result.success).toBe(true)
  })

  it('returns error when update fails', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    })

    const result = await closeConversation('conv-123', 'summary')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('relation does not exist')
    }
  })

  it('closes without summary when none provided', async () => {
    const closedConvo = {
      id: 'conv-123',
      status: 'completed',
      summary: null,
      ended_at: '2026-04-09T12:00:00Z',
    }

    mockUpdateSingle.mockResolvedValue({ data: closedConvo, error: null })

    const result = await closeConversation('conv-123')

    expect(result.success).toBe(true)
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.summary).toBeUndefined()
  })

  it('targets the correct conversation by ID', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'conv-999' },
      error: null,
    })

    await closeConversation('conv-999', 'done')

    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'conv-999')
  })
})
