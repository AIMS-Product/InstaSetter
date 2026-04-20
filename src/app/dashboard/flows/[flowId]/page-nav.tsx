'use client'

import { useRef } from 'react'
import {
  Activity,
  Bot as BotIcon,
  Braces,
  History,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { PageId, Palette } from './types'

const ITEMS: Array<{ id: PageId; label: string; Icon: LucideIcon }> = [
  { id: 'flow', label: 'Flow', Icon: Workflow },
  { id: 'runs', label: 'Runs', Icon: Activity },
  { id: 'variables', label: 'Variables', Icon: Braces },
  { id: 'versions', label: 'Versions', Icon: History },
  { id: 'bot', label: 'Bot', Icon: BotIcon },
]

export default function PageNav({
  p,
  page,
  onChange,
}: {
  p: Palette
  page: PageId
  onChange: (id: PageId) => void
}) {
  // One button ref per tab so arrow keys can move focus. Roving tabindex
  // means only the active tab is in the tab order — arrow keys walk the rest.
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const currentIndex = ITEMS.findIndex((x) => x.id === page)

  const focusTab = (i: number) => {
    const wrapped = (i + ITEMS.length) % ITEMS.length
    const id = ITEMS[wrapped]!.id
    onChange(id)
    refs.current[id]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        focusTab(currentIndex + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        focusTab(currentIndex - 1)
        break
      case 'Home':
        e.preventDefault()
        focusTab(0)
        break
      case 'End':
        e.preventDefault()
        focusTab(ITEMS.length - 1)
        break
    }
  }

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label="Flow builder sections"
      onKeyDown={onKeyDown}
      style={{
        width: 64,
        flexShrink: 0,
        background: p.panel,
        borderRight: `1px solid ${p.line}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
      }}
    >
      {ITEMS.map((it) => {
        const active = page === it.id
        const Icon = it.Icon
        return (
          <button
            key={it.id}
            ref={(el) => {
              refs.current[it.id] = el
            }}
            type="button"
            role="tab"
            id={`flow-builder-tab-${it.id}`}
            aria-controls={`flow-builder-panel-${it.id}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.id)}
            title={it.label}
            aria-label={it.label}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: 'none',
              background: active ? p.sel : 'transparent',
              color: active ? p.ink : p.ink3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              marginBottom: 3,
              cursor: 'pointer',
            }}
          >
            <Icon aria-hidden size={15} strokeWidth={1.75} />
            <span style={{ fontSize: 9, fontWeight: 500 }}>{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}
