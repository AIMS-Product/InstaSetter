export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { PageHeader } from '@/components/dashboard/page-header'
import { ContactFilters } from '@/components/dashboard/contact-filters'
import { ContactTable } from '@/components/dashboard/contact-table'
import { getContactList } from '@/lib/services/dashboard-contacts'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; source?: string; page?: string }>
}) {
  const params = await searchParams
  const { items, total } = await getContactList({
    search: params.search,
    source: params.source,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <>
      <PageHeader
        title="Contacts"
        description={`${total} Instagram contacts`}
      />
      <div className="mb-4">
        <Suspense>
          <ContactFilters />
        </Suspense>
      </div>
      <ContactTable contacts={items} />
    </>
  )
}
