import { describe, expect, it } from 'vitest'

import {
  DEFAULT_POST_EMAIL_BEHAVIOR,
  PostEmailBehaviorSchema,
} from '../post-email-behavior'

describe('PostEmailBehaviorSchema', () => {
  it('accepts the default config', () => {
    expect(
      PostEmailBehaviorSchema.safeParse(DEFAULT_POST_EMAIL_BEHAVIOR).success
    ).toBe(true)
  })

  it('requires non-empty confirmation copy', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      confirmationMessage: '',
    })

    expect(result.success).toBe(false)
  })

  it('accepts supported delivery modes and next steps', () => {
    for (const deliveryMode of [
      'none',
      'manual',
      'customerio',
      'close',
      'webhook',
    ] as const) {
      const result = PostEmailBehaviorSchema.safeParse({
        ...DEFAULT_POST_EMAIL_BEHAVIOR,
        deliveryMode,
      })

      expect(result.success).toBe(true)
    }

    for (const nextStep of [
      'summary',
      'booking',
      'nurture',
      'human_review',
    ] as const) {
      const result = PostEmailBehaviorSchema.safeParse({
        ...DEFAULT_POST_EMAIL_BEHAVIOR,
        nextStep,
      })

      expect(result.success).toBe(true)
    }
  })

  it('accepts a null resource label when no asset is live', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      resourceLabel: null,
    })

    expect(result.success).toBe(true)
  })

  it('accepts customizable email subject, body, and attachment metadata', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      emailTemplate: {
        subject: 'Your vending call prep',
        body: 'Hey {{first_name}}, here are the details we discussed.',
        attachment: {
          fileName: 'prep-checklist.pdf',
          url: 'https://assets.example.com/prep-checklist.pdf',
          description: 'Prep checklist PDF',
        },
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailTemplate.attachment?.fileName).toBe(
        'prep-checklist.pdf'
      )
    }
  })

  it('accepts the new stored-asset attachment shape (kind: asset)', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      emailTemplate: {
        subject: 'Your vending call prep',
        body: 'Details attached.',
        attachment: {
          kind: 'asset',
          assetId: '123e4567-e89b-12d3-a456-426614174000',
          fileName: 'prep-checklist.pdf',
          description: null,
        },
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailTemplate.attachment).toMatchObject({
        kind: 'asset',
        assetId: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'prep-checklist.pdf',
      })
    }
  })

  it('accepts the legacy URL shape with explicit kind: url', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      emailTemplate: {
        subject: 'Your vending call prep',
        body: 'Details attached.',
        attachment: {
          kind: 'url',
          fileName: 'prep-checklist.pdf',
          url: 'https://assets.example.com/prep-checklist.pdf',
          description: null,
        },
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects the stored-asset shape when assetId is not a UUID', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      emailTemplate: {
        subject: 'Your vending call prep',
        body: 'Details attached.',
        attachment: {
          kind: 'asset',
          assetId: 'not-a-uuid',
          fileName: 'prep-checklist.pdf',
          description: null,
        },
      },
    })

    expect(result.success).toBe(false)
  })

  it('backfills the default email template for legacy post-email behavior', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      confirmationMessage:
        "Got it, I've saved your email for the call details.",
      deliveryMode: 'manual',
      resourceLabel: null,
      nextStep: 'human_review',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailTemplate.subject).toContain('call')
      expect(result.data.emailTemplate.attachment).toBeNull()
    }
  })

  it('requires complete attachment metadata when an attachment is configured', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      emailTemplate: {
        subject: 'Your vending call prep',
        body: 'Details attached.',
        attachment: {
          fileName: '',
          url: 'not-a-url',
          description: 'Prep checklist PDF',
        },
      },
    })

    expect(result.success).toBe(false)
  })

  it('rejects unknown delivery modes and next steps', () => {
    expect(
      PostEmailBehaviorSchema.safeParse({
        ...DEFAULT_POST_EMAIL_BEHAVIOR,
        deliveryMode: 'sms',
      }).success
    ).toBe(false)

    expect(
      PostEmailBehaviorSchema.safeParse({
        ...DEFAULT_POST_EMAIL_BEHAVIOR,
        nextStep: 'upsell',
      }).success
    ).toBe(false)
  })

  it('prevents immediate-send promises when nothing is configured to send', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      deliveryMode: 'none',
      confirmationMessage: "Got it, I'll send that right now.",
    })

    expect(result.success).toBe(false)
  })

  it('keeps the no-delivery default free from immediate-send promises', () => {
    expect(DEFAULT_POST_EMAIL_BEHAVIOR.deliveryMode).toBe('none')
    expect(DEFAULT_POST_EMAIL_BEHAVIOR.confirmationMessage).not.toMatch(
      /right now|within a few minutes/i
    )
  })
})
