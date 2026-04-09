import { describe, it, expect, vi, beforeEach } from 'vitest'
import { closeConversation } from '@/lib/services/conversation'

const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

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
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  it('updates conversation to completed with summary and timestamps', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'conv-1',
        status: 'completed',
        summary: 'Lead summary text',
        ended_at: '2026-04-09T12:00:00Z',
      },
      error: null,
    })

    const result = await closeConversation('conv-1', 'Lead summary text')

    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        summary: 'Lead summary text',
      })
    )
    // Verify ended_at and updated_at are set
    const updateArg = mockUpdate.mock.calls[0]?.[0]
    expect(updateArg).toHaveProperty('ended_at')
    expect(updateArg).toHaveProperty('updated_at')
    expect(mockEq).toHaveBeenCalledWith('id', 'conv-1')
  })

  it('sets updated_at to current timestamp', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'conv-1', status: 'completed' },
      error: null,
    })

    const before = new Date().toISOString()
    await closeConversation('conv-1', 'Summary')
    const after = new Date().toISOString()

    const updateArg = mockUpdate.mock.calls[0]?.[0]
    expect(updateArg.updated_at >= before).toBe(true)
    expect(updateArg.updated_at <= after).toBe(true)
  })

  it('returns error on database failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    })

    const result = await closeConversation('conv-1', 'Summary')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Update failed')
    }
  })

  it('handles close without summary', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'conv-1', status: 'completed' },
      error: null,
    })

    const result = await closeConversation('conv-1')

    expect(result.success).toBe(true)
    const updateArg = mockUpdate.mock.calls[0]?.[0]
    expect(updateArg).not.toHaveProperty('summary')
    expect(updateArg).toHaveProperty('status', 'completed')
  })

  it('handles already-completed conversation gracefully', async () => {
    // Supabase will just update again — idempotent
    mockSingle.mockResolvedValueOnce({
      data: { id: 'conv-1', status: 'completed', summary: 'Old summary' },
      error: null,
    })

    const result = await closeConversation('conv-1', 'New summary')

    expect(result.success).toBe(true)
  })
})
