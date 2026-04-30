import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

/**
 * lead-capture.ts — channel-agnostic capture-event recorder.
 *
 * Spec: plans/dm-setter-roadmap/p1-trust-conversation/05-anthony-magnet.md
 *
 * This module is the data-layer for the unified `lead_capture_events` table.
 * It records the moment an email commits to a magnet flow, regardless of
 * channel (DM, landing page, manual). Pure write — no delivery side-effects.
 * Delivery is the responsibility of `LeadMagnetDelivery` implementations
 * orchestrated by P2 (P1.05 ships only the no-op).
 */

export const LeadCaptureSourceSchema = z.enum(['dm', 'landing_page', 'manual'])
export type LeadCaptureSource = z.infer<typeof LeadCaptureSourceSchema>

export const RecordLeadCaptureSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  source: LeadCaptureSourceSchema,
  contactId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  marketingSourceId: z.string().uuid().optional(),
  attribution: z.unknown().optional(),
})

export type RecordLeadCaptureInput = z.infer<typeof RecordLeadCaptureSchema>

export type RecordLeadCaptureResult =
  | { success: true; eventId: string }
  | { success: false; error: string }

/**
 * Insert a row into `lead_capture_events`. Validates input via Zod, normalises
 * the email, and serialises the optional attribution context as JSONB.
 *
 * Failure modes:
 *  - Validation failure → returns `{ success: false }`. Does NOT throw.
 *  - Database failure → returns `{ success: false }`. Does NOT throw.
 *  - Caller (e.g. `routeLeadEvents` in engine.ts) must swallow side-effect
 *    failures so the bot reply path is never blocked.
 */
export async function recordLeadCaptureEvent(
  client: SupabaseClient<Database>,
  input: RecordLeadCaptureInput
): Promise<RecordLeadCaptureResult> {
  const parsed = RecordLeadCaptureSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  const data = parsed.data

  const { data: row, error } = await client
    .from('lead_capture_events')
    .insert({
      email: data.email,
      source: data.source,
      contact_id: data.contactId ?? null,
      conversation_id: data.conversationId ?? null,
      marketing_source_id: data.marketingSourceId ?? null,
      attribution:
        data.attribution === undefined ? null : (data.attribution as Json),
    })
    .select('id')
    .single()

  if (error || !row) {
    console.info('[lead-capture] insert failed', {
      event: 'lead_capture.insert_failed',
      source: data.source,
      has_email: Boolean(data.email),
      has_contact: Boolean(data.contactId),
    })
    return {
      success: false,
      error: error?.message ?? 'Insert returned no row',
    }
  }

  console.info('[lead-capture] recorded', {
    event: 'lead_capture.recorded',
    source: data.source,
    has_email: Boolean(data.email),
    has_contact: Boolean(data.contactId),
  })

  return { success: true, eventId: row.id }
}
