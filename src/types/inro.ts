import { z } from 'zod'

/**
 * Contact source values for Inro webhook payloads.
 * Defined inline until @/types/enums is available (Issue 3).
 */
const CONTACT_SOURCES = [
  'organic_dm',
  'keyword',
  'story_reply',
  'ad_click',
  'referral',
  'manual',
] as const

export const inroWebhookSchema = z.object({
  contact_id: z.string(),
  username: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  message: z.string(),
  timestamp: z.string().datetime(),
  source: z.enum(CONTACT_SOURCES).default('organic_dm'),
})

export type InroWebhookPayload = z.infer<typeof inroWebhookSchema>
