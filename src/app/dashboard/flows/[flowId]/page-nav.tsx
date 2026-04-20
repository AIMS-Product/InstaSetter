'use client'

import type { PageId, Palette } from './types'

const ITEMS: Array<{ id: PageId; label: string; icon: string }> = [
  { id: 'flow', label: 'Flow', icon: '⎔' },
  { id: 'runs', label: 'Runs', icon: '◉' },
  { id: 'variables', label: 'Variables', icon: '∥' },
  { id: 'versions', label: 'Versions', icon: '⟳' },
  { id: 'bot', label: 'Bot', icon: '◐' },
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
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            title={it.label}
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
            <span style={{ fontSize: 15 }}>{it.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 500 }}>{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}
