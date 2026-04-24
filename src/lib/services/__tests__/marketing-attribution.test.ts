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

  it('formats unknown attribution without noisy placeholders', () => {
    expect(formatAttributionLabel(null)).toBe('Unknown source')
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
      label: 'Masterclass Reel',
      material: 'Masterclass Reel',
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
      }),
      { onConflict: 'conversation_id' }
    )
  })
})
