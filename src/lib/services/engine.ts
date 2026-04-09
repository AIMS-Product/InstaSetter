import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import type { Database } from '@/types/database'
import {
  findOrCreateActiveConversation,
  closeConversation,
  loadPriorSummaries,
} from '@/lib/services/conversation'
import { createLead } from '@/lib/services/lead'
import { storeMessage, buildClaudeMessages } from '@/lib/services/message'
import {
  buildClaudeRequest,
  parseClaudeResponse,
  type ToolCall,
} from '@/lib/services/claude'
import { leadSummarySchema } from '@/types/lead'
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
    routeLeadEvents(client, contact.id, conversationId, parsed.toolCalls).catch(
      () => {}
    )
  }

  return { success: true, data: { reply: parsed.replyText, conversationId } }
}

const KNOWN_TOOLS = new Set([
  'capture_email',
  'generate_summary',
  'qualify_lead',
  'book_call',
])

export async function routeLeadEvents(
  client: SupabaseClient<Database>,
  contactId: string,
  conversationId: string,
  toolCalls: ToolCall[]
): Promise<{ success: boolean; eventsProcessed: number }> {
  if (toolCalls.length === 0) {
    return { success: true, eventsProcessed: 0 }
  }

  let eventsProcessed = 0

  for (const call of toolCalls) {
    if (!KNOWN_TOOLS.has(call.name)) continue

    try {
      switch (call.name) {
        case 'capture_email': {
          const email = call.input.email as string | undefined
          if (email) {
            await client
              .from('contacts')
              .update({ email, updated_at: new Date().toISOString() })
              .eq('id', contactId)
          }
          break
        }

        case 'generate_summary': {
          const parsed = leadSummarySchema.safeParse(call.input)
          if (!parsed.success) {
            await logIntegrationEvent(client, {
              contactId,
              conversationId,
              integration: 'inro',
              action: 'generate_summary',
              status: 'failed',
              errorMessage: parsed.error.message,
              payload: call.input,
            })
            eventsProcessed++
            continue
          }

          await createLead(contactId, conversationId, parsed.data)
          await closeConversation(conversationId, JSON.stringify(parsed.data))
          break
        }

        case 'qualify_lead': {
          // No-op — logged to integration_events for audit only
          break
        }

        case 'book_call': {
          // Logged to integration_events with status='pending'
          break
        }
      }

      await logIntegrationEvent(client, {
        contactId,
        conversationId,
        integration: 'inro',
        action: call.name,
        status: call.name === 'book_call' ? 'pending' : 'success',
        payload: call.input,
      })
      eventsProcessed++
    } catch {
      await logIntegrationEvent(client, {
        contactId,
        conversationId,
        integration: 'inro',
        action: call.name,
        status: 'failed',
        errorMessage: 'Unexpected error processing tool call',
        payload: call.input,
      }).catch(() => {})
      eventsProcessed++
    }
  }

  return { success: true, eventsProcessed }
}

async function logIntegrationEvent(
  client: SupabaseClient<Database>,
  event: {
    contactId: string
    conversationId: string
    integration: string
    action: string
    status: string
    payload?: unknown
    errorMessage?: string
  }
) {
  await client
    .from('integration_events')
    .insert({
      contact_id: event.contactId,
      conversation_id: event.conversationId,
      integration: event.integration,
      action: event.action,
      status: event.status,
      payload:
        event.payload as Database['public']['Tables']['integration_events']['Insert']['payload'],
      error_message: event.errorMessage ?? null,
    })
    .select()
    .single()
}
