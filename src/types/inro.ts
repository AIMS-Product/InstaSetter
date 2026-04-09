import { z } from 'zod'
import { CONTACT_SOURCES } from '@/types/enums'

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
