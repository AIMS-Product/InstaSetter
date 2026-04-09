import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLead } from '@/lib/services/lead'
import type { LeadSummary } from '@/types/lead'

// Mock the service role client
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockInsertSingle = vi.fn()

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}))

const validSummary: LeadSummary = {
  instagram_handle: 'testuser',
  qualification_status: 'warm',
  call_booked: true,
  name: 'Test User',
  email: 'test@example.com',
  machine_count: 8,
  location_type: 'mobile',
  revenue_range: '100k-500k',
  key_notes: 'Interested in premium plan',
}

describe('createLead', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default chain: insert().select().single()
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle })
  })

  it('creates lead with correct qualification from determineQualification', async () => {
    const leadRow = {
      id: 'lead-1',
      contact_id: 'contact-1',
      conversation_id: 'conv-1',
      qualification_status: 'hot',
      call_booked: true,
    }

    mockInsertSingle.mockResolvedValue({ data: leadRow, error: null })

    const result = await createLead('contact-1', 'conv-1', validSummary)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(leadRow)
    }

    // callBooked=true means determineQualification returns 'hot'
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'contact-1',
        conversation_id: 'conv-1',
        qualification_status: 'hot',
        call_booked: true,
        instagram_handle: 'testuser',
      })
    )
  })

  it('maps all summary fields to the lead insert', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'lead-2' },
      error: null,
    })

    await createLead('c1', 'cv1', validSummary)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test User',
        email: 'test@example.com',
        machine_count: 8,
        location_type: 'mobile',
        revenue_range: '100k-500k',
        key_notes: 'Interested in premium plan',
      })
    )
  })

  it('handles minimal summary with only required fields', async () => {
    const minimalSummary: LeadSummary = {
      instagram_handle: 'minuser',
      qualification_status: 'cold',
      call_booked: false,
    }

    mockInsertSingle.mockResolvedValue({
      data: { id: 'lead-3', qualification_status: 'cold' },
      error: null,
    })

    const result = await createLead('c1', 'cv1', minimalSummary)

    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        instagram_handle: 'minuser',
        qualification_status: 'cold',
        call_booked: false,
      })
    )
  })

  it('returns error when validation fails', async () => {
    const invalidSummary = {
      machine_count: 'bad',
    } as unknown as LeadSummary

    const result = await createLead('c1', 'cv1', invalidSummary)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns error on database insert failure', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    })

    const result = await createLead('c1', 'cv1', validSummary)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Insert failed')
    }
  })

  it('stores the raw summary as summary_json', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'lead-4' },
      error: null,
    })

    await createLead('c1', 'cv1', validSummary)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary_json: validSummary,
      })
    )
  })
})
