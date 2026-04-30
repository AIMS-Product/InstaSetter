import { describe, it, expect } from 'vitest'
import {
  sendTransactionalEmail,
  type SendTransactionalEmailInput,
  type SendTransactionalEmailResult,
} from '@/lib/services/email-provider'

const baseInput: SendTransactionalEmailInput = {
  to: 'lead@example.com',
  fromDisplay: 'Anthony from VendingPreneurs',
  subject: 'Your VendingPreneurs onboarding kit',
  body: 'Thanks for your interest — your kit is attached.',
  replyTo: 'sales@vendingpreneurs.com',
  attachment: {
    fileName: 'vp-onboarding.pdf',
    url: 'https://example.com/asset.pdf',
    contentType: 'application/pdf',
  },
  idempotencyKey: 'lead-magnet-test-001',
  metadata: {
    contact_id: 'contact-123',
    flow_id: 'ig-organic-dm',
  },
}

describe('sendTransactionalEmail (shim)', () => {
  it('returns NOT_CONFIGURED with retryable=false on a fully-formed input', async () => {
    const result = await sendTransactionalEmail(baseInput)
    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.error).toBe('NOT_CONFIGURED')
      expect(result.retryable).toBe(false)
    }
  })

  it('returns NOT_CONFIGURED with retryable=false when optional fields are absent', async () => {
    const minimalInput: SendTransactionalEmailInput = {
      to: 'lead@example.com',
      fromDisplay: 'Anthony from VendingPreneurs',
      subject: 'hi',
      body: 'hi',
      idempotencyKey: 'minimal-key',
    }
    const result = await sendTransactionalEmail(minimalInput)
    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.error).toBe('NOT_CONFIGURED')
      expect(result.retryable).toBe(false)
    }
  })

  it('returns NOT_CONFIGURED when attachment is explicitly null', async () => {
    const result = await sendTransactionalEmail({
      ...baseInput,
      attachment: null,
    })
    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.error).toBe('NOT_CONFIGURED')
      expect(result.retryable).toBe(false)
    }
  })

  it('does not throw on malformed input (caller validation is upstream)', async () => {
    // The shim must be safe to call even before P2.04 wires real validation.
    // Casting through unknown so the runtime path is exercised even though
    // the static type check would normally reject this shape.
    const malformed = {
      to: '',
      fromDisplay: '',
      subject: '',
      body: '',
      idempotencyKey: '',
    } as unknown as SendTransactionalEmailInput
    const result = await sendTransactionalEmail(malformed)
    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.error).toBe('NOT_CONFIGURED')
      expect(result.retryable).toBe(false)
    }
  })

  it('exposes a discriminated union so callers can narrow on success', async () => {
    const result: SendTransactionalEmailResult =
      await sendTransactionalEmail(baseInput)
    if (result.success === true) {
      // unreachable until P2.04, but the type narrows to providerMessageId
      expect(typeof result.providerMessageId).toBe('string')
    } else {
      expect(typeof result.error).toBe('string')
      expect(typeof result.retryable).toBe('boolean')
    }
  })
})
