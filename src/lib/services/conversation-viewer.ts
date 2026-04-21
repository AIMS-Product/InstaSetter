import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type {
  ConversationDetail,
  ConversationEvent,
  ConversationListItem,
  ConversationMessage,
  TimelineItem,
} from './conversation-viewer-types'
export { interleave } from './conversation-viewer-types'

import type {
  ConversationDetail,
  ConversationListItem,
} from './conversation-viewer-types'

export async function countConversationsStartedSince(
  sinceIso: string
): Promise<number> {
  const client = createServiceRoleClient()
  const { count, error } = await client
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', sinceIso)
  if (error) {
    console.error('countConversationsStartedSince failed', error)
    return 0
  }
  return count ?? 0
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
      .select('conversation_id, tool_name')
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
  const eventToolsByConv = new Map<string, Set<string>>()
  if (eventsRes.data) {
    for (const e of eventsRes.data) {
      eventCountByConv.set(
        e.conversation_id,
        (eventCountByConv.get(e.conversation_id) ?? 0) + 1
      )
      if (!eventToolsByConv.has(e.conversation_id)) {
        eventToolsByConv.set(e.conversation_id, new Set())
      }
      if (e.tool_name) {
        eventToolsByConv.get(e.conversation_id)!.add(e.tool_name)
      }
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
      event_tool_names: Array.from(eventToolsByConv.get(c.id) ?? []),
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

export interface GetConversationOptions {
  // Cap on how many of the MOST RECENT messages to return. Default keeps
  // transcript payloads bounded — long threads have shipped 200+ messages
  // and large tool_input blobs on every row click.
  messageLimit?: number
  eventLimit?: number
}

const DEFAULT_MESSAGE_LIMIT = 80
const DEFAULT_EVENT_LIMIT = 80

export async function getConversation(
  conversationId: string,
  opts: GetConversationOptions = {}
): Promise<ConversationDetail | null> {
  const messageLimit = opts.messageLimit ?? DEFAULT_MESSAGE_LIMIT
  const eventLimit = opts.eventLimit ?? DEFAULT_EVENT_LIMIT
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

  // Grab the most recent N rows by sorting desc + limit, then reverse to
  // chronological order for the caller. This keeps the newest N messages
  // (what operators care about) without paying for the entire history.
  const [messagesRes, eventsRes] = await Promise.all([
    client
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(messageLimit),
    client
      .from('lead_events')
      .select('id, message_id, tool_name, tool_input, integration, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(eventLimit),
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
    // Re-sort ascending so callers receive chronological order — the desc
    // + limit query above is just a "keep the latest N" optimisation.
    messages: (messagesRes.data ?? [])
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    events: (eventsRes.data ?? [])
      .map((e) => ({
        id: e.id,
        message_id: e.message_id,
        tool_name: e.tool_name,
        tool_input: (e.tool_input as Record<string, unknown>) ?? {},
        integration: e.integration,
        created_at: e.created_at,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }
}
