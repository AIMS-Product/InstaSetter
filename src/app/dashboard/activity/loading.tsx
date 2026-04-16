import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
    </div>
  )
}
