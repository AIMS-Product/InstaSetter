import { createDashboardClient } from '@/lib/supabase/dashboard'
import type {
  ConversationListItem,
  ConversationDetail,
} from '@/types/dashboard'

const PAGE_SIZE = 25

export async function getConversationList(filters: {
  status?: string
  page?: number
}): Promise<{ items: ConversationListItem[]; total: number }> {
  const supabase = createDashboardClient()
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('conversations')
    .select(
      'id, status, summary, started_at, updated_at, contacts!conversations_contact_id_fkey(instagram_handle, name)',
      { count: 'exact' }
    )
    .eq('is_test', false)
    .order('updated_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, count } = await query

  if (!data) return { items: [], total: 0 }

  // Get message counts for these conversations
  const ids = data.map((c) => c.id)
  const { data: msgCounts } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', ids)

  const countMap = new Map<string, number>()
  for (const m of msgCounts ?? []) {
    countMap.set(m.conversation_id, (countMap.get(m.conversation_id) ?? 0) + 1)
  }

  const items: ConversationListItem[] = data.map((c) => {
    const contact = c.contacts as unknown as {
      instagram_handle: string
      name: string | null
    } | null

    return {
      id: c.id,
      contactName: contact?.name ?? null,
      instagramHandle: contact?.instagram_handle ?? 'unknown',
      status: c.status,
      messageCount: countMap.get(c.id) ?? 0,
      startedAt: c.started_at,
      lastMessageAt: c.updated_at,
      summary: c.summary,
    }
  })

  return { items, total: count ?? 0 }
}

export async function getConversationDetail(
  conversationId: string
): Promise<ConversationDetail | null> {
  const supabase = createDashboardClient()

  const [convoResult, messagesResult] = await Promise.all([
    supabase
      .from('conversations')
      .select(
        'id, status, prompt_version, summary, flagged_reason, started_at, ended_at, contacts!conversations_contact_id_fkey(instagram_handle, name)'
      )
      .eq('id', conversationId)
      .single(),
    supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
  ])

  if (!convoResult.data) return null

  const c = convoResult.data
  const contact = c.contacts as unknown as {
    instagram_handle: string
    name: string | null
  } | null

  return {
    id: c.id,
    contactName: contact?.name ?? null,
    instagramHandle: contact?.instagram_handle ?? 'unknown',
    status: c.status,
    promptVersion: c.prompt_version,
    startedAt: c.started_at,
    endedAt: c.ended_at,
    summary: c.summary,
    flaggedReason: c.flagged_reason,
    messages: (messagesResult.data ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  }
}
