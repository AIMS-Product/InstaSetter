import { createDashboardClient } from '@/lib/supabase/dashboard'
import type { LeadListItem } from '@/types/dashboard'

const PAGE_SIZE = 25

export async function getLeadList(filters: {
  qualificationStatus?: string
  callBooked?: string
  page?: number
}): Promise<{ items: LeadListItem[]; total: number }> {
  const supabase = createDashboardClient()
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('leads')
    .select(
      'id, instagram_handle, name, email, qualification_status, call_booked, machine_count, location_type, revenue_range, calendly_slot, call_outcome, key_notes, recommended_action, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters.qualificationStatus) {
    query = query.eq('qualification_status', filters.qualificationStatus)
  }
  if (filters.callBooked === 'true') {
    query = query.eq('call_booked', true)
  } else if (filters.callBooked === 'false') {
    query = query.eq('call_booked', false)
  }

  const { data, count } = await query

  if (!data) return { items: [], total: 0 }

  const items: LeadListItem[] = data.map((l) => ({
    id: l.id,
    instagramHandle: l.instagram_handle,
    name: l.name,
    email: l.email,
    qualificationStatus: l.qualification_status,
    callBooked: l.call_booked,
    machineCount: l.machine_count,
    locationType: l.location_type,
    revenueRange: l.revenue_range,
    calendlySlot: l.calendly_slot,
    callOutcome: l.call_outcome,
    keyNotes: l.key_notes,
    recommendedAction: l.recommended_action,
    createdAt: l.created_at,
  }))

  return { items, total: count ?? 0 }
}
