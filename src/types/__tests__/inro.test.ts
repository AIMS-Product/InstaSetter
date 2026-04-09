import { describe, it, expect } from 'vitest'
import { inroWebhookSchema } from '@/types/inro'

const validPayload = {
  contact_id: 'inro_abc123',
  username: 'johndoe',
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Hey, interested in vending machines',
  timestamp: '2026-04-09T10:30:00Z',
}

describe('inroWebhookSchema', () => {
  it('validates a complete valid payload', () => {
    const result = inroWebhookSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('validates payload with only required fields', () => {
    const minimal = {
      contact_id: 'inro_abc123',
      username: 'johndoe',
      message: 'Hello',
      timestamp: '2026-04-09T10:30:00Z',
    }
    expect(inroWebhookSchema.safeParse(minimal).success).toBe(true)
  })

  it('defaults source to organic_dm when missing', () => {
    const minimal = {
      contact_id: 'x',
      username: 'y',
      message: 'z',
      timestamp: '2026-04-09T10:30:00Z',
    }
    const result = inroWebhookSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe('organic_dm')
    }
  })

  it('rejects payload missing required contact_id', () => {
    const { contact_id: _contact_id, ...missing } = validPayload
    expect(inroWebhookSchema.safeParse(missing).success).toBe(false)
  })

  it('rejects payload with invalid email', () => {
    expect(
      inroWebhookSchema.safeParse({ ...validPayload, email: 'not-an-email' })
        .success
    ).toBe(false)
  })

  it('strips extra fields', () => {
    const result = inroWebhookSchema.safeParse({
      ...validPayload,
      extra: 'field',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra).toBeUndefined()
    }
  })

  it('accepts valid source values', () => {
    const result = inroWebhookSchema.safeParse({
      ...validPayload,
      source: 'keyword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid source values', () => {
    const result = inroWebhookSchema.safeParse({
      ...validPayload,
      source: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
