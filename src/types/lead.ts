import { z } from 'zod'
import { QUALIFICATION_STATUSES } from '@/types/enums'

export const leadSummarySchema = z.object({
  instagram_handle: z.string().min(1),
  qualification_status: z.enum(QUALIFICATION_STATUSES),
  call_booked: z.boolean(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  machine_count: z.number().int().positive().optional(),
  location_type: z.string().optional(),
  revenue_range: z.string().optional(),
  calendly_slot: z.string().optional(),
  key_notes: z.string().optional(),
  recommended_action: z.string().optional(),
})

export type LeadSummary = z.infer<typeof leadSummarySchema>
