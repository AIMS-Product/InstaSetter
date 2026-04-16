import { createDashboardClient } from '@/lib/supabase/dashboard'
import type { ContactListItem } from '@/types/dashboard'

const PAGE_SIZE = 25

export async function getContactList(filters: {
  search?: string
  source?: string
  page?: number
}): Promise<{ items: ContactListItem[]; total: number }> {
  const supabase = createDashboardClient()
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('contacts')
    .select(
      'id, instagram_handle, name, email, phone, source, opted_out, first_seen_at, last_message_at',
      { count: 'exact' }
    )
    .order('last_message_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters.search) {
    query = query.or(
      `instagram_handle.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
    )
  }
  if (filters.source) {
    query = query.eq('source', filters.source)
  }

  const { data, count } = await query

  if (!data) return { items: [], total: 0 }

  // Get conversation counts per contact
  const ids = data.map((c) => c.id)
  const { data: convos } = await supabase
    .from('conversations')
    .select('contact_id')
    .in('contact_id', ids)

  const convoCountMap = new Map<string, number>()
  for (const c of convos ?? []) {
    convoCountMap.set(c.contact_id, (convoCountMap.get(c.contact_id) ?? 0) + 1)
  }

  const items: ContactListItem[] = data.map((c) => ({
    id: c.id,
    instagramHandle: c.instagram_handle,
    name: c.name,
    email: c.email,
    phone: c.phone,
    source: c.source,
    optedOut: c.opted_out,
    conversationCount: convoCountMap.get(c.id) ?? 0,
    firstSeenAt: c.first_seen_at,
    lastMessageAt: c.last_message_at,
  }))

  return { items, total: count ?? 0 }
}
