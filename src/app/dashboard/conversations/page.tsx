export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { PageHeader } from '@/components/dashboard/page-header'
import { ConversationFilters } from '@/components/dashboard/conversation-filters'
import { ConversationList } from '@/components/dashboard/conversation-list'
import { getConversationList } from '@/lib/services/dashboard-conversations'

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params = await searchParams
  const { items, total } = await getConversationList({
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <>
      <PageHeader
        title="Conversations"
        description={`${total} total conversations`}
      />
      <div className="mb-4">
        <Suspense>
          <ConversationFilters />
        </Suspense>
      </div>
      <ConversationList conversations={items} />
    </>
  )
}
