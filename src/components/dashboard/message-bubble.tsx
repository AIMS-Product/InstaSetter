import { cn } from '@/lib/utils'
import { RelativeTime } from '@/components/dashboard/relative-time'

export function MessageBubble({
  role,
  content,
  createdAt,
}: {
  role: string
  content: string
  createdAt: string
}) {
  const isAssistant = role === 'assistant'

  return (
    <div className={cn('flex', isAssistant ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isAssistant
            ? 'bg-primary/10 text-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
          {content}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          <RelativeTime date={createdAt} />
        </p>
      </div>
    </div>
  )
}
