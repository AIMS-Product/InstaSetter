import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findOrCreateActiveConversation } from '@/lib/services/conversation'
import { PROMPT_VERSION } from '@/types/enums'

// Mock the service role client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  }),
}))

describe('findOrCreateActiveConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default chain: select().eq().eq().limit().single()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, limit: mockLimit })
    mockLimit.mockReturnValue({ single: mockSingle })
  })

  it('returns existing active conversation when one exists', async () => {
    const existingConvo = {
      id: 'conv-123',
      contact_id: 'contact-456',
      status: 'active',
      prompt_version: PROMPT_VERSION,
      started_at: '2026-04-09T10:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: existingConvo, error: null })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(existingConvo)
    }
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates a new conversation when no active one exists', async () => {
    // No active conversation found — PGRST116 means no rows
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const newConvo = {
      id: 'conv-new',
      contact_id: 'contact-456',
      status: 'active',
      prompt_version: PROMPT_VERSION,
      started_at: expect.any(String),
    }

    const mockInsertSelect = vi.fn()
    const mockInsertSingle = vi.fn()
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle })
    mockInsertSingle.mockResolvedValue({ data: newConvo, error: null })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(newConvo)
    }
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'contact-456',
        status: 'active',
        prompt_version: PROMPT_VERSION,
      })
    )
  })

  it('uses the provided prompt version', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const mockInsertSelect = vi.fn()
    const mockInsertSingle = vi.fn()
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle })
    mockInsertSingle.mockResolvedValue({
      data: { id: 'conv-new', prompt_version: 'custom-v2' },
      error: null,
    })

    await findOrCreateActiveConversation('contact-456', 'custom-v2')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt_version: 'custom-v2',
      })
    )
  })

  it('returns error when select query fails with non-PGRST116 error', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('relation does not exist')
    }
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns error when insert fails', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const mockInsertSelect = vi.fn()
    const mockInsertSingle = vi.fn()
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle })
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '23503', message: 'foreign key violation' },
    })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('foreign key violation')
    }
  })
})
