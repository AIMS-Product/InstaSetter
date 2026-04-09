import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import type { Database } from '@/types/database'
import {
  findOrCreateActiveConversation,
  loadPriorSummaries,
} from '@/lib/services/conversation'
import { storeMessage, buildClaudeMessages } from '@/lib/services/message'
import {
  buildClaudeRequest,
  parseClaudeResponse,
  type ToolCall,
} from '@/lib/services/claude'
import { buildSystemPrompt } from '@/lib/prompts/setter-v1'
import { getServerConfig } from '@/lib/config'

type ClaudeCallFn = (
  request: ReturnType<typeof buildClaudeRequest>
) => Promise<Anthropic.Messages.Message>

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

type ProcessMessageResult = {
  reply: string | undefined
  conversationId: string
}

export async function processMessage(
  client: SupabaseClient<Database>,
  contact: { id: string },
  inroMessageId: string | undefined,
  content: string,
  timestamp: string,
  callClaude: ClaudeCallFn
): Promise<ServiceResult<ProcessMessageResult>> {
  const { BRAND_NAME } = getServerConfig()

  // Step 1: Find or create active conversation
  const convResult = await findOrCreateActiveConversation(contact.id)
  if (!convResult.success) {
    return { success: false, error: convResult.error }
  }
  const conversationId = convResult.data.id

  // Step 2: Load prior summaries for context
  const summariesResult = await loadPriorSummaries(contact.id)
  const priorSummaries = summariesResult.success ? summariesResult.data : []

  // Step 3: Store the incoming user message (with dedup check)
  const storeResult = await storeMessage(client, {
    conversationId,
    role: 'user',
    content,
    timestamp,
    inroMessageId,
  })

  if (!storeResult.success) {
    return { success: false, error: storeResult.error }
  }

  // If duplicate, skip processing
  if (storeResult.isDuplicate) {
    return { success: true, data: { reply: undefined, conversationId } }
  }

  // Step 4: Build system prompt
  const isReturningContact = priorSummaries.length > 0
  const systemPrompt = buildSystemPrompt({
    brandName: BRAND_NAME,
    isReturningContact,
    priorSummaries,
  })

  // Step 5: Assemble message history
  const messagesResult = await buildClaudeMessages(client, conversationId)
  if (!messagesResult.success) {
    return { success: false, error: messagesResult.error }
  }

  // Step 6: Build Claude API request
  const request = buildClaudeRequest(
    systemPrompt,
    messagesResult.data as Anthropic.Messages.MessageParam[]
  )

  // Step 7: Call Claude
  let claudeResponse: Anthropic.Messages.Message
  try {
    claudeResponse = await callClaude(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude API error'
    return { success: false, error: message }
  }

  // Step 8: Parse Claude response
  const parsed = parseClaudeResponse(claudeResponse)

  // Step 9: Store assistant reply
  if (parsed.replyText) {
    const storeReplyResult = await storeMessage(client, {
      conversationId,
      role: 'assistant',
      content: parsed.replyText,
      timestamp: new Date().toISOString(),
    })

    if (!storeReplyResult.success) {
      return { success: false, error: storeReplyResult.error }
    }
  }

  // Step 10: Route lead events (non-blocking)
  if (parsed.toolCalls.length > 0) {
    routeLeadEvents(conversationId, contact.id, parsed.toolCalls).catch(
      () => {}
    )
  }

  return { success: true, data: { reply: parsed.replyText, conversationId } }
}

// Stub for Issue 20 — will be fleshed out when that issue is implemented
export async function routeLeadEvents(
  _conversationId: string,
  _contactId: string,
  _toolCalls: ToolCall[]
): Promise<{ success: boolean; eventsProcessed: number }> {
  void _conversationId
  void _contactId
  void _toolCalls
  return { success: true, eventsProcessed: 0 }
}
