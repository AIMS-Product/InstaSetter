import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SURFACE_LABELS,
  SURFACE_LABEL_KEYS,
  SURFACE_LABEL_STATES,
  getSurfaceLabel,
} from '../surface-labels'

const DASHBOARD_DIR = path.resolve(__dirname, '../../../app/dashboard')

function listDashboardPages(dir: string, parents: string[] = []): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route groups `(group)/` exist for layout only; their nested pages still
      // resolve at the same URL path, so collapse them when building the route.
      const isRouteGroup =
        entry.name.startsWith('(') && entry.name.endsWith(')')
      const segment = isRouteGroup ? null : entry.name
      const nextParents = segment ? [...parents, segment] : parents
      out.push(...listDashboardPages(path.join(dir, entry.name), nextParents))
      continue
    }
    if (entry.isFile() && entry.name === 'page.tsx') {
      out.push(`/dashboard${parents.length ? `/${parents.join('/')}` : ''}`)
    }
  }
  return out
}

describe('SURFACE_LABELS catalog', () => {
  it('exposes the four canonical states', () => {
    expect(SURFACE_LABEL_STATES).toEqual([
      'LIVE',
      'READ_ONLY',
      'COMING_SOON',
      'UNDER_CONSTRUCTION',
    ])
  })

  it('keys match the catalog map exactly', () => {
    expect([...SURFACE_LABEL_KEYS].sort()).toEqual(
      Object.keys(SURFACE_LABELS).sort()
    )
  })

  it('every entry has the required fields', () => {
    for (const key of SURFACE_LABEL_KEYS) {
      const label = SURFACE_LABELS[key]
      expect(label, `entry for ${key}`).toBeDefined()
      expect(label.key, `${key}.key`).toBe(key)
      expect(label.display.trim().length, `${key}.display`).toBeGreaterThan(0)
      expect(label.detail.trim().length, `${key}.detail`).toBeGreaterThan(0)
      expect(SURFACE_LABEL_STATES).toContain(label.state)
      expect(label.routes.length, `${key}.routes`).toBeGreaterThan(0)
    }
  })

  it('detail copy never leaks "Week N" sequencing language', () => {
    for (const key of SURFACE_LABEL_KEYS) {
      const detail = SURFACE_LABELS[key].detail
      expect(detail, `${key}.detail`).not.toMatch(/Week \d/)
      // Hard substring check per spec: any "Week " token is banned outright.
      expect(detail, `${key}.detail`).not.toContain('Week ')
    }
  })

  it('display copy never leaks "Week N" sequencing language', () => {
    for (const key of SURFACE_LABEL_KEYS) {
      const display = SURFACE_LABELS[key].display
      expect(display, `${key}.display`).not.toContain('Week ')
    }
  })

  it('getSurfaceLabel returns the catalog entry for known keys', () => {
    for (const key of SURFACE_LABEL_KEYS) {
      const fromHelper = getSurfaceLabel(key)
      expect(fromHelper).toBe(SURFACE_LABELS[key])
    }
  })

  it('getSurfaceLabel throws for unknown keys', () => {
    expect(() => getSurfaceLabel('does.not.exist')).toThrow()
  })
})

describe('SURFACE_LABELS route coverage', () => {
  it('every page.tsx under /dashboard maps to at least one catalog entry', () => {
    const pages = listDashboardPages(DASHBOARD_DIR)
    expect(pages.length).toBeGreaterThan(0)

    const claimedRoutes = new Set<string>()
    for (const key of SURFACE_LABEL_KEYS) {
      for (const route of SURFACE_LABELS[key].routes) {
        claimedRoutes.add(route)
      }
    }

    const unmapped = pages.filter((page) => !claimedRoutes.has(page))
    expect(unmapped, 'pages without a SURFACE_LABELS entry').toEqual([])
  })

  it('every catalog route corresponds to a real page', () => {
    const pages = new Set(listDashboardPages(DASHBOARD_DIR))
    for (const key of SURFACE_LABEL_KEYS) {
      for (const route of SURFACE_LABELS[key].routes) {
        expect(
          pages.has(route),
          `route ${route} from catalog entry ${key} has no matching page.tsx`
        ).toBe(true)
      }
    }
  })
})
