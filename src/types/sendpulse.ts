import { z } from 'zod'

const sendpulseEventSchema = z
  .object({
    service: z.string(),
    title: z.string(),
    date: z.number(),
    bot: z
      .object({
        id: z.string(),
        name: z.string().optional(),
      })
      .passthrough(),
    contact: z
      .object({
        id: z.string(),
        username: z.string().optional(),
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        last_message: z.string(),
        photo: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
      })
      .passthrough(),
  })
  .passthrough()

// SendPulse sends webhook payloads as an array of events
export const sendpulseWebhookSchema = z.array(sendpulseEventSchema)

export type SendPulseWebhookPayload = z.infer<typeof sendpulseEventSchema>
