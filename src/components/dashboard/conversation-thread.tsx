import { StatusBadge } from '@/components/dashboard/status-badge'
import { MessageBubble } from '@/components/dashboard/message-bubble'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationDetail } from '@/types/dashboard'

export function ConversationThread({
  conversation,
}: {
  conversation: ConversationDetail
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          @{conversation.instagramHandle}
        </h2>
        {conversation.contactName && (
          <span className="text-sm text-muted-foreground">
            {conversation.contactName}
          </span>
        )}
        <StatusBadge status={conversation.status} variant="conversation" />
      </div>

      <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
        <span>Prompt: {conversation.promptVersion}</span>
        <span>
          Started: {new Date(conversation.startedAt).toLocaleDateString()}
        </span>
        {conversation.endedAt && (
          <span>
            Ended: {new Date(conversation.endedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {conversation.summary && (
        <div className="mt-4 rounded-xl border bg-muted/50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Summary
          </p>
          <p className="mt-1.5 text-[13px] text-foreground/80 leading-relaxed">
            {conversation.summary}
          </p>
        </div>
      )}

      {conversation.flaggedReason && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-rose-600">
            Flagged
          </p>
          <p className="mt-1.5 text-[13px] text-rose-700 leading-relaxed">
            {conversation.flaggedReason}
          </p>
        </div>
      )}

      <div className="my-5 h-px bg-border" />

      <ScrollArea className="flex-1">
        <div className="space-y-3 pb-4">
          {conversation.messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              createdAt={m.createdAt}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
