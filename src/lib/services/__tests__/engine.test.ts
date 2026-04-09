import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

vi.mock('@/lib/services/conversation')
vi.mock('@/lib/services/message')
vi.mock('@/lib/services/claude')
vi.mock('@/lib/prompts/setter-v1')
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

import { processMessage } from '@/lib/services/engine'
import {
  findOrCreateActiveConversation,
  loadPriorSummaries,
} from '@/lib/services/conversation'
import { storeMessage, buildClaudeMessages } from '@/lib/services/message'
import { buildClaudeRequest, parseClaudeResponse } from '@/lib/services/claude'
import { buildSystemPrompt } from '@/lib/prompts/setter-v1'

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
  const mockClient = {} as SupabaseClient<Database>
  const mockContact = { id: 'contact-1' }
  const mockClaude = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
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
      mockClient,
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
      mockClient,
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
      mockClient,
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
      mockClient,
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
})
