import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
    CLOSE_CRON_SECRET: 'cron_secret',
  })),
}))

import {
  pushLeadToClose,
  findCloseLeadByEmail,
  _setSleepImpl,
} from '@/lib/services/close-crm'
import { getCloseConfig } from '@/lib/config'
import type { CloseLeadPayload } from '@/lib/services/close-crm-payload'

const fetchSpy = vi.fn<typeof fetch>()

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function networkErrorOnce() {
  return Promise.reject(new Error('ECONNRESET'))
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = fetchSpy
  // Don't really sleep in unit tests.
  _setSleepImpl(async () => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

const samplePayload: CloseLeadPayload = {
  name: '@jess.va',
  contacts: [
    {
      name: '@jess.va',
      emails: [{ email: 'jess@example.com', type: 'office' }],
    },
  ],
}

describe('findCloseLeadByEmail', () => {
  it('uses Basic auth with the api key as username and blank password', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: [] }))

    await findCloseLeadByEmail('jess@example.com')

    const call = fetchSpy.mock.calls[0]
    expect(call?.[0]).toBe('https://api.close.com/api/v1/data/search/')
    const init = call?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    // base64('api_test_xxx:') === 'YXBpX3Rlc3RfeHh4Og=='
    expect(headers.Authorization).toBe('Basic YXBpX3Rlc3RfeHh4Og==')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('sends the documented Advanced Filtering body shape for has_related contact_email', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: [] }))

    await findCloseLeadByEmail('jess@example.com')

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body.query.type).toBe('and')
    expect(body.query.queries[0]).toEqual({
      type: 'object_type',
      object_type: 'lead',
    })
    expect(body.query.queries[1]).toMatchObject({
      type: 'has_related',
      this_object_type: 'lead',
      related_object_type: 'contact_email',
      related_query: {
        condition: { value: 'jess@example.com' },
      },
    })
  })

  it('returns the first match leadId when Close returns hits', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { data: [{ id: 'lead_abc' }, { id: 'lead_xyz' }] })
    )

    const result = await findCloseLeadByEmail('jess@example.com')

    expect(result).toEqual({ found: true, leadId: 'lead_abc' })
  })

  it('returns not-found when Close returns no hits', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, { data: [] }))

    const result = await findCloseLeadByEmail('jess@example.com')

    expect(result).toEqual({ found: false })
  })

  it('surfaces missing_api_key as a permanent error', async () => {
    vi.mocked(getCloseConfig).mockReturnValueOnce({
      CLOSE_API_KEY: undefined,
      CLOSE_BASE_URL: 'https://api.close.com/api/v1',
      CLOSE_LEAD_STATUS_NEW_ID: undefined,
      CLOSE_CUSTOM_FIELD_IDS: {},
      CLOSE_CRON_SECRET: undefined,
    })

    const result = await findCloseLeadByEmail('jess@example.com')

    expect(result).toEqual({
      error: 'missing_api_key',
      transient: false,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('surfaces 401 as permanent', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, { error: 'invalid api key' })
    )

    const result = await findCloseLeadByEmail('jess@example.com')

    expect(result).toMatchObject({
      error: 'invalid api key',
      status: 401,
      transient: false,
    })
  })
})

describe('pushLeadToClose', () => {
  it('issues POST /api/v1/lead/ on no-match', async () => {
    fetchSpy
      // search
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      // create
      .mockResolvedValueOnce(jsonResponse(201, { id: 'lead_new1' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toEqual({
      success: true,
      closeLeadId: 'lead_new1',
      created: true,
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://api.close.com/api/v1/lead/'
    )
    const init = fetchSpy.mock.calls[1]?.[1] as RequestInit
    expect(init.method).toBe('POST')
  })

  it('issues PUT /api/v1/lead/{id}/ on match', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse(200, { data: [{ id: 'lead_existing' }] })
      )
      .mockResolvedValueOnce(jsonResponse(200, { id: 'lead_existing' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toEqual({
      success: true,
      closeLeadId: 'lead_existing',
      created: false,
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://api.close.com/api/v1/lead/lead_existing/'
    )
    const init = fetchSpy.mock.calls[1]?.[1] as RequestInit
    expect(init.method).toBe('PUT')
  })

  it('retries 5xx with exponential backoff and succeeds on retry', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(jsonResponse(500, { error: 'server burped' }))
      .mockResolvedValueOnce(jsonResponse(201, { id: 'lead_retry' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toEqual({
      success: true,
      closeLeadId: 'lead_retry',
      created: true,
    })
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('retries 429 honouring retry-after header', async () => {
    const sleepSpy = vi.fn(async () => {})
    _setSleepImpl(sleepSpy)

    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(
        jsonResponse(429, { error: 'too many' }, { 'retry-after': '2' })
      )
      .mockResolvedValueOnce(jsonResponse(201, { id: 'lead_429' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toMatchObject({ success: true })
    // retry-after: 2 → 2000ms passed to the sleep impl.
    expect(sleepSpy).toHaveBeenCalledWith(2000)
  })

  it('falls back to RateLimit reset when retry-after is absent', async () => {
    const sleepSpy = vi.fn(async () => {})
    _setSleepImpl(sleepSpy)

    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(
        jsonResponse(
          429,
          { error: 'too many' },
          {
            ratelimit: 'limit=100, remaining=0, reset=1.5',
          }
        )
      )
      .mockResolvedValueOnce(jsonResponse(201, { id: 'lead_rl' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toMatchObject({ success: true })
    expect(sleepSpy).toHaveBeenCalledWith(1500)
  })

  it('returns transient=true after 5 attempts of 5xx', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      // 5 consecutive 500s on the create call.
      .mockResolvedValue(jsonResponse(500, { error: 'still burping' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toMatchObject({
      success: false,
      transient: true,
      status: 500,
    })
  })

  it('returns transient=false on 400-class errors immediately', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(jsonResponse(400, { error: 'bad payload' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toMatchObject({
      success: false,
      transient: false,
      status: 400,
      error: 'bad payload',
    })
  })

  it('treats network errors as transient and retries', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockImplementationOnce(() => networkErrorOnce())
      .mockResolvedValueOnce(jsonResponse(201, { id: 'lead_after_net' }))

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toMatchObject({
      success: true,
      closeLeadId: 'lead_after_net',
    })
  })

  it('skips Close calls when API key is missing', async () => {
    vi.mocked(getCloseConfig).mockReturnValueOnce({
      CLOSE_API_KEY: undefined,
      CLOSE_BASE_URL: 'https://api.close.com/api/v1',
      CLOSE_LEAD_STATUS_NEW_ID: undefined,
      CLOSE_CUSTOM_FIELD_IDS: {},
      CLOSE_CRON_SECRET: undefined,
    })

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toEqual({
      success: false,
      error: 'missing_api_key',
      transient: false,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('treats a missing id on a 200 create response as a permanent error', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(jsonResponse(200, {})) // no id

    const result = await pushLeadToClose({
      email: 'jess@example.com',
      payload: samplePayload,
    })

    expect(result).toMatchObject({
      success: false,
      transient: false,
      error: 'close_response_missing_id',
    })
  })
})
