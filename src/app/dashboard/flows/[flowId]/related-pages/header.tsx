'use client'

import { SurfaceBadge } from '@/components/ui/surface-badge'
import {
  getSurfaceLabel,
  type SurfaceLabelKey,
} from '@/lib/dashboard/surface-labels'
import { SERIF_FAMILY, SANS_FAMILY } from '../shared-data'
import type { Palette } from '../types'

export default function RPHeader({
  p,
  title,
  eyebrow,
  description,
  right,
  surfaceLabelKey,
}: {
  p: Palette
  title: string
  eyebrow: string
  description?: React.ReactNode
  right?: React.ReactNode
  surfaceLabelKey?: SurfaceLabelKey
}) {
  const surface = surfaceLabelKey ? getSurfaceLabel(surfaceLabelKey) : null
  return (
    <div
      className="related-page-header"
      style={{
        padding: '24px 32px 18px',
        borderBottom: `1px solid ${p.line}`,
        background: p.panel,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: p.ink3,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </span>
          {surface && (
            <SurfaceBadge
              state={surface.state}
              display={surface.display}
              detail={surface.detail}
            />
          )}
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
        {description && (
          <div
            style={{
              marginTop: 8,
              maxWidth: 720,
              fontSize: 13.5,
              color: p.ink2,
              lineHeight: 1.6,
            }}
          >
            {description}
          </div>
        )}
      </div>
      {right}
    </div>
  )
}
