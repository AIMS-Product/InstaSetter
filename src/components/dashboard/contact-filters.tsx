'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CONTACT_SOURCES } from '@/types/enums'

export function ContactFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSearch = searchParams.get('search') ?? ''
  const currentSource = searchParams.get('source') ?? 'all'
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  function pushParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page')
    router.push(`/dashboard/contacts?${params.toString()}`)
  }

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams('search', e.target.value)
    }, 400)
  }

  return (
    <div className="flex items-center gap-3">
      <Input
        placeholder="Search handle or name..."
        defaultValue={currentSearch}
        onChange={onSearchChange}
        className="w-[240px]"
      />
      <Select
        value={currentSource}
        onValueChange={(v) => v && pushParams('source', v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {CONTACT_SOURCES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
