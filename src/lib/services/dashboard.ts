import { createDashboardClient } from '@/lib/supabase/dashboard'
import type { OverviewKPIs, ConversationVolumePoint } from '@/types/dashboard'

export async function getOverviewKPIs(): Promise<OverviewKPIs> {
  const supabase = createDashboardClient()

  const now = new Date()
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString()

  const [
    totalConvos,
    activeConvos,
    hotLeads,
    warmLeads,
    coldLeads,
    bookedLeads,
    totalMsgs,
    recentMsgs,
  ] = await Promise.all([
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('qualification_status', 'hot'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('qualification_status', 'warm'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('qualification_status', 'cold'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('call_booked', true),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo),
  ])

  const hot = hotLeads.count ?? 0
  const warm = warmLeads.count ?? 0
  const cold = coldLeads.count ?? 0
  const totalLeads = hot + warm + cold
  const booked = bookedLeads.count ?? 0

  return {
    totalConversations: totalConvos.count ?? 0,
    activeConversations: activeConvos.count ?? 0,
    totalLeads,
    hotLeads: hot,
    warmLeads: warm,
    coldLeads: cold,
    bookingRate: totalLeads > 0 ? Math.round((booked / totalLeads) * 100) : 0,
    totalMessages: totalMsgs.count ?? 0,
    messagesLast24h: recentMsgs.count ?? 0,
  }
}

export async function getConversationVolume(
  days: number = 30
): Promise<ConversationVolumePoint[]> {
  const supabase = createDashboardClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('conversations')
    .select('started_at, ended_at, status')
    .gte('started_at', since)
    .order('started_at', { ascending: true })

  if (!data?.length) return []

  // Bucket by date
  const buckets = new Map<string, { started: number; completed: number }>()

  for (const convo of data) {
    const startDate = convo.started_at.slice(0, 10)
    const bucket = buckets.get(startDate) ?? { started: 0, completed: 0 }
    bucket.started++
    buckets.set(startDate, bucket)

    if (convo.ended_at && convo.status === 'completed') {
      const endDate = convo.ended_at.slice(0, 10)
      const endBucket = buckets.get(endDate) ?? { started: 0, completed: 0 }
      endBucket.completed++
      buckets.set(endDate, endBucket)
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))
}
