import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { dashboardAuthGate } from '@/proxy'

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(),
}))

// The Next.js middleware matcher from src/proxy.ts uses a negative lookahead
// regex to exclude certain paths from session refresh processing.
// We convert it to a standard RegExp to verify the exclusion behavior.
const MATCHER_PATTERN =
  /^\/((?!_next\/static|_next\/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$|api\/webhooks).*)$/

describe('middleware webhook exclusion', () => {
  it('excludes /api/webhooks/sendpulse', () => {
    expect(MATCHER_PATTERN.test('/api/webhooks/sendpulse')).toBe(false)
  })

  it('excludes /api/webhooks/stripe', () => {
    expect(MATCHER_PATTERN.test('/api/webhooks/stripe')).toBe(false)
  })

  it('excludes /api/webhooks/ (trailing slash)', () => {
    expect(MATCHER_PATTERN.test('/api/webhooks/')).toBe(false)
  })

  it('does NOT exclude /dashboard', () => {
    expect(MATCHER_PATTERN.test('/dashboard')).toBe(true)
  })

  it('does NOT exclude /api/other', () => {
    expect(MATCHER_PATTERN.test('/api/other')).toBe(true)
  })

  it('does NOT exclude root /', () => {
    expect(MATCHER_PATTERN.test('/')).toBe(true)
  })
})

describe('dashboardAuthGate', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  it('skips auth locally when dashboard credentials are absent', () => {
    Object.assign(process.env, { NODE_ENV: 'development' })
    delete process.env['VERCEL_ENV']
    delete process.env['DASHBOARD_AUTH_USER']
    delete process.env['DASHBOARD_AUTH_PASSWORD']

    const response = dashboardAuthGate(
      new NextRequest('http://localhost/dashboard')
    )

    expect(response).toBeNull()
  })

  it('fails closed in deployed environments when credentials are absent', () => {
    process.env['VERCEL_ENV'] = 'production'
    delete process.env['DASHBOARD_AUTH_USER']
    delete process.env['DASHBOARD_AUTH_PASSWORD']

    const response = dashboardAuthGate(
      new NextRequest('http://localhost/dashboard')
    )

    expect(response?.status).toBe(503)
  })

  it('allows valid dashboard basic auth', () => {
    process.env['VERCEL_ENV'] = 'production'
    process.env['DASHBOARD_AUTH_USER'] = 'operator'
    process.env['DASHBOARD_AUTH_PASSWORD'] = 'secret'

    const response = dashboardAuthGate(
      new NextRequest('http://localhost/dashboard', {
        headers: {
          authorization: `Basic ${btoa('operator:secret')}`,
        },
      })
    )

    expect(response).toBeNull()
  })
})
