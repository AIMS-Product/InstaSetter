import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/conversation', () => ({
  closeConversation: vi.fn(),
  findOrCreateActiveConversation: vi.fn(),
  loadPriorSummaries: vi.fn(),
}))
vi.mock('@/lib/services/lead', () => ({
  createLead: vi.fn(),
}))
vi.mock('@/lib/services/message', () => ({
  buildClaudeMessages: vi.fn(),
  storeMessage: vi.fn(),
}))
vi.mock('@/lib/services/claude', () => ({
  buildClaudeRequest: vi.fn((system: string, messages: unknown[]) => ({
    system,
    messages,
    model: 'test',
    max_tokens: 1024,
    tools: [],
  })),
  parseClaudeResponse: vi.fn(),
}))
vi.mock('@/lib/services/sendpulse', () => ({
  setContactTags: vi.fn().mockResolvedValue({ success: true }),
  removeContactTag: vi.fn(),
  sendInstagramMessage: vi.fn(),
  pauseAutomation: vi.fn(),
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
  getSendPulseConfig: () => ({
    SENDPULSE_API_KEY: 'test',
    SENDPULSE_BOT_ID: 'test',
    SENDPULSE_WEBHOOK_SECRET: 'test',
  }),
}))

import { generateStaleSummary } from '@/lib/services/engine'
import { buildClaudeMessages } from '@/lib/services/message'
import { createLead } from '@/lib/services/lead'
import { closeConversation } from '@/lib/services/conversation'
import { createMockClient, asSupabaseClient } from '@/test/helpers'

describe('generateStaleSummary', () => {
  let client: ReturnType<typeof createMockClient>
  const mockClaude = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    client = createMockClient()
  })

  it('generates summary from conversation transcript and creates lead', async () => {
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [
        { role: 'user', content: 'Hey interested' },
        { role: 'assistant', content: 'What got you interested?' },
      ],
    })

    const summaryJson = {
      instagram_handle: 'testuser',
      qualification_status: 'warm',
      call_booked: false,
      location_type: 'Adelaide',
    }

    mockClaude.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(summaryJson) }],
    })
    vi.mocked(createLead).mockResolvedValue({
      success: true,
      data: { id: 'lead-1' } as never,
    })
    vi.mocked(closeConversation).mockResolvedValue({
      success: true,
      data: {} as never,
    })

    await generateStaleSummary(
      asSupabaseClient(client),
      'contact-1',
      'stale-conv-1',
      mockClaude
    )

    expect(buildClaudeMessages).toHaveBeenCalledWith(
      expect.anything(),
      'stale-conv-1'
    )
    expect(mockClaude).toHaveBeenCalled()
    expect(createLead).toHaveBeenCalledWith(
      'contact-1',
      'stale-conv-1',
      expect.objectContaining({
        instagram_handle: 'testuser',
        qualification_status: 'warm',
        call_booked: false,
      })
    )
    expect(closeConversation).toHaveBeenCalledWith(
      'stale-conv-1',
      expect.any(String)
    )
  })

  it('returns early when no messages in stale conversation', async () => {
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [],
    })

    await generateStaleSummary(
      asSupabaseClient(client),
      'contact-1',
      'stale-conv-1',
      mockClaude
    )

    expect(mockClaude).not.toHaveBeenCalled()
    expect(createLead).not.toHaveBeenCalled()
  })

  it('returns early when buildClaudeMessages fails', async () => {
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: false,
      error: 'DB error',
    })

    await generateStaleSummary(
      asSupabaseClient(client),
      'contact-1',
      'stale-conv-1',
      mockClaude
    )

    expect(mockClaude).not.toHaveBeenCalled()
  })

  it('handles malformed JSON from Claude gracefully', async () => {
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hey' }],
    })
    mockClaude.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json at all' }],
    })

    // Should not throw — the try/catch around JSON.parse handles this
    await generateStaleSummary(
      asSupabaseClient(client),
      'contact-1',
      'stale-conv-1',
      mockClaude
    )

    expect(createLead).not.toHaveBeenCalled()
    expect(closeConversation).not.toHaveBeenCalled()
  })

  it('handles invalid summary schema from Claude gracefully', async () => {
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hey' }],
    })
    // Valid JSON but fails Zod schema (missing required fields)
    mockClaude.mockResolvedValue({
      content: [{ type: 'text', text: '{"random": "data"}' }],
    })

    await generateStaleSummary(
      asSupabaseClient(client),
      'contact-1',
      'stale-conv-1',
      mockClaude
    )

    expect(createLead).not.toHaveBeenCalled()
    expect(closeConversation).not.toHaveBeenCalled()
  })

  it('handles Claude API failure gracefully', async () => {
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hey' }],
    })
    mockClaude.mockRejectedValue(new Error('API timeout'))

    await generateStaleSummary(
      asSupabaseClient(client),
      'contact-1',
      'stale-conv-1',
      mockClaude
    )

    expect(createLead).not.toHaveBeenCalled()
  })
})
