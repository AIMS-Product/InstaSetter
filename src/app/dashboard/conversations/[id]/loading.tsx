import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationDetailLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="mb-2 h-6 w-64" />
      <Skeleton className="mb-6 h-4 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}
          >
            <Skeleton className="h-16 w-3/5 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
