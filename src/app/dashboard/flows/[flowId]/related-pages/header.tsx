'use client'

import { SERIF_FAMILY, SANS_FAMILY } from '../shared-data'
import type { Palette } from '../types'

export default function RPHeader({
  p,
  title,
  eyebrow,
  right,
}: {
  p: Palette
  title: string
  eyebrow: string
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '24px 32px 18px',
        borderBottom: `1px solid ${p.line}`,
        background: p.panel,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            color: p.ink3,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 500,
            color: p.ink,
            letterSpacing: -0.3,
            fontFamily: p.serif ? SERIF_FAMILY : SANS_FAMILY,
          }}
        >
          {title}
        </h1>
      </div>
      {right}
    </div>
  )
}
