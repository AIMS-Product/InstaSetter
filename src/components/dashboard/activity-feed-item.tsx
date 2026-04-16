'use client'

import { StatusBadge } from '@/components/dashboard/status-badge'
import { RelativeTime } from '@/components/dashboard/relative-time'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { AlertCircle } from 'lucide-react'
import type { ActivityItem } from '@/types/dashboard'

export function ActivityFeedItem({ event }: { event: ActivityItem }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-3.5 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium capitalize text-foreground">
            {event.action.replace('_', ' ')}
          </span>
          <StatusBadge status={event.status} variant="event" />
          {event.errorMessage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{event.errorMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
          <span className="capitalize">
            {event.integration.replace('_', ' ')}
          </span>
          {event.instagramHandle && <span>@{event.instagramHandle}</span>}
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        <RelativeTime date={event.createdAt} />
      </div>
    </div>
  )
}
