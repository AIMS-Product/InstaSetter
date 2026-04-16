import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationsLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-56" />
      <Skeleton className="mb-4 h-10 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>
    </div>
  )
}
