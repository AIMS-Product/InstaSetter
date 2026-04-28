import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { config, dashboardAuthGate, proxy } from '@/proxy'
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

function request(path: string, authorization?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: authorization ? { authorization } : undefined,
  })
}

function basicAuth(value: string) {
  return `Basic ${btoa(value)}`
}

function configureDashboardEnv(
  env: {
    vercelEnv?: string
    nodeEnv?: string
    user?: string
    password?: string
  } = {}
) {
  delete process.env['VERCEL_ENV']
  delete process.env['DASHBOARD_AUTH_USER']
  delete process.env['DASHBOARD_AUTH_PASSWORD']
  Object.assign(process.env, {
    NODE_ENV: env.nodeEnv ?? 'development',
  })
  if (env.vercelEnv !== undefined) process.env['VERCEL_ENV'] = env.vercelEnv
  if (env.user !== undefined) process.env['DASHBOARD_AUTH_USER'] = env.user
  if (env.password !== undefined) {
    process.env['DASHBOARD_AUTH_PASSWORD'] = env.password
  }
}

async function expectAuthChallenge(response: Response | null) {
  expect(response).not.toBeNull()
  expect(response?.status).toBe(401)
  expect(response?.headers.get('WWW-Authenticate')).toBe(
    'Basic realm="InstaSetter Dashboard", charset="UTF-8"'
  )
  expect(response?.headers.get('Content-Type')).toBe(
    'text/plain; charset=utf-8'
  )
  await expect(response?.text()).resolves.toBe('Authentication required')
}

async function expectConfigFailure(response: Response | null) {
  expect(response).not.toBeNull()
  expect(response?.status).toBe(503)
  expect(response?.headers.get('Content-Type')).toBe(
    'text/plain; charset=utf-8'
  )
  await expect(response?.text()).resolves.toBe(
    'Dashboard authentication is not configured'
  )
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

describe('dashboardAuthGate', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  it('skips auth locally when dashboard credentials are absent', () => {
    configureDashboardEnv()

    const response = dashboardAuthGate(request('/dashboard'))

    expect(response).toBeNull()
  })

  it('does not gate non-dashboard paths when credentials are absent in production', () => {
    configureDashboardEnv({ vercelEnv: 'production' })

    const response = dashboardAuthGate(request('/settings'))

    expect(response).toBeNull()
  })

  it('fails closed in production when credentials are absent', async () => {
    configureDashboardEnv({ vercelEnv: 'production' })

    const response = dashboardAuthGate(request('/dashboard'))

    await expectConfigFailure(response)
  })

  it('fails closed in preview when credentials are absent', async () => {
    configureDashboardEnv({ vercelEnv: 'preview' })

    const response = dashboardAuthGate(request('/dashboard'))

    await expectConfigFailure(response)
  })

  it('fails closed when NODE_ENV is production and VERCEL_ENV is absent', async () => {
    configureDashboardEnv({ nodeEnv: 'production' })

    const response = dashboardAuthGate(request('/dashboard'))

    await expectConfigFailure(response)
  })

  it('fails closed in production when only the username is configured', async () => {
    configureDashboardEnv({ vercelEnv: 'production', user: 'operator' })

    const response = dashboardAuthGate(request('/dashboard'))

    await expectConfigFailure(response)
  })

  it('fails closed in production when only the password is configured', async () => {
    configureDashboardEnv({ vercelEnv: 'production', password: 'secret' })

    const response = dashboardAuthGate(request('/dashboard'))

    await expectConfigFailure(response)
  })

  it('challenges nested dashboard paths when credentials are configured', async () => {
    configureDashboardEnv({
      vercelEnv: 'production',
      user: 'operator',
      password: 'secret',
    })

    const response = dashboardAuthGate(request('/dashboard/runs/123'))

    await expectAuthChallenge(response)
  })

  it('allows valid dashboard basic auth', () => {
    configureDashboardEnv({
      vercelEnv: 'production',
      user: 'operator',
      password: 'secret',
    })

    const response = dashboardAuthGate(
      request('/dashboard', basicAuth('operator:secret'))
    )

    expect(response).toBeNull()
  })

  it.each([
    ['missing authorization header', undefined],
    ['non-basic authorization scheme', 'Bearer token'],
    ['malformed basic payload', 'Basic not-base64'],
    ['username without separator', basicAuth('operator')],
    ['password without username', basicAuth(':secret')],
    ['wrong username', basicAuth('other:secret')],
    ['wrong password', basicAuth('operator:wrong')],
  ])('challenges invalid Basic auth: %s', async (_caseName, authorization) => {
    configureDashboardEnv({
      vercelEnv: 'production',
      user: 'operator',
      password: 'secret',
    })

    const response = dashboardAuthGate(request('/dashboard', authorization))

    await expectAuthChallenge(response)
  })
})

describe('proxy', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(process.env)) {
      delete process.env[key]
    }
    Object.assign(process.env, originalEnv)
  })

  it('returns the dashboard auth response without refreshing the session', async () => {
    configureDashboardEnv({
      vercelEnv: 'production',
      user: 'operator',
      password: 'secret',
    })

    const response = await proxy(request('/dashboard'))

    await expectAuthChallenge(response)
    expect(mockedUpdateSession).not.toHaveBeenCalled()
  })

  it('refreshes the session when dashboard auth passes', async () => {
    configureDashboardEnv({
      vercelEnv: 'production',
      user: 'operator',
      password: 'secret',
    })
    const updateResponse = new NextResponse('session refreshed')
    mockedUpdateSession.mockResolvedValueOnce(updateResponse)
    const proxiedRequest = request('/dashboard', basicAuth('operator:secret'))

    const response = await proxy(proxiedRequest)

    expect(response).toBe(updateResponse)
    expect(mockedUpdateSession).toHaveBeenCalledWith(proxiedRequest)
  })
})
