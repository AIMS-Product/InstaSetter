'use client'

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
  return (
    <div
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
            type="button"
            onClick={() => onChange(it.id)}
            title={it.label}
            aria-label={it.label}
            aria-current={active ? 'page' : undefined}
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
