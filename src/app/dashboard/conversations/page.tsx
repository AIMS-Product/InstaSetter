import { DEFAULT_FLOW_ID } from '@/lib/flows'
import PageRuns from '../flows/[flowId]/related-pages/page-runs'
import { B } from '../flows/[flowId]/directions/b-stage/palette'

export const revalidate = 0

export default function ConversationsPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-0 flex-1">
      <PageRuns
        p={B}
        flowId={DEFAULT_FLOW_ID}
        defaultScope="all"
        flowScopeLabel="Instagram DM"
        description="Search every conversation, inspect the transcript, and spot reply quality issues without switching screens."
        showAllFlowsNote={false}
        surfaceLabelKey="dashboard.conversations.list"
      />
    </main>
  )
}
