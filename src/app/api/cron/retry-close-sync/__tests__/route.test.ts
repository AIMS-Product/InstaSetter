import { describe, it, expect, vi, beforeEach } from 'vitest'

let mockClient: ReturnType<typeof import('@/test/helpers').createMockClient>

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => mockClient),
}))

vi.mock('@/lib/services/sync-lead-to-close', () => ({
  syncLeadToClose: vi.fn(),
}))

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getCloseConfig: vi.fn(() => ({
    CLOSE_API_KEY: 'api_test_xxx',
    CLOSE_BASE_URL: 'https://api.close.com/api/v1',
    CLOSE_LEAD_STATUS_NEW_ID: 'stat_new',
    CLOSE_CUSTOM_FIELD_IDS: {},
    CLOSE_CRON_SECRET: 'cron_secret_xxx',
  })),
}))

import { GET } from '@/app/api/cron/retry-close-sync/route'
import { syncLeadToClose } from '@/lib/services/sync-lead-to-close'
import { getCloseConfig } from '@/lib/config'
import { createMockClient } from '@/test/helpers'

beforeEach(() => {
  vi.clearAllMocks()
  mockClient = createMockClient()
})

function buildRequest(headers: Record<string, string> = {}): Request {
  return new Request(
    'https://insta-setter.vercel.app/api/cron/retry-close-sync',
    {
      method: 'GET',
      headers,
    }
  )
}

describe('GET /api/cron/retry-close-sync', () => {
  it('returns 401 when no authorization header is provided', async () => {
    const res = await GET(buildRequest())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: 'unauthorized' })
    expect(syncLeadToClose).not.toHaveBeenCalled()
  })

  it('returns 401 when authorization header is wrong', async () => {
    const res = await GET(buildRequest({ authorization: 'Bearer wrong_token' }))

    expect(res.status).toBe(401)
    expect(syncLeadToClose).not.toHaveBeenCalled()
  })

  it('returns 401 when CLOSE_CRON_SECRET is unset', async () => {
    vi.mocked(getCloseConfig).mockReturnValueOnce({
      CLOSE_API_KEY: 'api_test_xxx',
      CLOSE_BASE_URL: 'https://api.close.com/api/v1',
      CLOSE_LEAD_STATUS_NEW_ID: 'stat_new',
      CLOSE_CUSTOM_FIELD_IDS: {},
      CLOSE_CRON_SECRET: undefined,
    })

    const res = await GET(
      buildRequest({ authorization: 'Bearer cron_secret_xxx' })
    )

    expect(res.status).toBe(401)
  })

  it('queries leads where close_sync_status=failed AND attempts<24', async () => {
    mockClient.limit.mockResolvedValueOnce({ data: [], error: null })

    const res = await GET(
      buildRequest({ authorization: 'Bearer cron_secret_xxx' })
    )

    expect(res.status).toBe(200)
    expect(mockClient.from).toHaveBeenCalledWith('leads')
    expect(mockClient.eq).toHaveBeenCalledWith('close_sync_status', 'failed')
    expect(mockClient.lt).toHaveBeenCalledWith('close_sync_attempts', 24)
  })

  it('calls syncLeadToClose for each row and reports counts', async () => {
    mockClient.limit.mockResolvedValueOnce({
      data: [
        { id: 'lead-a', close_sync_attempts: 1 },
        { id: 'lead-b', close_sync_attempts: 5 },
        { id: 'lead-c', close_sync_attempts: 0 },
      ],
      error: null,
    })

    vi.mocked(syncLeadToClose)
      .mockResolvedValueOnce({
        success: true,
        closeLeadId: 'lead_close_a',
        created: false,
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'still 503',
        transient: true,
      })
      .mockResolvedValueOnce({
        success: true,
        skipped: true,
        reason: 'flag_off',
      })

    const res = await GET(
      buildRequest({ authorization: 'Bearer cron_secret_xxx' })
    )

    const body = await res.json()
    expect(body).toEqual({
      ok: true,
      attempted: 3,
      succeeded: 1,
      failed: 1,
      skipped: 1,
    })
    expect(syncLeadToClose).toHaveBeenCalledTimes(3)
  })

  it('counts thrown errors as failed without breaking the loop', async () => {
    mockClient.limit.mockResolvedValueOnce({
      data: [
        { id: 'lead-a', close_sync_attempts: 1 },
        { id: 'lead-b', close_sync_attempts: 1 },
      ],
      error: null,
    })

    vi.mocked(syncLeadToClose)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        success: true,
        closeLeadId: 'lead_close_b',
        created: true,
      })

    const res = await GET(
      buildRequest({ authorization: 'Bearer cron_secret_xxx' })
    )
    const body = await res.json()

    expect(body).toEqual({
      ok: true,
      attempted: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
    })
  })

  it('returns 500 when the leads query fails', async () => {
    mockClient.limit.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection refused' },
    })

    const res = await GET(
      buildRequest({ authorization: 'Bearer cron_secret_xxx' })
    )

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, error: 'connection refused' })
  })

  it('limits to 50 rows per tick (cron should not run unbounded)', async () => {
    mockClient.limit.mockResolvedValueOnce({ data: [], error: null })

    await GET(buildRequest({ authorization: 'Bearer cron_secret_xxx' }))

    expect(mockClient.limit).toHaveBeenCalledWith(50)
  })
})
