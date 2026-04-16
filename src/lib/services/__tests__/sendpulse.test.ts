import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getSendPulseConfig: () => ({
    SENDPULSE_API_KEY: 'test-api-key',
    SENDPULSE_BOT_ID: 'test-bot-id',
    SENDPULSE_WEBHOOK_SECRET: 'test-secret',
  }),
}))

import {
  sendInstagramMessage,
  setContactTags,
  removeContactTag,
  pauseAutomation,
} from '@/lib/services/sendpulse'

describe('SendPulse service', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = fetchSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendInstagramMessage', () => {
    it('sends message to correct endpoint with auth header', async () => {
      fetchSpy.mockResolvedValue({ ok: true })

      const result = await sendInstagramMessage('contact-1', 'Hello!')

      expect(result).toEqual({ success: true })
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.sendpulse.com/instagram/contacts/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
          body: JSON.stringify({
            contact_id: 'contact-1',
            messages: [{ type: 'text', message: { text: 'Hello!' } }],
          }),
        })
      )
    })

    it('returns error on non-ok response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        text: () => Promise.resolve('invalid contact'),
        status: 400,
      })

      const result = await sendInstagramMessage('bad-id', 'Hi')

      expect(result).toEqual({
        success: false,
        error: 'invalid contact',
        status: 400,
      })
    })
  })

  describe('setContactTags', () => {
    it('sends tags to correct endpoint', async () => {
      fetchSpy.mockResolvedValue({ ok: true })

      const result = await setContactTags('contact-1', [
        'qualified',
        'location:Adelaide',
      ])

      expect(result).toEqual({ success: true })
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.sendpulse.com/instagram/contacts/setTag',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            contact_id: 'contact-1',
            tags: ['qualified', 'location:Adelaide'],
          }),
        })
      )
    })

    it('returns success immediately for empty tags array', async () => {
      const result = await setContactTags('contact-1', [])

      expect(result).toEqual({ success: true })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns error on API failure', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
        status: 500,
      })

      const result = await setContactTags('contact-1', ['tag'])

      expect(result.success).toBe(false)
    })
  })

  describe('removeContactTag', () => {
    it('removes tag via correct endpoint', async () => {
      fetchSpy.mockResolvedValue({ ok: true })

      const result = await removeContactTag('contact-1', 'old-tag')

      expect(result).toEqual({ success: true })
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.sendpulse.com/instagram/contacts/deleteTag',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            contact_id: 'contact-1',
            tag: 'old-tag',
          }),
        })
      )
    })
  })

  describe('pauseAutomation', () => {
    it('pauses with default 60 minutes', async () => {
      fetchSpy.mockResolvedValue({ ok: true })

      const result = await pauseAutomation('contact-1')

      expect(result).toEqual({ success: true })
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.sendpulse.com/instagram/contacts/setPauseAutomation',
        expect.objectContaining({
          body: JSON.stringify({
            contact_id: 'contact-1',
            pause_time: 60,
          }),
        })
      )
    })

    it('accepts custom duration', async () => {
      fetchSpy.mockResolvedValue({ ok: true })

      await pauseAutomation('contact-1', 120)

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            contact_id: 'contact-1',
            pause_time: 120,
          }),
        })
      )
    })
  })
})
