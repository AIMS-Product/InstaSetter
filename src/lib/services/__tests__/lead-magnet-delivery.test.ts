import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  NoopMagnetDelivery,
  type LeadMagnetDelivery,
  type LeadMagnetDeliveryRequest,
} from '@/lib/services/lead-magnet-delivery'

describe('NoopMagnetDelivery', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  const stubRequest: LeadMagnetDeliveryRequest = {
    eventId: 'evt-123',
    email: 'lead@example.com',
    recipientFirstName: 'Lead',
    attachmentUrl: 'https://example.com/asset.pdf',
    attachmentFileName: 'magnet.pdf',
    subject: 'Your prep checklist',
    body: 'Here it is.',
  }

  it('returns success without sending and never throws', async () => {
    const delivery = new NoopMagnetDelivery()
    const result = await delivery.send(stubRequest)
    expect(result.success).toBe(true)
  })

  it('returns providerId derived from eventId for traceability', async () => {
    const delivery = new NoopMagnetDelivery()
    const result = await delivery.send(stubRequest)
    if (!result.success) throw new Error('expected success')
    expect(result.providerId).toBe('noop_evt-123')
  })

  it('signals delivered:false + reason:noop so dashboards can distinguish recorded-vs-shipped', async () => {
    const delivery = new NoopMagnetDelivery()
    const result = await delivery.send(stubRequest)
    if (!result.success) throw new Error('expected success')
    expect(result.delivered).toBe(false)
    expect(result.reason).toBe('noop')
  })

  it('logs structured info but never logs the recipient email', async () => {
    const delivery = new NoopMagnetDelivery()
    await delivery.send(stubRequest)
    expect(logSpy).toHaveBeenCalled()
    const [, payload] = logSpy.mock.calls[0]
    expect(payload).toEqual(
      expect.objectContaining({
        event: 'lead_magnet.noop_send',
        eventId: 'evt-123',
        hasAttachmentUrl: true,
      })
    )
    expect(JSON.stringify(payload)).not.toContain('lead@example.com')
  })

  it('satisfies the LeadMagnetDelivery interface', () => {
    const delivery: LeadMagnetDelivery = new NoopMagnetDelivery()
    expect(typeof delivery.send).toBe('function')
  })
})
