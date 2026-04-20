import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isBotEnabled } from '@/lib/config'

export interface DashboardMetrics {
  bot: {
    enabled: boolean
  }
  conversations: {
    total: number
    active: number
    today: number
    last7d: number
    last30d: number
  }
  lastMessageAt: string | null
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const client = createServiceRoleClient()
  const today = startOfToday().toISOString()
  const d7 = daysAgo(7).toISOString()
  const d30 = daysAgo(30).toISOString()

  const [totalRes, activeRes, todayRes, w7Res, m30Res, lastMsgRes] =
    await Promise.all([
      client.from('conversations').select('id', { count: 'exact', head: true }),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', today),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', d7),
      client
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', d30),
      client
        .from('messages')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  return {
    bot: { enabled: isBotEnabled() },
    conversations: {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      today: todayRes.count ?? 0,
      last7d: w7Res.count ?? 0,
      last30d: m30Res.count ?? 0,
    },
    lastMessageAt: lastMsgRes.data?.created_at ?? null,
  }
}
