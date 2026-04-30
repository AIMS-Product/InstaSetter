import { describe, expect, it } from 'vitest'
import type { SendPulseWebhookPayload } from '@/types/sendpulse'
import {
  extractSendPulseAttribution,
  formatAttributionLabel,
  generateSourceKey,
  persistSendPulseAttribution,
} from '@/lib/services/marketing-attribution'
import { createTableAwareMockClient, asSupabaseClient } from '@/test/helpers'

function payload(
  overrides: Partial<SendPulseWebhookPayload> = {}
): SendPulseWebhookPayload {
  return {
    service: 'instagram',
    title: 'incoming_message',
    date: 1713225600,
    bot: { id: 'bot-1' },
    contact: {
      id: 'sp_123',
      username: 'testuser',
      last_message: 'Yes',
      tags: ['src:ig_free_masterclass_reel_apr24_comment'],
      variables: {
        lead_channel: 'Instagram',
        lead_campaign: 'Free Masterclass',
        lead_material: 'Masterclass Reel',
        lead_entry_action: 'Comment Reply',
        lead_trigger: 'apr24_comment',
        lead_source_key: 'ig_free_masterclass_reel_apr24_comment',
      },
    },
    info: { message_id: 'msg-1' },
    ...overrides,
  } as SendPulseWebhookPayload
}

