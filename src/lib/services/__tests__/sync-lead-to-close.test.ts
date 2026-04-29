import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getBrandConfig: () => ({
    BRAND_NAME: 'VendingPreneurs',
    BOOKING_URL: 'https://booking.example.com',
  }),
  getCloseConfig: () => ({
    CLOSE_API_KEY: 'api_test_xxx',
    CLOSE_BASE_URL: 'https://api.close.com/api/v1',
    CLOSE_LEAD_STATUS_NEW_ID: 'stat_new',
    CLOSE_CUSTOM_FIELD_IDS: { instagram_handle: 'lcf_handle' },
    CLOSE_CRON_SECRET: 'secret',
  }),
}))

vi.mock('@/lib/services/feature-flags', () => ({
  flagOn: vi.fn(),
  clearFlagCache: vi.fn(),
}))

vi.mock('@/lib/services/close-crm', () => ({
  pushLeadToClose: vi.fn(),
}))

import { syncLeadToClose } from '@/lib/services/sync-lead-to-close'
import { flagOn } from '@/lib/services/feature-flags'
import { pushLeadToClose } from '@/lib/services/close-crm'
import { createTableAwareMockClient, asSupabaseClient } from '@/test/helpers'

function leadFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    contact_id: 'contact-1',
    conversation_id: 'conv-1',
    instagram_handle: 'jess.va',
    qualification_status: 'warm',
    location_type: 'Adelaide',
    revenue_range: '$8K',
    name: 'Jess',
    email: 'jess@example.com',
    close_crm_id: null,
    close_sync_status: 'pending',
    close_sync_attempts: 0,
    ...overrides,
  }
}

function contactFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact-1',
    name: 'Jess',
    email: 'jess@example.com',
    instagram_handle: 'jess.va',
    tags: ['qualified'],
    sendpulse_contact_id: 'sp_1',
    ...overrides,
  }
}

function conversationFixture() {
  return { id: 'conv-1', contact_id: 'contact-1', status: 'active' }
}

function attributionFixture() {
  return {
    conversation_id: 'conv-1',
    channel: 'paid_ads_dm',
    campaign: 'spring-2026',
    material: 'reel',
  }
}

function setupClientForFullLoad(
  client: ReturnType<typeof createTableAwareMockClient>,
  options: {
    lead?: ReturnType<typeof leadFixture> | null
    contact?: ReturnType<typeof contactFixture> | null
    conversation?: ReturnType<typeof conversationFixture> | null
    attribution?: ReturnType<typeof attributionFixture> | null
  } = {}
) {
  const lead = options.lead ?? leadFixture()
  const contact = options.contact ?? contactFixture()
  const conversation = options.conversation ?? conversationFixture()
  const attribution = options.attribution ?? attributionFixture()

  client.forTable('leads').maybeSingle.mockResolvedValueOnce({
    data: lead,
    error: null,
  })
  client.forTable('contacts').maybeSingle.mockResolvedValueOnce({
    data: contact,
    error: null,
  })
  client.forTable('conversations').maybeSingle.mockResolvedValueOnce({
    data: conversation,
    error: null,
  })
  client
    .forTable('conversation_attributions')
    .maybeSingle.mockResolvedValueOnce({
      data: attribution,
      error: null,
    })
}

