import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

vi.mock('@/lib/services/conversation')
vi.mock('@/lib/services/message')
vi.mock('@/lib/services/claude')
vi.mock('@/lib/prompts/setter-v2')
vi.mock('@/lib/services/sendpulse', () => ({
  setContactTags: vi.fn().mockResolvedValue({ success: true }),
  removeContactTag: vi.fn().mockResolvedValue({ success: true }),
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

import { processMessage } from '@/lib/services/engine'
import {
  findOrCreateActiveConversation,
  loadPriorSummaries,
} from '@/lib/services/conversation'
import { storeMessage, buildClaudeMessages } from '@/lib/services/message'
import { buildClaudeRequest, parseClaudeResponse } from '@/lib/services/claude'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import { createMockClient, asSupabaseClient } from '@/test/helpers'

type ConversationRow = Database['public']['Tables']['conversations']['Row']
type MessageRow = Database['public']['Tables']['messages']['Row']

const stubConversation: ConversationRow = {
  id: 'conv-1',
  contact_id: 'contact-1',
  status: 'active',
  prompt_version: 'setter-v1',
  summary: null,
  flagged_reason: null,
  is_test: false,
  started_at: '2026-04-09T00:00:00Z',
  ended_at: null,
  created_at: '2026-04-09T00:00:00Z',
  updated_at: '2026-04-09T00:00:00Z',
}

const stubMessage: MessageRow = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  role: 'user',
  content: 'Hi',
  inro_message_id: null,
  dedup_hash: null,
  token_count: null,
  metadata: null,
  created_at: '2026-04-09T00:00:00Z',
}

describe('processMessage', () => {
  const mockContact = { id: 'contact-1' }
  const mockClaude = vi.fn()
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = createMockClient()
    // Default: buildContactContext leads query returns no prior lead
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('executes full pipeline and returns reply', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation,
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildSystemPrompt).mockReturnValue('system prompt')
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: false,
      data: stubMessage,
    })
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hi' }],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({
      model: 'claude-sonnet-4-20250514',
      system: 'system prompt',
      messages: [],
      max_tokens: 1024,
      tools: [],
    })
    mockClaude.mockResolvedValue({
      content: [{ type: 'text', text: 'Hey!' }],
    })
    vi.mocked(parseClaudeResponse).mockReturnValue({
      replyText: 'Hey!',
      toolCalls: [],
      truncated: false,
    })

    const result = await processMessage(
      asSupabaseClient(mockClient),
      mockContact,
      'msg-id',
      'Hi',
      '2026-04-09T10:00:00Z',
      mockClaude
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reply).toBe('Hey!')
      expect(result.data.conversationId).toBe('conv-1')
    }
  })

  it('returns error when conversation service fails', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: false,
      error: 'DB error',
    })

    const result = await processMessage(
      asSupabaseClient(mockClient),
      mockContact,
      'msg-id',
      'Hi',
      'ts',
      mockClaude
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('DB error')
    }
  })

  it('returns reply even if lead event routing fails', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation,
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildSystemPrompt).mockReturnValue('prompt')
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: false,
      data: stubMessage,
    })
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({
      model: 'claude-sonnet-4-20250514',
      system: '',
      messages: [],
      max_tokens: 1024,
      tools: [],
    })
    mockClaude.mockResolvedValue({ content: [] })
    vi.mocked(parseClaudeResponse).mockReturnValue({
      replyText: 'Reply',
      toolCalls: [{ name: 'capture_email', toolUseId: 'x', input: {} }],
      truncated: false,
    })

    const result = await processMessage(
      asSupabaseClient(mockClient),
      mockContact,
      'msg-id',
      'msg',
      'ts',
      mockClaude
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reply).toBe('Reply')
    }
  })

  it('skips duplicate messages', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation,
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: true,
    })

    const result = await processMessage(
      asSupabaseClient(mockClient),
      mockContact,
      'msg-id',
      'Hi',
      'ts',
      mockClaude
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reply).toBeUndefined()
    }
    expect(mockClaude).not.toHaveBeenCalled()
  })

  it('returns error when Claude API call throws', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation,
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildSystemPrompt).mockReturnValue('prompt')
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: false,
      data: stubMessage,
    })
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hi' }],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({
      model: 'claude-sonnet-4-20250514',
      system: '',
      messages: [],
      max_tokens: 1024,
      tools: [],
    })
    mockClaude.mockRejectedValue(new Error('Rate limit exceeded'))

    const result = await processMessage(
      asSupabaseClient(mockClient),
      mockContact,
      'msg-id',
      'Hi',
      '2026-04-09T10:00:00Z',
      mockClaude
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Rate limit exceeded')
    }
  })

  it('returns error when storing assistant reply fails', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation,
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildSystemPrompt).mockReturnValue('prompt')
    // First call: store user message succeeds
    // Second call: store assistant reply fails
    vi.mocked(storeMessage)
      .mockResolvedValueOnce({
        success: true,
        isDuplicate: false,
        data: stubMessage,
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'DB write failed',
      })
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hi' }],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({
      model: 'claude-sonnet-4-20250514',
      system: '',
      messages: [],
      max_tokens: 1024,
      tools: [],
    })
    mockClaude.mockResolvedValue({
      content: [{ type: 'text', text: 'Hey!' }],
    })
    vi.mocked(parseClaudeResponse).mockReturnValue({
      replyText: 'Hey!',
      toolCalls: [],
      truncated: false,
    })

    const result = await processMessage(
      asSupabaseClient(mockClient),
      mockContact,
      'msg-id',
      'Hi',
      '2026-04-09T10:00:00Z',
      mockClaude
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB write failed')
    }
    expect(storeMessage).toHaveBeenCalledTimes(2)
  })

  it('passes contactContext to buildSystemPrompt when contact has tags', async () => {
    const taggedContact = {
      id: 'contact-1',
      tags: ['qualified', 'location:Adelaide'],
      name: 'James',
      email: 'james@test.com',
    }

    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: stubConversation,
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildSystemPrompt).mockReturnValue('prompt')
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      isDuplicate: false,
      data: stubMessage,
    })
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hi' }],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({
      model: 'claude-sonnet-4-20250514',
      system: '',
      messages: [],
      max_tokens: 1024,
      tools: [],
    })
    mockClaude.mockResolvedValue({
      content: [{ type: 'text', text: 'Hey!' }],
    })
    vi.mocked(parseClaudeResponse).mockReturnValue({
      replyText: 'Hey!',
      toolCalls: [],
      truncated: false,
    })

    await processMessage(
      asSupabaseClient(mockClient),
      taggedContact,
      'msg-id',
      'Hi',
      '2026-04-09T10:00:00Z',
      mockClaude
    )

    expect(buildSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        contactContext: expect.objectContaining({
          tags: ['qualified', 'location:Adelaide'],
          name: 'James',
          email: 'james@test.com',
        }),
      })
    )
  })
})
