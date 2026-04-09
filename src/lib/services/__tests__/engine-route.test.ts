import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/lead', () => ({
  createLead: vi.fn(),
  determineQualification: vi.fn(),
}))
vi.mock('@/lib/services/conversation', () => ({
  closeConversation: vi.fn(),
  findOrCreateActiveConversation: vi.fn(),
  loadPriorSummaries: vi.fn(),
}))
vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getServerConfig: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    ANTHROPIC_API_KEY: 'sk-test',
    BRAND_NAME: 'TestBrand',
  }),
}))

import { routeLeadEvents } from '@/lib/services/engine'
import { createLead } from '@/lib/services/lead'
import { closeConversation } from '@/lib/services/conversation'
import { createMockClient } from '@/test/helpers'

describe('routeLeadEvents', () => {
  let client: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createMockClient()
  })

  it('returns immediately for empty tool calls', async () => {
    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [])
    expect(result).toEqual({ success: true, eventsProcessed: 0 })
  })

  it('handles capture_email — updates contact email', async () => {
    // contact update chain: from().update().eq()
    client.eq.mockResolvedValueOnce({ error: null })
    // integration_events insert chain: from().insert().select().single()
    client.single.mockResolvedValueOnce({ data: {}, error: null })

    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      {
        name: 'capture_email',
        toolUseId: 'tu1',
        input: { email: 'a@b.com' },
      },
    ])

    expect(result.eventsProcessed).toBe(1)
    expect(client.update).toHaveBeenCalled()
  })

  it('handles generate_summary — creates lead and closes conversation', async () => {
    vi.mocked(createLead).mockResolvedValue({
      success: true,
      data: { id: 'lead-1' } as never,
    })
    vi.mocked(closeConversation).mockResolvedValue({
      success: true,
      data: {} as never,
    })
    // integration_events insert
    client.single.mockResolvedValue({ data: {}, error: null })

    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      {
        name: 'generate_summary',
        toolUseId: 'tu2',
        input: {
          instagram_handle: 'x',
          qualification_status: 'hot',
          call_booked: true,
        },
      },
    ])

    expect(createLead).toHaveBeenCalled()
    expect(closeConversation).toHaveBeenCalledWith('cv1', expect.any(String))
    expect(result.eventsProcessed).toBe(1)
  })

  it('handles generate_summary with invalid data — logs error, no lead created', async () => {
    // integration_events insert for error logging
    client.single.mockResolvedValueOnce({ data: {}, error: null })

    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      {
        name: 'generate_summary',
        toolUseId: 'tu2',
        input: { bad: 'data' },
      },
    ])

    expect(createLead).not.toHaveBeenCalled()
    expect(result.eventsProcessed).toBe(1)
  })

  it('handles qualify_lead as no-op audit log', async () => {
    // integration_events insert
    client.single.mockResolvedValueOnce({ data: {}, error: null })

    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      {
        name: 'qualify_lead',
        toolUseId: 'tu3',
        input: { machine_count: 5 },
      },
    ])

    expect(result.eventsProcessed).toBe(1)
    expect(createLead).not.toHaveBeenCalled()
  })

  it('handles book_call — logs to integration_events', async () => {
    client.single.mockResolvedValueOnce({ data: {}, error: null })

    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      {
        name: 'book_call',
        toolUseId: 'tu4',
        input: { calendly_slot: '2026-04-15T14:00:00Z' },
      },
    ])

    expect(result.eventsProcessed).toBe(1)
  })

  it('ignores unknown tool names', async () => {
    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      { name: 'unknown_tool', toolUseId: 'tu5', input: {} },
    ])

    expect(result.eventsProcessed).toBe(0)
  })

  it('continues processing after individual tool failure', async () => {
    // capture_email succeeds
    client.eq.mockResolvedValueOnce({ error: null })
    client.single.mockResolvedValueOnce({ data: {}, error: null })
    // generate_summary fails validation (bad data, no createLead call)
    client.single.mockResolvedValueOnce({ data: {}, error: null })
    // book_call succeeds
    client.single.mockResolvedValueOnce({ data: {}, error: null })

    const result = await routeLeadEvents(client as never, 'c1', 'cv1', [
      {
        name: 'capture_email',
        toolUseId: 'tu1',
        input: { email: 'a@b.com' },
      },
      { name: 'generate_summary', toolUseId: 'tu2', input: { bad: 'data' } },
      { name: 'book_call', toolUseId: 'tu3', input: {} },
    ])

    expect(result.eventsProcessed).toBe(3)
  })
})
