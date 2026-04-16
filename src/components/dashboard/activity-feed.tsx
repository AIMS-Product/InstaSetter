import { ActivityFeedItem } from '@/components/dashboard/activity-feed-item'
import { EmptyState } from '@/components/dashboard/empty-state'
import type { ActivityItem } from '@/types/dashboard'

export function ActivityFeed({ events }: { events: ActivityItem[] }) {
  if (events.length === 0) {
    return <EmptyState title="No activity yet" />
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <ActivityFeedItem key={event.id} event={event} />
      ))}
    </div>
  )
}
