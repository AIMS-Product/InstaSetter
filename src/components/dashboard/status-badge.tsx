'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const CONVERSATION_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-sky-50 text-sky-700 border-sky-200',
  stalled: 'bg-amber-50 text-amber-700 border-amber-200',
  escalated: 'bg-rose-50 text-rose-700 border-rose-200',
}

const LEAD_COLORS: Record<string, string> = {
  hot: 'bg-rose-50 text-rose-700 border-rose-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-sky-50 text-sky-700 border-sky-200',
}

const EVENT_COLORS: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
}

const COLOR_MAPS = {
  conversation: CONVERSATION_COLORS,
  lead: LEAD_COLORS,
  event: EVENT_COLORS,
} as const

export function StatusBadge({
  status,
  variant = 'conversation',
}: {
  status: string
  variant?: 'conversation' | 'lead' | 'event'
}) {
  const colors = COLOR_MAPS[variant][status] ?? ''

  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium capitalize', colors)}
    >
      {status}
    </Badge>
  )
}
