export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { PageHeader } from '@/components/dashboard/page-header'
import { LeadFilters } from '@/components/dashboard/lead-filters'
import { LeadTable } from '@/components/dashboard/lead-table'
import { getLeadList } from '@/lib/services/dashboard-leads'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; booked?: string; page?: string }>
}) {
  const params = await searchParams
  const { items, total } = await getLeadList({
    qualificationStatus: params.status,
    callBooked: params.booked,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <>
      <PageHeader title="Leads" description={`${total} total leads`} />
      <div className="mb-4">
        <Suspense>
          <LeadFilters />
        </Suspense>
      </div>
      <LeadTable leads={items} />
    </>
  )
}
