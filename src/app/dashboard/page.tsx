export const dynamic = 'force-dynamic'

import { PageHeader } from '@/components/dashboard/page-header'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { ConversationVolumeChart } from '@/components/dashboard/conversation-volume-chart'
import { LeadPipelineBar } from '@/components/dashboard/lead-pipeline-bar'
import {
  getOverviewKPIs,
  getConversationVolume,
} from '@/lib/services/dashboard'

export default async function DashboardPage() {
  const [kpis, volumeData] = await Promise.all([
    getOverviewKPIs(),
    getConversationVolume(30),
  ])

  return (
    <>
      <PageHeader
        title="Overview"
        description="InstaSetter DM automation at a glance"
      />
      <KpiGrid kpis={kpis} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ConversationVolumeChart data={volumeData} />
        <LeadPipelineBar
          hot={kpis.hotLeads}
          warm={kpis.warmLeads}
          cold={kpis.coldLeads}
        />
      </div>
    </>
  )
}
