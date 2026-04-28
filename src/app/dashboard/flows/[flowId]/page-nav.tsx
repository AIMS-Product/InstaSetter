'use client'

import { useRef } from 'react'
import {
  Activity,
  Bot as BotIcon,
  Braces,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { PageId, Palette } from './types'

const ITEMS: Array<{
  id: PageId
  label: string
  description: string
  Icon: LucideIcon
}> = [
  { id: 'flow', label: 'Flow', description: 'Edit the draft', Icon: Workflow },
  {
    id: 'runs',
    label: 'Inbox',
    description: 'Review real chats',
    Icon: Activity,
  },
  {
    id: 'variables',
    label: 'Variables',
    description: 'Check memory',
    Icon: Braces,
  },
  {
    id: 'bot',
    label: 'Bot',
    description: 'Global rules',
    Icon: BotIcon,
  },
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
        width: 132,
        flexShrink: 0,
        background: p.panel,
        borderRight: `1px solid ${p.line}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 10px 12px',
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: p.ink3,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          fontWeight: 700,
          padding: '0 8px',
        }}
      >
        Workspace
      </div>
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
              width: '100%',
              minHeight: 58,
              padding: '10px 12px',
              borderRadius: 14,
              border: `1px solid ${active ? p.line : 'transparent'}`,
              background: active ? p.sel : 'transparent',
              color: active ? p.ink : p.ink2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              boxShadow: active ? '0 8px 18px rgba(22,21,40,0.05)' : 'none',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                background: active ? p.accentSoft : p.lineSoft,
                color: active ? p.accentInk : p.ink3,
                flexShrink: 0,
              }}
            >
              <Icon aria-hidden size={14} strokeWidth={1.8} />
            </span>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>{it.label}</span>
              <span
                style={{
                  fontSize: 10.5,
                  color: active ? p.ink2 : p.ink3,
                  lineHeight: 1.35,
                }}
              >
                {it.description}
              </span>
            </span>
          </button>
        )
      })}
      <div
        style={{
          marginTop: 'auto',
          padding: '10px 10px 0',
          fontSize: 10.5,
          lineHeight: 1.45,
          color: p.ink3,
        }}
      >
        Shared draft workspace.
      </div>
    </div>
  )
}
