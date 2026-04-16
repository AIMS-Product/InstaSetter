export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ConversationThread } from '@/components/dashboard/conversation-thread'
import { getConversationDetail } from '@/lib/services/dashboard-conversations'

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const conversation = await getConversationDetail(id)

  if (!conversation) {
    notFound()
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/dashboard/conversations"
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to conversations
        </Link>
      </div>
      <ConversationThread conversation={conversation} />
    </>
  )
}
