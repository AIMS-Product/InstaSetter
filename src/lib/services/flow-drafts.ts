import 'server-only'

import {
  FLOW_DRAFT_SCHEMA,
  extractPersistedFlowDraft,
  normalizePersistedFlowDraft,
  type PersistedFlowDraft,
} from '@/app/dashboard/flows/[flowId]/draft-persistence'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

export interface FlowDraftKey {
  brand: string
  flowId: string
  bookingUrl?: string
}

export interface SaveFlowDraftArgs extends FlowDraftKey {
  state: PersistedFlowDraft
}

type FlowDraftStateColumn =
  Database['public']['Tables']['ins_flow_drafts']['Row']['state']

export async function loadFlowDraft({
  brand,
  flowId,
  bookingUrl,
}: FlowDraftKey): Promise<PersistedFlowDraft | null> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('ins_flow_drafts')
    .select('schema_version, booking_url, state')
    .eq('brand', brand)
    .eq('flow_id', flowId)
    .maybeSingle()

  if (error) {
    console.error('loadFlowDraft failed', error)
    return null
  }

  if (!data) return null
  if (data.schema_version !== FLOW_DRAFT_SCHEMA) return null
  if ((data.booking_url ?? null) !== (bookingUrl ?? null)) return null

  return normalizePersistedFlowDraft(
    data.state as unknown as PersistedFlowDraft
  ) as PersistedFlowDraft
}

export async function saveFlowDraft({
  brand,
  flowId,
  bookingUrl,
  state,
}: SaveFlowDraftArgs): Promise<boolean> {
  const client = createServiceRoleClient()
  const { error } = await client.from('ins_flow_drafts').upsert(
    {
      brand,
      flow_id: flowId,
      booking_url: bookingUrl ?? null,
      schema_version: FLOW_DRAFT_SCHEMA,
      state: extractPersistedFlowDraft(
        state
      ) as unknown as FlowDraftStateColumn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'brand,flow_id' }
  )

  if (error) {
    console.error('saveFlowDraft failed', error)
    return false
  }

  return true
}
