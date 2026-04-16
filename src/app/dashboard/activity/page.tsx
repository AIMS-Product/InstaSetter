export const dynamic = 'force-dynamic'

import { PageHeader } from '@/components/dashboard/page-header'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { getActivityFeed } from '@/lib/services/dashboard-activity'

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    integration?: string
    status?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const { items, total } = await getActivityFeed({
    integration: params.integration,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <>
      <PageHeader
        title="Activity"
        description={`${total} integration events`}
      />
      <ActivityFeed events={items} />
    </>
  )
}
