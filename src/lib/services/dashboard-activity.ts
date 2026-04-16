import { createDashboardClient } from '@/lib/supabase/dashboard'
import type { ActivityItem } from '@/types/dashboard'

const PAGE_SIZE = 50

export async function getActivityFeed(filters: {
  integration?: string
  status?: string
  page?: number
}): Promise<{ items: ActivityItem[]; total: number }> {
  const supabase = createDashboardClient()
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('integration_events')
    .select(
      'id, integration, action, status, error_message, created_at, contacts!integration_events_contact_id_fkey(instagram_handle)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters.integration) {
    query = query.eq('integration', filters.integration)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, count } = await query

  if (!data) return { items: [], total: 0 }

  const items: ActivityItem[] = data.map((e) => {
    const contact = e.contacts as unknown as {
      instagram_handle: string
    } | null

    return {
      id: e.id,
      integration: e.integration,
      action: e.action,
      status: e.status,
      errorMessage: e.error_message,
      instagramHandle: contact?.instagram_handle ?? null,
      createdAt: e.created_at,
    }
  })

  return { items, total: count ?? 0 }
}
