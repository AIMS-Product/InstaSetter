import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getCloseConfig, getBrandConfig } from '@/lib/config'
import { flagOn } from '@/lib/services/feature-flags'
import { pushLeadToClose } from '@/lib/services/close-crm'
import {
  buildCloseLeadPayload,
  type CloseCustomFieldIds,
} from '@/lib/services/close-crm-payload'

/**
 * Orchestrator that turns one lead row into a Close CRM upsert.
 *
 * Loads the related contact + conversation + attribution from Supabase,
 * builds the Close payload, fires `pushLeadToClose`, and writes back the
 * sync state (`close_crm_id` + `close_sync_*`) plus an `integration_events`
 * row with `integration='close_crm'`.
 *
 * Gated by the `close_sync.enabled` per-brand row in `ins_feature_flags`.
 * When the flag is off, marks the row `skipped` and writes a single
 * `integration_events` row noting the flag-off reason. NEVER throws —
 * fire-and-forget callers (the engine) rely on this.
 */

const APP_BASE_URL_DEFAULT = 'https://insta-setter.vercel.app'

type LeadRow = Database['public']['Tables']['leads']['Row']
type ContactRow = Database['public']['Tables']['contacts']['Row']
type ConversationRow = Database['public']['Tables']['conversations']['Row']
type AttributionRow =
  Database['public']['Tables']['conversation_attributions']['Row']

function logFailure(fields: Record<string, unknown>) {
  // Console.error is the v1 observability surface (Sentry not yet wired).
  // Spec FR-9.

  console.error(JSON.stringify({ event: 'close_sync_failed', ...fields }))
}

async function logIntegrationEvent(
  client: SupabaseClient<Database>,
  input: {
    leadId: string
    contactId: string | null
    conversationId: string | null
    status: string
    error?: string
    payload?: unknown
  }
) {
  try {
    await client.from('integration_events').insert({
      integration: 'close_crm',
      action: 'upsert_lead',
      status: input.status,
      lead_id: input.leadId,
      contact_id: input.contactId,
      conversation_id: input.conversationId,
      error_message: input.error ?? null,
      payload:
        (input.payload as Database['public']['Tables']['integration_events']['Insert']['payload']) ??
        null,
    })
  } catch {
    // Logging failures must not propagate.
  }
}

interface LoadedContext {
  lead: LeadRow
  contact: ContactRow | null
  conversation: ConversationRow | null
  attribution: AttributionRow | null
}

async function loadContext(
  client: SupabaseClient<Database>,
  leadId: string
): Promise<LoadedContext | null> {
  const { data: lead } = await client
    .from('leads')
    .select(
      'id, contact_id, conversation_id, instagram_handle, qualification_status, location_type, revenue_range, name, email, close_crm_id, close_sync_status, close_sync_attempts'
    )
    .eq('id', leadId)
    .maybeSingle()
  if (!lead) return null

  const { data: contact } = await client
    .from('contacts')
    .select('id, name, email, instagram_handle, tags, sendpulse_contact_id')
    .eq('id', lead.contact_id)
    .maybeSingle()

  const { data: conversation } = await client
    .from('conversations')
    .select('id, contact_id, status')
    .eq('id', lead.conversation_id)
    .maybeSingle()

  const { data: attribution } = await client
    .from('conversation_attributions')
    .select('conversation_id, channel, campaign, material')
    .eq('conversation_id', lead.conversation_id)
    .maybeSingle()

  return {
    lead: lead as LeadRow,
    contact: (contact as ContactRow | null) ?? null,
    conversation: (conversation as ConversationRow | null) ?? null,
    attribution: (attribution as AttributionRow | null) ?? null,
  }
}

async function markSkipped(
  client: SupabaseClient<Database>,
  leadId: string,
  reason: string
) {
  await client
    .from('leads')
    .update({
      close_sync_status: 'skipped',
      close_sync_error_message: reason,
      close_sync_attempted_at: new Date().toISOString(),
    })
    .eq('id', leadId)
  await logIntegrationEvent(client, {
    leadId,
    contactId: null,
    conversationId: null,
    status: 'skipped',
    error: reason,
  })
}

export interface SyncLeadToCloseInput {
  leadId: string
  brand?: string
  appBaseUrl?: string
  /** Override the flag check — useful for the cron path. */
  client?: SupabaseClient<Database>
}

