'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { CloseHandoffWindow } from '@/lib/services/dashboard-metrics'

interface Props {
  value: CloseHandoffWindow
}

const OPTIONS: Array<{ value: CloseHandoffWindow; label: string }> = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
]

const DEFAULT_WINDOW: CloseHandoffWindow = 'this_week'

/**
 * Tiny client island for the Close handoff tile's window selector.
 *
 * Updates the URL search param via `router.replace`, which (a) keeps the
 * dashboard shareable per `~/.claude/rules/nextjs.md` ("Prefer URL state")
 * and (b) re-renders the parent Server Component with fresh metrics. The
 * default window is stripped from the URL to keep it clean.
 */
export function CloseHandoffWindowSelect({ value }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as CloseHandoffWindow
    const params = new URLSearchParams(
      typeof window === 'undefined' ? '' : window.location.search
    )
    if (next === DEFAULT_WINDOW) {
      params.delete('window')
    } else {
      params.set('window', next)
    }
    const qs = params.toString()
    const path =
      typeof window === 'undefined' ? '/dashboard' : window.location.pathname
    const nextUrl = qs ? `${path}?${qs}` : path

    startTransition(() => {
      router.replace(nextUrl)
    })
  }

  return (
    <label className="flex items-center gap-2 text-[11px] text-[#6B6A7E]">
      <span className="sr-only">Window</span>
      <select
        aria-label="Window"
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-[#EEEFF3] bg-white px-2 py-1 text-[11px] font-medium text-[#161528] focus:border-[#4F46BA] focus:outline-none focus:ring-1 focus:ring-[#4F46BA] disabled:opacity-50"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
