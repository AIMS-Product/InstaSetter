import type { QualificationStatus } from '@/types/enums'
import { leadSummarySchema, type LeadSummary } from '@/types/lead'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

type Lead = Database['public']['Tables']['leads']['Row']

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Qualification thresholds (placeholders pending sales team input)
// ---------------------------------------------------------------------------

export const HOT_MACHINE_THRESHOLD = 5

// ---------------------------------------------------------------------------
// determineQualification — pure function, no database
// ---------------------------------------------------------------------------

interface QualificationInput {
  callBooked: boolean
  emailCaptured: boolean
  machineCount?: number
}

export function determineQualification(
  input: QualificationInput
): QualificationStatus {
  const { callBooked, emailCaptured, machineCount = 0 } = input

  // Call booked is an unconditional override
  if (callBooked) return 'hot'

  // High engagement + email = hot
  if (machineCount >= HOT_MACHINE_THRESHOLD && emailCaptured) return 'hot'

  // Email alone = warm
  if (emailCaptured) return 'warm'

  return 'cold'
}

// ---------------------------------------------------------------------------
// createLead — validate summary, qualify, insert into Supabase
// ---------------------------------------------------------------------------

export async function createLead(
  contactId: string,
  conversationId: string,
  summary: LeadSummary
): Promise<ServiceResult<Lead>> {
  // Validate the summary against the Zod schema
  const parsed = leadSummarySchema.safeParse(summary)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  const data = parsed.data

  // Determine qualification using our pure function
  const qualificationStatus = determineQualification({
    callBooked: data.call_booked,
    emailCaptured: !!data.email,
    machineCount: data.machine_count,
  })

  const supabase = createServiceRoleClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      contact_id: contactId,
      conversation_id: conversationId,
      instagram_handle: data.instagram_handle,
      qualification_status: qualificationStatus,
      call_booked: data.call_booked,
      name: data.name ?? null,
      email: data.email ?? null,
      machine_count: data.machine_count ?? null,
      location_type: data.location_type ?? null,
      revenue_range: data.revenue_range ?? null,
      calendly_slot: data.calendly_slot ?? null,
      key_notes: data.key_notes ?? null,
      recommended_action: data.recommended_action ?? null,
      summary_json:
        data as unknown as Database['public']['Tables']['leads']['Insert']['summary_json'],
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: lead }
}