export type SyncLeadToCloseResult =
  | { success: true; closeLeadId: string; created: boolean }
  | { success: true; skipped: true; reason: string }
  | { success: false; error: string; transient: boolean }

export async function syncLeadToClose(
  input: SyncLeadToCloseInput
): Promise<SyncLeadToCloseResult> {
  const { leadId } = input
  const brand = input.brand ?? getBrandConfig().BRAND_NAME
  const appBaseUrl = input.appBaseUrl ?? APP_BASE_URL_DEFAULT

  // Resolve the supabase client. Importing lazily avoids loading the
  // service-role module during unit tests that don't supply a client.
  const client =
    input.client ??
    (await import('@/lib/supabase/service-role').then((m) =>
      m.createServiceRoleClient()
    ))

  // Step 1: feature-flag gate.
  const enabled = await flagOn('close_sync.enabled', { brand }, client)
  if (!enabled) {
    await markSkipped(client, leadId, 'flag_off')
    return { success: true, skipped: true, reason: 'flag_off' }
  }

  // Step 2: load context.
  const ctx = await loadContext(client, leadId)
  if (!ctx) {
    return { success: false, error: 'lead_not_found', transient: false }
  }
  const { lead, contact, conversation, attribution } = ctx

  // Step 3: cold-lead skip (FR-2).
  if (lead.qualification_status === 'cold') {
    await markSkipped(client, leadId, 'cold_lead')
    return { success: true, skipped: true, reason: 'cold_lead' }
  }

  // Step 4: an email is required — the closer needs something to dial /
  // dedupe on.
  const email = (contact?.email ?? lead.email ?? '').trim()
  if (!email) {
    await markSkipped(client, leadId, 'no_email')
    return { success: true, skipped: true, reason: 'no_email' }
  }

  if (!conversation) {
    await markSkipped(client, leadId, 'conversation_missing')
    return { success: true, skipped: true, reason: 'conversation_missing' }
  }

  // Step 5: build payload.
  const closeCfg = getCloseConfig()
  const customFieldIds = closeCfg.CLOSE_CUSTOM_FIELD_IDS as CloseCustomFieldIds

  const payload = buildCloseLeadPayload({
    lead,
    contact: contact ?? {
      name: null,
      email,
      instagram_handle: lead.instagram_handle,
      tags: null,
    },
    conversation: { id: conversation.id },
    attribution: attribution ?? null,
    customFieldIds,
    appBaseUrl,
    statusId: closeCfg.CLOSE_LEAD_STATUS_NEW_ID,
  })

  // Step 6: increment attempt count BEFORE the call so concurrent retries
  // don't double-count.
  const attemptsSoFar = (lead.close_sync_attempts ?? 0) + 1

  const result = await pushLeadToClose({ email, payload })

  if (result.success) {
    await client
      .from('leads')
      .update({
        close_crm_id: result.closeLeadId,
        close_sync_status: 'sent',
        close_sync_attempted_at: new Date().toISOString(),
        close_sync_attempts: attemptsSoFar,
        close_sync_error_message: null,
      })
      .eq('id', leadId)

    await logIntegrationEvent(client, {
      leadId,
      contactId: lead.contact_id,
      conversationId: lead.conversation_id,
      status: 'success',
      payload: { mode: result.created ? 'create' : 'update' },
    })

    return {
      success: true,
      closeLeadId: result.closeLeadId,
      created: result.created,
    }
  }

  // Failure paths: transient → leave at pending+failed (so cron retries
  // pick it up); permanent → failed immediately.
  const newStatus = result.transient ? 'failed' : 'failed'
  await client
    .from('leads')
    .update({
      close_sync_status: newStatus,
      close_sync_attempted_at: new Date().toISOString(),
      close_sync_attempts: attemptsSoFar,
      close_sync_error_message: result.error,
    })
    .eq('id', leadId)

  logFailure({
    leadId,
    contactId: lead.contact_id,
    status: result.status,
    error: result.error,
    attempt: attemptsSoFar,
    transient: result.transient,
  })

  await logIntegrationEvent(client, {
    leadId,
    contactId: lead.contact_id,
    conversationId: lead.conversation_id,
    status: 'failed',
    error: result.error,
    payload: {
      attempt: attemptsSoFar,
      transient: result.transient,
      http_status: result.status,
    },
  })

  return {
    success: false,
    error: result.error,
    transient: result.transient,
  }
}
