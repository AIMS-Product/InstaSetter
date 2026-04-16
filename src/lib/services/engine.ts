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
import { buildSystemPrompt, type ContactContext } from '@/lib/prompts/setter-v2'
import { getServerConfig } from '@/lib/config'
import { setContactTags } from '@/lib/services/sendpulse'

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

type ContactInput = {
  id: string
  tags?: string[] | null
  name?: string | null
  email?: string | null
  sendpulse_contact_id?: string | null
}

export async function processMessage(
  client: SupabaseClient<Database>,
  contact: ContactInput,
  inroMessageId: string | undefined,
  content: string,
  timestamp: string,
  callClaude: ClaudeCallFn,
  integration: string = 'inro'
): Promise<ServiceResult<ProcessMessageResult>> {
  const { BRAND_NAME } = getServerConfig()

  // Step 1: Find or create active conversation
  const convResult = await findOrCreateActiveConversation(contact.id)
  if (!convResult.success) {
    return { success: false, error: convResult.error }
  }
  const conversationId = convResult.data.id

  // Step 1b: If a stale conversation was closed, generate its summary async
  if (convResult.data.staleConversationId) {
    generateStaleSummary(
      client,
      contact.id,
      convResult.data.staleConversationId,
      callClaude
    ).catch(() => {})
  }

  // Step 2: Load prior summaries for context
  const summariesResult = await loadPriorSummaries(contact.id)
  const priorSummaries = summariesResult.success ? summariesResult.data : []

  // Step 2b: Load latest lead for qualification context
  const contactContext = await buildContactContext(
    client,
    contact,
    priorSummaries
  )

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

  // Step 4: Build system prompt with contact context
  const isReturningContact = priorSummaries.length > 0
  const systemPrompt = buildSystemPrompt({
    brandName: BRAND_NAME,
    isReturningContact,
    priorSummaries,
    contactContext,
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

  // Step 7: Call Claude (with tool result loop)
  const allToolCalls: ToolCall[] = []
  let replyText = ''
  const MAX_TOOL_ROUNDS = 3

  let claudeResponse: Anthropic.Messages.Message
  try {
    claudeResponse = await callClaude(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude API error'
    return { success: false, error: message }
  }

  let parsed = parseClaudeResponse(claudeResponse)
  allToolCalls.push(...parsed.toolCalls)
  replyText = parsed.replyText

  // If Claude returned tool_use without text, send tool results back to get
  // the actual reply. This happens when Claude calls qualify_lead (or other
  // tools) before generating its message.
  let toolRound = 0
  while (
    claudeResponse.stop_reason === 'tool_use' &&
    !replyText &&
    toolRound < MAX_TOOL_ROUNDS
  ) {
    toolRound++

    // Build tool result messages to send back
    const toolResultMessages: Anthropic.Messages.MessageParam[] = [
      // The assistant message with tool_use blocks
      { role: 'assistant' as const, content: claudeResponse.content },
      // Tool results for each tool_use block
      {
        role: 'user' as const,
        content: parsed.toolCalls.map((tc) => ({
          type: 'tool_result' as const,
          tool_use_id: tc.toolUseId,
          content: JSON.stringify({ success: true }),
        })),
      },
    ]

    const followUpRequest = buildClaudeRequest(request.system, [
      ...request.messages,
      ...toolResultMessages,
    ])

    try {
      claudeResponse = await callClaude(followUpRequest)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claude API error'
      return { success: false, error: message }
    }

    parsed = parseClaudeResponse(claudeResponse)
    allToolCalls.push(...parsed.toolCalls)
    if (parsed.replyText) {
      replyText = parsed.replyText
    }
  }

  // Step 8: Store assistant reply
  if (replyText) {
    const storeReplyResult = await storeMessage(client, {
      conversationId,
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
    })

    if (!storeReplyResult.success) {
      return { success: false, error: storeReplyResult.error }
    }
  }

  // Step 9: Route lead events (non-blocking)
  if (allToolCalls.length > 0) {
    routeLeadEvents(
      client,
      contact.id,
      conversationId,
      allToolCalls,
      integration
    ).catch(() => {})
  }

  return { success: true, data: { reply: replyText, conversationId } }
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
  toolCalls: ToolCall[],
  integration: string = 'inro'
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
              integration,
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
          // Store qualification data as tags on the contact
          const qualTags: string[] = ['qualified']
          const loc = call.input.location_type as string | undefined
          const rev = call.input.revenue_range as string | undefined
          if (loc) qualTags.push(`location:${loc}`)
          if (rev) qualTags.push(`budget:${rev}`)

          // Merge with existing tags and update DB
          const { data: currentContact } = await client
            .from('contacts')
            .select('tags, sendpulse_contact_id')
            .eq('id', contactId)
            .single()

          if (currentContact) {
            const existing = currentContact.tags ?? []
            const merged = [...new Set([...existing, ...qualTags])]
            await client
              .from('contacts')
              .update({ tags: merged, updated_at: new Date().toISOString() })
              .eq('id', contactId)

            // Sync tags to SendPulse (non-blocking)
            if (currentContact.sendpulse_contact_id) {
              setContactTags(
                currentContact.sendpulse_contact_id,
                qualTags
              ).catch(() => {})
            }
          }
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
        integration,
        action: call.name,
        status: call.name === 'book_call' ? 'pending' : 'success',
        payload: call.input,
      })
      eventsProcessed++
    } catch {
      await logIntegrationEvent(client, {
        contactId,
        conversationId,
        integration,
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

// ---------------------------------------------------------------------------
// Contact context builder — loads tags + last lead for prompt injection
// ---------------------------------------------------------------------------

async function buildContactContext(
  client: SupabaseClient<Database>,
  contact: ContactInput,
  _priorSummaries: string[]
): Promise<ContactContext | undefined> {
  const tags = contact.tags ?? []

  // Load latest lead for this contact (if any)
  const { data: lastLead } = await client
    .from('leads')
    .select('qualification_status, location_type, revenue_range, key_notes')
    .eq('contact_id', contact.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Also extract qualification data from tags (e.g. "location:Adelaide")
  const locationTag = tags
    .find((t) => t.startsWith('location:'))
    ?.replace('location:', '')
  const budgetTag = tags
    .find((t) => t.startsWith('budget:'))
    ?.replace('budget:', '')
  const motivationTag = tags
    .find((t) => t.startsWith('motivation:'))
    ?.replace('motivation:', '')

  const hasQualData =
    lastLead || locationTag || budgetTag || motivationTag || tags.length > 0

  if (!hasQualData) return undefined

  return {
    tags,
    name: contact.name ?? undefined,
    email: contact.email ?? undefined,
    lastQualification: lastLead
      ? {
          status: lastLead.qualification_status,
          location: lastLead.location_type ?? locationTag,
          motivation: motivationTag,
          budget: lastLead.revenue_range ?? budgetTag,
        }
      : locationTag || motivationTag || budgetTag
        ? {
            status: 'in-progress',
            location: locationTag,
            motivation: motivationTag,
            budget: budgetTag,
          }
        : undefined,
  }
}

// ---------------------------------------------------------------------------
// Stale conversation summary generator
// ---------------------------------------------------------------------------

const SUMMARY_SYSTEM_PROMPT = `You are a conversation analyst. Given an Instagram DM conversation between a vending business setter and a prospect, generate a structured JSON summary.

Return ONLY a JSON object with these fields:
- instagram_handle (string, required): the prospect's likely handle or "unknown"
- qualification_status (string, required): "hot", "warm", or "cold"
- call_booked (boolean, required): whether a call was booked
- name (string, optional): prospect's first name if mentioned
- email (string, optional): if captured
- machine_count (number, optional): machines mentioned
- location_type (string, optional): city/state or venue types
- revenue_range (string, optional): budget mentioned
- key_notes (string, optional): objections, flags, context for the sales team
- recommended_action (string, optional): suggested next step

Return ONLY valid JSON. No explanation, no markdown.`

async function generateStaleSummary(
  client: SupabaseClient<Database>,
  contactId: string,
  staleConversationId: string,
  callClaude: ClaudeCallFn
): Promise<void> {
  // Load the stale conversation's messages
  const messagesResult = await buildClaudeMessages(client, staleConversationId)
  if (!messagesResult.success || messagesResult.data.length === 0) return

  // Format messages as a readable transcript for the summary call
  const transcript = messagesResult.data
    .map((m) => `${m.role === 'user' ? 'PROSPECT' : 'MIKE'}: ${m.content}`)
    .join('\n\n')

  // Make a lightweight Claude call to generate just the summary
  const request = buildClaudeRequest(SUMMARY_SYSTEM_PROMPT, [
    { role: 'user', content: `Summarize this conversation:\n\n${transcript}` },
  ])

  let response: Anthropic.Messages.Message
  try {
    response = await callClaude(request)
  } catch {
    return
  }

  // Extract text from response
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  // Parse the JSON summary
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(text)
  } catch {
    return
  }
  const parsed = leadSummarySchema.safeParse(parsedJson)
  if (!parsed.success) return

  // Create lead and close the conversation
  await createLead(contactId, staleConversationId, parsed.data)
  await closeConversation(staleConversationId, text)
}