describe('syncLeadToClose', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns skipped:flag_off when flagOn returns false (no Close call, no payload built)', async () => {
    vi.mocked(flagOn).mockResolvedValue(false)
    const client = createTableAwareMockClient()

    const result = await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result).toEqual({ success: true, skipped: true, reason: 'flag_off' })
    expect(pushLeadToClose).not.toHaveBeenCalled()
    expect(client.forTable('leads').update).toHaveBeenCalledWith(
      expect.objectContaining({ close_sync_status: 'skipped' })
    )
    expect(client.forTable('integration_events').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        integration: 'close_crm',
        action: 'upsert_lead',
        status: 'skipped',
        error_message: 'flag_off',
      })
    )
  })

  it('writes close_crm_id and sent status on successful create', async () => {
    vi.mocked(flagOn).mockResolvedValue(true)
    vi.mocked(pushLeadToClose).mockResolvedValue({
      success: true,
      closeLeadId: 'lead_close_xxx',
      created: true,
    })
    const client = createTableAwareMockClient()
    setupClientForFullLoad(client)

    const result = await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result).toEqual({
      success: true,
      closeLeadId: 'lead_close_xxx',
      created: true,
    })
    expect(pushLeadToClose).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jess@example.com' })
    )
    // The success branch updates the leads row with close_crm_id and sent.
    expect(client.forTable('leads').update).toHaveBeenCalledWith(
      expect.objectContaining({
        close_crm_id: 'lead_close_xxx',
        close_sync_status: 'sent',
        close_sync_attempts: 1,
      })
    )
    expect(client.forTable('integration_events').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        integration: 'close_crm',
        action: 'upsert_lead',
        status: 'success',
      })
    )
  })

  it('writes failed status with error message on permanent failure', async () => {
    vi.mocked(flagOn).mockResolvedValue(true)
    vi.mocked(pushLeadToClose).mockResolvedValue({
      success: false,
      error: 'invalid api key',
      status: 401,
      transient: false,
    })
    const client = createTableAwareMockClient()
    setupClientForFullLoad(client)

    const result = await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result).toEqual({
      success: false,
      error: 'invalid api key',
      transient: false,
    })
    expect(client.forTable('leads').update).toHaveBeenCalledWith(
      expect.objectContaining({
        close_sync_status: 'failed',
        close_sync_error_message: 'invalid api key',
        close_sync_attempts: 1,
      })
    )
  })

  it('writes failed status with transient=true on transient failure (cron retries pick it up)', async () => {
    vi.mocked(flagOn).mockResolvedValue(true)
    vi.mocked(pushLeadToClose).mockResolvedValue({
      success: false,
      error: 'http_503',
      status: 503,
      transient: true,
    })
    const client = createTableAwareMockClient()
    setupClientForFullLoad(client, {
      lead: leadFixture({ close_sync_attempts: 2 }),
    })

    const result = await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.transient).toBe(true)
    }
    expect(client.forTable('leads').update).toHaveBeenCalledWith(
      expect.objectContaining({
        close_sync_status: 'failed',
        close_sync_attempts: 3,
      })
    )
  })

  it('skips cold leads and never calls Close', async () => {
    vi.mocked(flagOn).mockResolvedValue(true)
    const client = createTableAwareMockClient()
    setupClientForFullLoad(client, {
      lead: leadFixture({ qualification_status: 'cold' }),
    })

    const result = await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result).toEqual({
      success: true,
      skipped: true,
      reason: 'cold_lead',
    })
    expect(pushLeadToClose).not.toHaveBeenCalled()
    expect(client.forTable('leads').update).toHaveBeenCalledWith(
      expect.objectContaining({
        close_sync_status: 'skipped',
        close_sync_error_message: 'cold_lead',
      })
    )
  })

  it('skips leads with no email', async () => {
    vi.mocked(flagOn).mockResolvedValue(true)
    const client = createTableAwareMockClient()
    setupClientForFullLoad(client, {
      contact: contactFixture({ email: null }),
      lead: leadFixture({ email: null }),
    })

    const result = await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result).toEqual({
      success: true,
      skipped: true,
      reason: 'no_email',
    })
    expect(pushLeadToClose).not.toHaveBeenCalled()
  })

  it('returns lead_not_found if the leadId does not resolve', async () => {
    vi.mocked(flagOn).mockResolvedValue(true)
    const client = createTableAwareMockClient()
    client
      .forTable('leads')
      .maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const result = await syncLeadToClose({
      leadId: 'missing',
      brand: 'VendingPreneurs',
      client: asSupabaseClient(client),
    })

    expect(result).toEqual({
      success: false,
      error: 'lead_not_found',
      transient: false,
    })
    expect(pushLeadToClose).not.toHaveBeenCalled()
  })

  it('writes the explicit flag-off skip even when no row exists in ins_feature_flags', async () => {
    // Default OFF when no row is what flagOn returns; we test the call here
    // — the orchestrator just receives `false` from flagOn either way.
    vi.mocked(flagOn).mockResolvedValue(false)
    const client = createTableAwareMockClient()

    await syncLeadToClose({
      leadId: 'lead-1',
      brand: 'NewBrand',
      client: asSupabaseClient(client),
    })

    expect(flagOn).toHaveBeenCalledWith(
      'close_sync.enabled',
      { brand: 'NewBrand' },
      expect.anything()
    )
  })
})