describe('marketing attribution', () => {
  it('generates a stable human-readable source key', () => {
    expect(
      generateSourceKey({
        channel: 'IG',
        campaign: 'Free Masterclass',
        material: 'Reel Apr 24',
        entryAction: 'Comment Reply',
        triggerLabel: 'Tell me more!',
      })
    ).toBe('ig_free_masterclass_reel_apr_24_comment_reply_tell_me_more')
  })

  it('normalizes punctuation, quotes, ampersands, and blank key parts', () => {
    expect(
      generateSourceKey({
        channel: ' IG ',
        campaign: '"Founder" & Operator',
        material: '',
        entryAction: "DM's Reply",
        triggerLabel: '  Tell me!!! ',
      })
    ).toBe('ig_founder_and_operator_dms_reply_tell_me')
  })

  it('extracts SendPulse variables and source tag', () => {
    expect(extractSendPulseAttribution(payload())).toMatchObject({
      sourceKey: 'ig_free_masterclass_reel_apr24_comment',
      channel: 'Instagram',
      campaign: 'Free Masterclass',
      material: 'Masterclass Reel',
      entryAction: 'Comment Reply',
      triggerLabel: 'apr24_comment',
      rawMessageId: 'msg-1',
    })
  })

  it('falls back to source tags when lead_source_key is missing', () => {
    const extracted = extractSendPulseAttribution(
      payload({
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: ['src:source_from_tag'],
          variables: {},
        },
      })
    )

    expect(extracted.sourceKey).toBe('source_from_tag')
  })

  it('prefers contact variables over info variables and reads message ids by priority', () => {
    const extracted = extractSendPulseAttribution(
      payload({
        message_id: 'root-msg',
        info: {
          message_id: 'info-msg',
          variables: {
            lead_channel: 'Info Channel',
            lead_source_key: 'info_source',
          },
        },
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: [],
          variables: {
            lead_channel: 'Contact Channel',
            lead_source_key: 'contact_source',
          },
        },
      } as Partial<SendPulseWebhookPayload>)
    )

    expect(extracted).toMatchObject({
      sourceKey: 'contact_source',
      channel: 'Contact Channel',
      rawMessageId: 'root-msg',
    })
  })

  it('reads message id from nested message when root and info ids are absent', () => {
    const extracted = extractSendPulseAttribution(
      payload({
        info: {},
        message: { id: 'nested-msg' },
      } as Partial<SendPulseWebhookPayload>)
    )

    expect(extracted.rawMessageId).toBe('nested-msg')
  })

  it('extracts utm_* values from contact variables when present', () => {
    const extracted = extractSendPulseAttribution(
      payload({
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: [],
          variables: {
            utm_source: 'meta',
            utm_medium: 'cpc',
            utm_campaign: 'apr_masterclass',
            utm_content: 'reel_a',
            utm_term: 'startup',
            ad_id: 'ad_12345',
            ad_set_id: 'set_99',
            landing_page_url: 'https://example.com/lp',
          },
        },
      } as Partial<SendPulseWebhookPayload>)
    )

    expect(extracted.utm).toEqual({
      source: 'meta',
      medium: 'cpc',
      campaign: 'apr_masterclass',
      content: 'reel_a',
      term: 'startup',
    })
    expect(extracted.adId).toBe('ad_12345')
    expect(extracted.adSetId).toBe('set_99')
    expect(extracted.landingPageUrl).toBe('https://example.com/lp')
  })

  it('returns undefined utm when none of the utm_* keys are populated', () => {
    const extracted = extractSendPulseAttribution(payload())
    // The default payload only has lead_* variables, no utm_*.
    expect(extracted.utm).toBeUndefined()
  })

  it('reads utm_* from info.variables when contact.variables omits them', () => {
    const extracted = extractSendPulseAttribution(
      payload({
        info: {
          message_id: 'msg-1',
          variables: {
            utm_source: 'meta',
            utm_campaign: 'fallback_campaign',
          },
        },
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: [],
          variables: {},
        },
      } as Partial<SendPulseWebhookPayload>)
    )

    expect(extracted.utm).toMatchObject({
      source: 'meta',
      campaign: 'fallback_campaign',
    })
  })

  it('generates a UTM-driven source key when UTMs are present', () => {
    expect(
      generateSourceKey({
        channel: 'IG',
        campaign: 'Free Masterclass',
        material: 'Reel',
        entryAction: 'Comment',
        triggerLabel: 'apr_24',
        utm: {
          source: 'meta',
          medium: 'cpc',
          campaign: 'Apr Masterclass',
          content: 'reel_a',
        },
      })
    ).toBe('meta_cpc_apr_masterclass_reel_a')
  })

  it('falls back to legacy slug when UTMs are absent', () => {
    expect(
      generateSourceKey({
        channel: 'IG',
        campaign: 'Free Masterclass',
        material: '',
        entryAction: 'Comment Reply',
        triggerLabel: 'apr_24',
      })
    ).toBe('ig_free_masterclass_comment_reply_apr_24')
  })

  it('formats unknown attribution without noisy placeholders', () => {
    expect(formatAttributionLabel(null)).toBe('Unknown source')
  })

  it('formats known attribution from the strongest available parts', () => {
    expect(
      formatAttributionLabel({
        channel: 'Instagram',
        entryAction: 'Comment Reply',
        material: 'Masterclass Reel',
        campaign: 'Free Masterclass',
      })
    ).toBe('Instagram · Comment Reply · Masterclass Reel')

    expect(
      formatAttributionLabel({
        channel: 'Instagram',
        campaign: 'Free Masterclass',
      })
    ).toBe('Instagram · Free Masterclass')
  })

  it('persists raw webhook payload and normalized attribution', async () => {
    const client = createTableAwareMockClient()
    client.forTable('integration_events').single.mockResolvedValue({
      data: { id: 'evt-1' },
      error: null,
    })
    client.forTable('marketing_sources').maybeSingle.mockResolvedValue({
      data: {
        id: 'src-1',
        source_key: 'ig_free_masterclass_reel_apr24_comment',
        label: 'Masterclass Reel',
        channel: 'Instagram',
        campaign: 'Free Masterclass',
        material: 'Masterclass Reel',
        entry_action: 'Comment Reply',
        trigger_label: 'apr24_comment',
        post_url: null,
        ad_id: null,
      },
      error: null,
    })
    client.forTable('conversation_attributions').upsert.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await persistSendPulseAttribution(asSupabaseClient(client), {
      event: payload(),
      contactId: 'contact-1',
      conversationId: 'conv-1',
    })

    expect(result.webhookEventId).toBe('evt-1')
    expect(result.leadSourceContext).toMatchObject({
      sourceId: 'src-1',
      sourceKey: 'ig_free_masterclass_reel_apr24_comment',
      label: 'Masterclass Reel',
      channel: 'Instagram',
      campaign: 'Free Masterclass',
      material: 'Masterclass Reel',
      entryAction: 'Comment Reply',
      triggerLabel: 'apr24_comment',
      rawMessageId: 'msg-1',
    })
    expect(client.forTable('integration_events').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'incoming_message_webhook',
        payload: expect.any(Object),
      })
    )
    expect(
      client.forTable('conversation_attributions').upsert
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-1',
        source_id: 'src-1',
        source_key: 'ig_free_masterclass_reel_apr24_comment',
        channel: 'Instagram',
        campaign: 'Free Masterclass',
        material: 'Masterclass Reel',
        entry_action: 'Comment Reply',
        trigger_label: 'apr24_comment',
        raw_message_id: 'msg-1',
        updated_at: expect.any(String),
      }),
      { onConflict: 'conversation_id' }
    )
  })

  it('returns only webhook event id when no attribution fields are present', async () => {
    const client = createTableAwareMockClient()
    client.forTable('integration_events').single.mockResolvedValue({
      data: { id: 'evt-2' },
      error: null,
    })

    const result = await persistSendPulseAttribution(asSupabaseClient(client), {
      event: payload({
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: [],
          variables: {},
        },
        info: {},
      }),
      contactId: 'contact-1',
      conversationId: 'conv-1',
    })

    expect(result).toEqual({ webhookEventId: 'evt-2' })
    expect(client.forTable('marketing_sources').select).not.toHaveBeenCalled()
    expect(
      client.forTable('conversation_attributions').upsert
    ).not.toHaveBeenCalled()
  })

  it('persists utm fields when the source has them (source UTMs win over webhook UTMs)', async () => {
    const client = createTableAwareMockClient()
    client.forTable('integration_events').single.mockResolvedValue({
      data: { id: 'evt-utm-1' },
      error: null,
    })
    client.forTable('marketing_sources').maybeSingle.mockResolvedValue({
      data: {
        id: 'src-utm-1',
        source_key: 'ig_free_masterclass_reel_apr24_comment',
        label: 'Masterclass Reel',
        channel: 'Instagram',
        campaign: 'Free Masterclass',
        material: 'Masterclass Reel',
        entry_action: 'Comment Reply',
        trigger_label: 'apr24_comment',
        post_url: null,
        ad_id: null,
        utm_source: 'meta',
        utm_medium: 'cpc',
        utm_campaign: 'apr_masterclass_source',
        utm_content: null,
        utm_term: null,
        ad_set_id: 'set_42',
        landing_page_url: null,
      },
      error: null,
    })
    client.forTable('conversation_attributions').upsert.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await persistSendPulseAttribution(asSupabaseClient(client), {
      event: payload({
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: ['src:ig_free_masterclass_reel_apr24_comment'],
          variables: {
            lead_source_key: 'ig_free_masterclass_reel_apr24_comment',
            // Webhook tries to claim a different campaign — source row wins.
            utm_source: 'instagram',
            utm_campaign: 'webhook_value_should_lose',
          },
        },
      }),
      contactId: 'contact-1',
      conversationId: 'conv-1',
    })

    expect(result.leadSourceContext?.utm).toEqual({
      source: 'meta',
      medium: 'cpc',
      campaign: 'apr_masterclass_source',
      content: undefined,
      term: undefined,
    })
    expect(
      client.forTable('conversation_attributions').upsert
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: 'meta',
        utm_campaign: 'apr_masterclass_source',
        utm_medium: 'cpc',
        utm_content: null,
        utm_term: null,
        ad_set_id: 'set_42',
      }),
      { onConflict: 'conversation_id' }
    )
  })

  it('persists webhook utm fields when the source has none (fallback)', async () => {
    const client = createTableAwareMockClient()
    client.forTable('integration_events').single.mockResolvedValue({
      data: { id: 'evt-utm-2' },
      error: null,
    })
    client.forTable('marketing_sources').maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })
    client.forTable('conversation_attributions').upsert.mockResolvedValue({
      data: null,
      error: null,
    })

    await persistSendPulseAttribution(asSupabaseClient(client), {
      event: payload({
        contact: {
          id: 'sp_123',
          last_message: 'Yes',
          tags: [],
          variables: {
            utm_source: 'meta',
            utm_campaign: 'webhook_only',
          },
        },
      }),
      contactId: 'contact-1',
      conversationId: 'conv-1',
    })

    expect(
      client.forTable('conversation_attributions').upsert
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: 'meta',
        utm_campaign: 'webhook_only',
      }),
      { onConflict: 'conversation_id' }
    )
  })

  it('persists extracted attribution when no marketing source row exists', async () => {
    const client = createTableAwareMockClient()
    client.forTable('integration_events').single.mockResolvedValue({
      data: null,
      error: null,
    })
    client.forTable('marketing_sources').maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })
    client.forTable('conversation_attributions').upsert.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await persistSendPulseAttribution(asSupabaseClient(client), {
      event: payload(),
      contactId: 'contact-1',
      conversationId: 'conv-1',
    })

    expect(result.webhookEventId).toBeNull()
    expect(result.leadSourceContext).toMatchObject({
      sourceId: null,
      sourceKey: 'ig_free_masterclass_reel_apr24_comment',
      channel: 'Instagram',
      campaign: 'Free Masterclass',
      material: 'Masterclass Reel',
      entryAction: 'Comment Reply',
      triggerLabel: 'apr24_comment',
      rawMessageId: 'msg-1',
    })
    expect(
      client.forTable('conversation_attributions').upsert
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: null,
        source_key: 'ig_free_masterclass_reel_apr24_comment',
        channel: 'Instagram',
      }),
      { onConflict: 'conversation_id' }
    )
  })
})
