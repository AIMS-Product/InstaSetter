import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

import { headers } from 'next/headers'
import { assertDashboardActionAuthorized } from '@/lib/dashboard-action-auth'

function basic(value: string): string {
  return `Basic ${btoa(value)}`
}

describe('assertDashboardActionAuthorized', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('allows local actions when dashboard auth is not configured', async () => {
    await expect(assertDashboardActionAuthorized()).resolves.toBeUndefined()
    expect(headers).not.toHaveBeenCalled()
  })

  it('rejects actions when configured credentials are missing from the request', async () => {
    vi.stubEnv('DASHBOARD_BASIC_AUTH_USERNAME', 'operator')
    vi.stubEnv('DASHBOARD_BASIC_AUTH_PASSWORD', 'secret')
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers() as Awaited<ReturnType<typeof headers>>
    )

    await expect(assertDashboardActionAuthorized()).rejects.toThrow(
      /Unauthorized/
    )
  })

  it('allows actions when configured credentials are present', async () => {
    vi.stubEnv('DASHBOARD_BASIC_AUTH_USERNAME', 'operator')
    vi.stubEnv('DASHBOARD_BASIC_AUTH_PASSWORD', 'secret')
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({
        authorization: basic('operator:secret'),
      }) as Awaited<ReturnType<typeof headers>>
    )

    await expect(assertDashboardActionAuthorized()).resolves.toBeUndefined()
  })
})
