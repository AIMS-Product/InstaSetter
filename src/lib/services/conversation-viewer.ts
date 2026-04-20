import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export interface ConversationListItem {
  id: string
  status: string
  started_at: string
  ended_at: string | null
  summary: string | null
  message_count: number
  event_count: number
  last_message_at: string | null
  last_message_preview: string | null
  contact: {
    id: string
    instagram_handle: string
    name: string | null
  }
}

export interface ConversationMessage {
  id: string
  role: string
  content: string
  created_at: string
}

export interface ConversationEvent {
  id: string
  message_id: string | null
  tool_name: string
  tool_input: Record<string, unknown>
  integration: string
  created_at: string
}

export interface ConversationDetail {
  id: string
  status: string
  prompt_version: string
  summary: string | null
  started_at: string
  ended_at: string | null
  contact: {
    id: string
    instagram_handle: string
    name: string | null
    email: string | null
  }
  messages: ConversationMessage[]
  events: ConversationEvent[]
}

export async function listConversations(
  limit: number = 50
): Promise<ConversationListItem[]> {
  const client = createServiceRoleClient()

  const { data: convs, error } = await client
    .from('conversations')
    .select(
      'id, status, started_at, ended_at, summary, contact_id, contacts(id, instagram_handle, name)'
    )
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error || !convs) {
    console.error('listConversations failed', error)
    return []
  }

  const conversationIds = convs.map((c) => c.id)
  if (conversationIds.length === 0) return []

  const [messagesRes, eventsRes] = await Promise.all([
    client
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false }),
    client
      .from('lead_events')
      .select('conversation_id')
      .in('conversation_id', conversationIds),
  ])

  const messagesByConv = new Map<
    string,
    { content: string; created_at: string; count: number }
  >()
  if (messagesRes.data) {
    for (const m of messagesRes.data) {
      const existing = messagesByConv.get(m.conversation_id)
      if (!existing) {
        messagesByConv.set(m.conversation_id, {
          content: m.content,
          created_at: m.created_at,
          count: 1,
        })
      } else {
        existing.count++
      }
    }
  }

  const eventCountByConv = new Map<string, number>()
  if (eventsRes.data) {
    for (const e of eventsRes.data) {
      eventCountByConv.set(
        e.conversation_id,
        (eventCountByConv.get(e.conversation_id) ?? 0) + 1
      )
    }
  }

  return convs.map((c) => {
    const lastMsg = messagesByConv.get(c.id)
    const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts
    return {
      id: c.id,
      status: c.status,
      started_at: c.started_at,
      ended_at: c.ended_at,
      summary: c.summary,
      message_count: lastMsg?.count ?? 0,
      event_count: eventCountByConv.get(c.id) ?? 0,
      last_message_at: lastMsg?.created_at ?? null,
      last_message_preview: lastMsg?.content.slice(0, 120) ?? null,
      contact: {
        id: contact?.id ?? '',
        instagram_handle: contact?.instagram_handle ?? 'unknown',
        name: contact?.name ?? null,
      },
    }
  })
}

export async function getConversation(
  conversationId: string
): Promise<ConversationDetail | null> {
  const client = createServiceRoleClient()

  const { data: conv, error } = await client
    .from('conversations')
    .select(
      'id, status, prompt_version, summary, started_at, ended_at, contacts(id, instagram_handle, name, email)'
    )
    .eq('id', conversationId)
    .maybeSingle()

  if (error || !conv) {
    if (error) console.error('getConversation failed', error)
    return null
  }

  const [messagesRes, eventsRes] = await Promise.all([
    client
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
    client
      .from('lead_events')
      .select('id, message_id, tool_name, tool_input, integration, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
  ])

  const contact = Array.isArray(conv.contacts)
    ? conv.contacts[0]
    : conv.contacts

  return {
    id: conv.id,
    status: conv.status,
    prompt_version: conv.prompt_version,
    summary: conv.summary,
    started_at: conv.started_at,
    ended_at: conv.ended_at,
    contact: {
      id: contact?.id ?? '',
      instagram_handle: contact?.instagram_handle ?? 'unknown',
      name: contact?.name ?? null,
      email: contact?.email ?? null,
    },
    messages: (messagesRes.data ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
    events: (eventsRes.data ?? []).map((e) => ({
      id: e.id,
      message_id: e.message_id,
      tool_name: e.tool_name,
      tool_input: (e.tool_input as Record<string, unknown>) ?? {},
      integration: e.integration,
      created_at: e.created_at,
    })),
  }
}
