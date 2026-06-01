import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { config, proxy } from '@/proxy'
import { updateSession } from '@/lib/supabase/proxy'

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(),
}))

const mockedUpdateSession = vi.mocked(updateSession)

const DASHBOARD_MATCHER =
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks).*)'

// The Next.js proxy matcher uses a negative lookahead string. Keep this test
// conversion narrow so assertions still exercise the exported config literal.
function matcherPattern() {
  const [matcher] = config.matcher
  return new RegExp(`^${matcher.replaceAll('/', '\\/')}$`)
}

function request(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

describe('middleware webhook exclusion', () => {
  it('exports the expected proxy matcher literal', () => {
    expect(config).toEqual({
      matcher: [DASHBOARD_MATCHER],
    })
  })

  it('excludes /api/webhooks/sendpulse', () => {
    expect(matcherPattern().test('/api/webhooks/sendpulse')).toBe(false)
  })

  it('excludes /api/webhooks/stripe', () => {
    expect(matcherPattern().test('/api/webhooks/stripe')).toBe(false)
  })

  it('excludes /api/webhooks/ (trailing slash)', () => {
    expect(matcherPattern().test('/api/webhooks/')).toBe(false)
  })

  it('does NOT exclude /dashboard', () => {
    expect(matcherPattern().test('/dashboard')).toBe(true)
  })

  it('does NOT exclude nested dashboard paths', () => {
    expect(matcherPattern().test('/dashboard/runs/123')).toBe(true)
  })

  it('does NOT exclude /api/other', () => {
    expect(matcherPattern().test('/api/other')).toBe(true)
  })

  it('does NOT exclude root /', () => {
    expect(matcherPattern().test('/')).toBe(true)
  })

  it('excludes public image assets', () => {
    expect(matcherPattern().test('/logo.svg')).toBe(false)
    expect(matcherPattern().test('/assets/screenshot.webp')).toBe(false)
  })
})

describe('proxy', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('refreshes the session for dashboard routes', async () => {
    const updateResponse = new NextResponse('session refreshed')
    mockedUpdateSession.mockResolvedValueOnce(updateResponse)
    const proxiedRequest = request('/dashboard')

    const response = await proxy(proxiedRequest)

    expect(response).toBe(updateResponse)
    expect(mockedUpdateSession).toHaveBeenCalledWith(proxiedRequest)
  })

  it('fails closed for production dashboard routes when basic auth is not configured', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    const response = await proxy(request('/dashboard'))

    expect(response.status).toBe(503)
    expect(mockedUpdateSession).not.toHaveBeenCalled()
  })

  it('rejects dashboard routes when configured basic auth is missing', async () => {
    vi.stubEnv('DASHBOARD_BASIC_AUTH_USERNAME', 'operator')
    vi.stubEnv('DASHBOARD_BASIC_AUTH_PASSWORD', 'secret')

    const response = await proxy(request('/dashboard'))

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toContain('Basic')
    expect(mockedUpdateSession).not.toHaveBeenCalled()
  })

  it('allows dashboard routes when configured basic auth is valid', async () => {
    vi.stubEnv('DASHBOARD_BASIC_AUTH_USERNAME', 'operator')
    vi.stubEnv('DASHBOARD_BASIC_AUTH_PASSWORD', 'secret')
    const updateResponse = new NextResponse('session refreshed')
    mockedUpdateSession.mockResolvedValueOnce(updateResponse)
    const proxiedRequest = request('/dashboard')
    proxiedRequest.headers.set(
      'authorization',
      `Basic ${btoa('operator:secret')}`
    )

    const response = await proxy(proxiedRequest)

    expect(response).toBe(updateResponse)
    expect(mockedUpdateSession).toHaveBeenCalledWith(proxiedRequest)
  })
})
