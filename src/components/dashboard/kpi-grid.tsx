import {
  MessageSquare,
  Zap,
  Target,
  Flame,
  Sun,
  Snowflake,
  CalendarCheck,
  MessagesSquare,
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import type { OverviewKPIs } from '@/types/dashboard'

export function KpiGrid({ kpis }: { kpis: OverviewKPIs }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Conversations"
        value={kpis.totalConversations}
        icon={MessageSquare}
      />
      <KpiCard title="Active Now" value={kpis.activeConversations} icon={Zap} />
      <KpiCard title="Total Leads" value={kpis.totalLeads} icon={Target} />
      <KpiCard
        title="Booking Rate"
        value={`${kpis.bookingRate}%`}
        icon={CalendarCheck}
      />
      <KpiCard title="Hot Leads" value={kpis.hotLeads} icon={Flame} />
      <KpiCard title="Warm Leads" value={kpis.warmLeads} icon={Sun} />
      <KpiCard title="Cold Leads" value={kpis.coldLeads} icon={Snowflake} />
      <KpiCard
        title="Messages (24h)"
        value={kpis.messagesLast24h}
        subtitle={`${kpis.totalMessages} total`}
        icon={MessagesSquare}
      />
    </div>
  )
}
