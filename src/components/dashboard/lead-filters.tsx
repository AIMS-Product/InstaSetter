'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QUALIFICATION_STATUSES } from '@/types/enums'

export function LeadFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get('status') ?? 'all'
  const currentBooked = searchParams.get('booked') ?? 'all'

  function updateFilter(key: string, value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page')
    router.push(`/dashboard/leads?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        value={currentStatus}
        onValueChange={(v) => updateFilter('status', v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All temps" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All temps</SelectItem>
          {QUALIFICATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentBooked}
        onValueChange={(v) => updateFilter('booked', v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Call booked" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All bookings</SelectItem>
          <SelectItem value="true">Call booked</SelectItem>
          <SelectItem value="false">Not booked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
