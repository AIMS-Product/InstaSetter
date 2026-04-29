import { describe, it, expect } from 'vitest'
import {
  buildCloseLeadPayload,
  buildConversationUrl,
  type CloseCustomFieldIds,
  type CloseLeadPayloadInput,
} from '@/lib/services/close-crm-payload'

const baseFieldIds: CloseCustomFieldIds = {
  instagram_handle: 'lcf_handle',
  instasetter_conversation_url: 'lcf_url',
  lead_source_channel: 'lcf_channel',
  lead_source_campaign: 'lcf_campaign',
  lead_source_material: 'lcf_material',
  qualification_status: 'lcf_status',
  qualification_location: 'lcf_location',
  qualification_motivation: 'lcf_motivation',
  qualification_budget: 'lcf_budget',
  instasetter_lead_id: 'lcf_leadid',
}

function baseInput(
  overrides: Partial<CloseLeadPayloadInput> = {}
): CloseLeadPayloadInput {
  const defaultAttribution = {
    channel: 'paid_ads_dm',
    campaign: 'spring-2026',
    material: 'reel-vending-101',
  }
  // Distinguish "not in overrides" from "explicit null".
  const attribution =
    'attribution' in overrides ? overrides.attribution : defaultAttribution

  return {
    lead: {
      id: 'lead-uuid-1',
      instagram_handle: 'jess.va',
      qualification_status: 'hot',
      location_type: 'Adelaide',
      revenue_range: '$8K',
      name: 'Jess',
      email: 'jess@example.com',
      ...(overrides.lead ?? {}),
    },
    contact: {
      name: 'Jessica V',
      email: 'jess@example.com',
      instagram_handle: 'jess.va',
      tags: ['qualified', 'motivation:freedom'],
      ...(overrides.contact ?? {}),
    },
    conversation: { id: 'conv-uuid-1', ...(overrides.conversation ?? {}) },
    attribution,
    customFieldIds: overrides.customFieldIds ?? baseFieldIds,
    appBaseUrl: overrides.appBaseUrl ?? 'https://insta-setter.vercel.app',
    statusId: overrides.statusId,
  }
}

describe('buildConversationUrl', () => {
  it('joins the base url to the conversation path', () => {
    expect(
      buildConversationUrl('https://insta-setter.vercel.app', 'abc')
    ).toBe('https://insta-setter.vercel.app/dashboard/conversations/abc')
  })

  it('strips a trailing slash on the base url', () => {
    expect(
      buildConversationUrl('https://insta-setter.vercel.app/', 'abc')
    ).toBe('https://insta-setter.vercel.app/dashboard/conversations/abc')
  })
})

describe('buildCloseLeadPayload', () => {
  it('returns a CREATE-shaped payload with the lead name, contact email, and all custom fields', () => {
    const payload = buildCloseLeadPayload(baseInput())

    expect(payload.name).toBe('Jessica V')
    expect(payload.contacts).toEqual([
      {
        name: 'Jessica V',
        emails: [{ email: 'jess@example.com', type: 'office' }],
      },
    ])
    expect(payload['custom.lcf_handle']).toBe('@jess.va')
    expect(payload['custom.lcf_url']).toBe(
      'https://insta-setter.vercel.app/dashboard/conversations/conv-uuid-1'
    )
    expect(payload['custom.lcf_channel']).toBe('paid_ads_dm')
    expect(payload['custom.lcf_campaign']).toBe('spring-2026')
    expect(payload['custom.lcf_material']).toBe('reel-vending-101')
    expect(payload['custom.lcf_status']).toBe('hot')
    expect(payload['custom.lcf_location']).toBe('Adelaide')
    expect(payload['custom.lcf_motivation']).toBe('freedom')
    expect(payload['custom.lcf_budget']).toBe('$8K')
    expect(payload['custom.lcf_leadid']).toBe('lead-uuid-1')
  })

  it('uses the @-prefixed instagram handle as the lead name when no contact name is set', () => {
    const payload = buildCloseLeadPayload(
      baseInput({
        contact: {
          name: null,
          email: 'jess@example.com',
          instagram_handle: 'jess.va',
          tags: null,
        },
        lead: {
          id: 'lead-uuid-1',
          instagram_handle: 'jess.va',
          qualification_status: 'hot',
          location_type: null,
          revenue_range: null,
          name: null,
          email: null,
        },
      })
    )

    expect(payload.name).toBe('@jess.va')
    expect(payload.contacts[0]?.name).toBe('@jess.va')
  })

  it('omits the contact email when neither contact nor lead has an email', () => {
    const payload = buildCloseLeadPayload(
      baseInput({
        contact: {
          name: 'Jess',
          email: null,
          instagram_handle: 'jess.va',
          tags: null,
        },
        lead: {
          id: 'lead-uuid-1',
          instagram_handle: 'jess.va',
          qualification_status: 'hot',
          location_type: null,
          revenue_range: null,
          name: null,
          email: null,
        },
      })
    )

    expect(payload.contacts[0]?.emails).toEqual([])
  })

  it('skips logical fields whose Close ID is not configured', () => {
    const partial: CloseCustomFieldIds = {
      instagram_handle: 'lcf_handle',
      qualification_status: 'lcf_status',
    }
    const payload = buildCloseLeadPayload(
      baseInput({ customFieldIds: partial })
    )

    expect(payload['custom.lcf_handle']).toBe('@jess.va')
    expect(payload['custom.lcf_status']).toBe('hot')
    // No URL custom field configured — should not appear.
    expect(payload['custom.lcf_url']).toBeUndefined()
  })

  it('falls back to tag-derived qualification when columns are null', () => {
    const payload = buildCloseLeadPayload(
      baseInput({
        contact: {
          name: 'Jess',
          email: 'jess@example.com',
          instagram_handle: 'jess.va',
          tags: ['qualified', 'location:Brisbane', 'budget:$5K'],
        },
        lead: {
          id: 'lead-uuid-1',
          instagram_handle: 'jess.va',
          qualification_status: 'warm',
          location_type: null,
          revenue_range: null,
          name: 'Jess',
          email: 'jess@example.com',
        },
      })
    )

    expect(payload['custom.lcf_location']).toBe('Brisbane')
    expect(payload['custom.lcf_budget']).toBe('$5K')
  })

  it('omits attribution custom fields when no attribution row is present', () => {
    const payload = buildCloseLeadPayload(
      baseInput({ attribution: null })
    )
    expect(payload['custom.lcf_channel']).toBeUndefined()
    expect(payload['custom.lcf_campaign']).toBeUndefined()
    expect(payload['custom.lcf_material']).toBeUndefined()
  })

  it('passes status_id when provided', () => {
    const payload = buildCloseLeadPayload(
      baseInput({ statusId: 'stat_new123' })
    )
    expect(payload.status_id).toBe('stat_new123')
  })

  it('omits status_id when not provided (Close falls back to org default)', () => {
    const payload = buildCloseLeadPayload(baseInput())
    expect(payload.status_id).toBeUndefined()
  })

  it('truncates field values longer than the Close 500-char limit', () => {
    const longCampaign = 'x'.repeat(800)
    const payload = buildCloseLeadPayload(
      baseInput({
        attribution: {
          channel: 'paid_ads_dm',
          campaign: longCampaign,
          material: 'reel',
        },
      })
    )
    const value = payload['custom.lcf_campaign']
    expect(value).toBeDefined()
    expect(value!.length).toBeLessThanOrEqual(500)
  })
})
