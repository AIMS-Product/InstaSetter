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
