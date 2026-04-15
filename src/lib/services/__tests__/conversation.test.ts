import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  findOrCreateActiveConversation,
  loadPriorSummaries,
} from '@/lib/services/conversation'
import { PROMPT_VERSION } from '@/types/enums'

// Mock the service role client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockNot = vi.fn()
const mockOrder = vi.fn()

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
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

  it('returns existing active conversation when one exists and is fresh', async () => {
    const existingConvo = {
      id: 'conv-123',
      contact_id: 'contact-456',
      status: 'active',
      prompt_version: PROMPT_VERSION,
      started_at: '2026-04-09T10:00:00Z',
      updated_at: new Date().toISOString(), // fresh — just updated
    }

    mockSingle.mockResolvedValue({ data: existingConvo, error: null })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(existingConvo)
      expect(result.data.staleConversationId).toBeUndefined()
    }
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('closes stale conversation and creates a new one', async () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    const staleConvo = {
      id: 'conv-stale',
      contact_id: 'contact-456',
      status: 'active',
      prompt_version: PROMPT_VERSION,
      started_at: '2026-04-09T10:00:00Z',
      updated_at: fiveHoursAgo,
    }

    mockSingle.mockResolvedValue({ data: staleConvo, error: null })

    // Mock update chain: update().eq()
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })

    // Mock insert chain: insert().select().single()
    const newConvo = {
      id: 'conv-new',
      contact_id: 'contact-456',
      status: 'active',
      prompt_version: PROMPT_VERSION,
      updated_at: new Date().toISOString(),
    }
    const mockInsertSelect = vi.fn()
    const mockInsertSingle = vi.fn()
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle })
    mockInsertSingle.mockResolvedValue({ data: newConvo, error: null })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('conv-new')
      expect(result.data.staleConversationId).toBe('conv-stale')
    }

    // Verify stale conversation was updated to 'stalled'
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'stalled' })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'conv-stale')

    // Verify new conversation was created
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'contact-456',
        status: 'active',
      })
    )
  })

  it('treats conversation updated 3 hours ago as fresh (under threshold)', async () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString()
    const freshConvo = {
      id: 'conv-recent',
      contact_id: 'contact-456',
      status: 'active',
      prompt_version: PROMPT_VERSION,
      started_at: '2026-04-09T10:00:00Z',
      updated_at: threeHoursAgo,
    }

    mockSingle.mockResolvedValue({ data: freshConvo, error: null })

    const result = await findOrCreateActiveConversation('contact-456')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('conv-recent')
      expect(result.data.staleConversationId).toBeUndefined()
    }
    expect(mockUpdate).not.toHaveBeenCalled()
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

describe('loadPriorSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Chain: select('summary').eq().eq().not().order().limit()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot })
    mockNot.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ limit: mockLimit })
  })

  it('returns summaries from completed conversations', async () => {
    mockLimit.mockResolvedValueOnce({
      data: [{ summary: 'Summary A' }, { summary: 'Summary B' }],
      error: null,
    })

    const result = await loadPriorSummaries('contact-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(['Summary A', 'Summary B'])
    }
  })

  it('returns empty array for first-time contacts', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await loadPriorSummaries('contact-new')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual([])
    }
  })

  it('defaults to limit of 3', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await loadPriorSummaries('contact-1')

    expect(mockLimit).toHaveBeenCalledWith(3)
  })

  it('respects custom limit', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await loadPriorSummaries('contact-1', 5)

    expect(mockLimit).toHaveBeenCalledWith(5)
  })

  it('returns error on database failure', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    })

    const result = await loadPriorSummaries('contact-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB error')
    }
  })
})
