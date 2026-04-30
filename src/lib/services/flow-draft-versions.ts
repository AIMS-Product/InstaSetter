import 'server-only'

import {
  FLOW_DRAFT_SCHEMA,
  extractPersistedFlowDraft,
  type PersistedFlowDraft,
} from '@/app/dashboard/flows/[flowId]/draft-persistence'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Database } from '@/types/database'

type VersionStateColumn =
  Database['public']['Tables']['ins_flow_draft_versions']['Row']['state']

export type AuditAction =
  | 'autosave'
  | 'manual_save'
  | 'restore'
  | 'discard_modal'
  | 'restore_pre_snapshot'

export type CreateVersionAction = Extract<
  AuditAction,
  'autosave' | 'manual_save' | 'restore_pre_snapshot'
>

export interface FlowDraftVersionRow {
  versionNumber: number
  state: PersistedFlowDraft
  reason: string | null
  createdBy: string | null
  createdAt: string
}

export interface FlowDraftAuditRow {
  versionNumber: number | null
  action: AuditAction
  reason: string | null
  changedFieldIds: string[]
  actorEmail: string | null
  createdAt: string
}

interface FlowKey {
  brand: string
  flowId: string
}

interface CreateVersionArgs extends FlowKey {
  state: PersistedFlowDraft
  reason?: string
  changedFieldIds: string[]
  actorEmail: string | null
  action: CreateVersionAction
}

interface RestoreVersionArgs extends FlowKey {
  versionNumber: number
  reason?: string
  actorEmail: string | null
}

interface RecordAuditArgs extends FlowKey {
  versionNumber: number | null
  action: AuditAction
  reason?: string
  changedFieldIds: string[]
  actorEmail: string | null
}

export async function listVersions(
  args: FlowKey
): Promise<FlowDraftVersionRow[]> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('ins_flow_draft_versions')
    .select('version_number, state, reason, created_by, created_at')
    .eq('brand', args.brand)
    .eq('flow_id', args.flowId)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('listVersions failed', {
      brand: args.brand,
      flow_id: args.flowId,
      message: error.message,
    })
    return []
  }

  if (!data) return []

  return data.map((row) => ({
    versionNumber: row.version_number,
    state: row.state as unknown as PersistedFlowDraft,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }))
}

export async function listAuditTrail(
  args: FlowKey,
  options: { limit?: number } = {}
): Promise<FlowDraftAuditRow[]> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('ins_flow_draft_audit')
    .select(
      'version_number, action, reason, changed_field_ids, actor_email, created_at'
    )
    .eq('brand', args.brand)
    .eq('flow_id', args.flowId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200)

  if (error) {
    console.error('listAuditTrail failed', {
      brand: args.brand,
      flow_id: args.flowId,
      message: error.message,
    })
    return []
  }

  if (!data) return []

  return data.map((row) => ({
    versionNumber: row.version_number,
    action: row.action as AuditAction,
    reason: row.reason,
    changedFieldIds: row.changed_field_ids ?? [],
    actorEmail: row.actor_email,
    createdAt: row.created_at,
  }))
}

export async function createVersion(
  args: CreateVersionArgs
): Promise<{ versionNumber: number }> {
  const client = createServiceRoleClient()
  const trimmedReason = trimmedOrNull(args.reason)
  const versionNumber = await nextVersionNumber(args)

  const { error } = await client.from('ins_flow_draft_versions').insert({
    brand: args.brand,
    flow_id: args.flowId,
    version_number: versionNumber,
    schema_version: FLOW_DRAFT_SCHEMA,
    state: extractPersistedFlowDraft(
      args.state
    ) as unknown as VersionStateColumn,
    reason: trimmedReason,
    created_by: args.actorEmail ?? null,
  })

  if (error) {
    console.error('createVersion failed', {
      brand: args.brand,
      flow_id: args.flowId,
      version_number: versionNumber,
      action: args.action,
      message: error.message,
    })
    throw new Error('Could not record draft version')
  }

  await recordAudit({
    brand: args.brand,
    flowId: args.flowId,
    versionNumber,
    action: args.action,
    reason: trimmedReason ?? undefined,
    changedFieldIds: args.changedFieldIds,
    actorEmail: args.actorEmail,
  })

  return { versionNumber }
}

/**
 * Restore the persisted state of `versionNumber` into the live draft.
 *
 * Idempotent: if the audit trail already shows a `restore` action with the
 * same versionNumber AND the same trimmed reason as the most recent audit
 * entry, the call returns the existing record without duplicating the
 * snapshot/audit rows. This guards against accidental double-clicks on the
 * Restore button or duplicated retries.
 */
export async function restoreVersion(
  args: RestoreVersionArgs
): Promise<{ restored: PersistedFlowDraft; newVersionNumber: number }> {
  const client = createServiceRoleClient()
  const trimmedReason = trimmedOrNull(args.reason)

  const { data: target, error: targetError } = await client
    .from('ins_flow_draft_versions')
    .select('state, schema_version')
    .eq('brand', args.brand)
    .eq('flow_id', args.flowId)
    .eq('version_number', args.versionNumber)
    .maybeSingle()

  if (targetError) {
    console.error('restoreVersion read failed', {
      brand: args.brand,
      flow_id: args.flowId,
      version_number: args.versionNumber,
      message: targetError.message,
    })
    throw new Error('Could not load the version to restore')
  }

  if (!target) {
    throw new Error(`Version ${args.versionNumber} not found`)
  }

  if (target.schema_version !== FLOW_DRAFT_SCHEMA) {
    throw new Error('Cannot restore version from older schema. Contact admin.')
  }

  const restored = target.state as unknown as PersistedFlowDraft

  // Idempotency guard: if the most recent audit row is a restore of the
  // same version with the same reason, return without writing again.
  const recentAudit = await listAuditTrail(args, { limit: 1 })
  const lastEvent = recentAudit[0]
  if (
    lastEvent &&
    lastEvent.action === 'restore' &&
    lastEvent.versionNumber === args.versionNumber &&
    (lastEvent.reason ?? null) === (trimmedReason ?? null)
  ) {
    const newest = await nextVersionNumber(args)
    return { restored, newVersionNumber: newest - 1 }
  }

  // Snapshot the current draft as `restore_pre_snapshot` so the operator
  // can restore back to it if they change their mind.
  const currentDraftRow = await readCurrentDraftState(args)
  if (currentDraftRow) {
    await createVersion({
      brand: args.brand,
      flowId: args.flowId,
      state: currentDraftRow,
      reason: 'Pre-restore snapshot',
      changedFieldIds: [],
      actorEmail: args.actorEmail,
      action: 'restore_pre_snapshot',
    })
  }

  // The new version row records the restored state under a fresh number.
  const restoredCopy = JSON.parse(
    JSON.stringify(restored)
  ) as PersistedFlowDraft
  const { versionNumber: newVersionNumber } = await createVersion({
    brand: args.brand,
    flowId: args.flowId,
    state: restoredCopy,
    reason: trimmedReason ?? undefined,
    changedFieldIds: [],
    actorEmail: args.actorEmail,
    action: 'manual_save',
  })

  await recordAudit({
    brand: args.brand,
    flowId: args.flowId,
    versionNumber: args.versionNumber,
    action: 'restore',
    reason: trimmedReason ?? undefined,
    changedFieldIds: [],
    actorEmail: args.actorEmail,
  })

  // Overwrite the live draft with the restored state.
  const { error: upsertError } = await client.from('ins_flow_drafts').upsert(
    {
      brand: args.brand,
      flow_id: args.flowId,
      schema_version: FLOW_DRAFT_SCHEMA,
      state: extractPersistedFlowDraft(
        restoredCopy
      ) as unknown as Database['public']['Tables']['ins_flow_drafts']['Row']['state'],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'brand,flow_id' }
  )

  if (upsertError) {
    console.error('restoreVersion upsert failed', {
      brand: args.brand,
      flow_id: args.flowId,
      message: upsertError.message,
    })
    throw new Error('Could not write the restored draft')
  }

  return { restored: restoredCopy, newVersionNumber }
}

export async function recordAudit(args: RecordAuditArgs): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client.from('ins_flow_draft_audit').insert({
    brand: args.brand,
    flow_id: args.flowId,
    version_number: args.versionNumber,
    action: args.action,
    reason: trimmedOrNull(args.reason),
    changed_field_ids: args.changedFieldIds,
    actor_email: args.actorEmail ?? null,
  })

  if (error) {
    console.error('recordAudit failed', {
      brand: args.brand,
      flow_id: args.flowId,
      action: args.action,
      message: error.message,
    })
    // Audit failures should not break the user-facing save path.
  }
}

async function nextVersionNumber({ brand, flowId }: FlowKey): Promise<number> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('ins_flow_draft_versions')
    .select('version_number')
    .eq('brand', brand)
    .eq('flow_id', flowId)
    .order('version_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('nextVersionNumber failed', {
      brand,
      flow_id: flowId,
      message: error.message,
    })
    return 1
  }

  const row = data?.[0]
  return (row?.version_number ?? 0) + 1
}

async function readCurrentDraftState(
  args: FlowKey
): Promise<PersistedFlowDraft | null> {
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('ins_flow_drafts')
    .select('state')
    .eq('brand', args.brand)
    .eq('flow_id', args.flowId)
    .maybeSingle()

  if (error) {
    console.error('readCurrentDraftState failed', {
      brand: args.brand,
      flow_id: args.flowId,
      message: error.message,
    })
    return null
  }

  if (!data) return null
  return data.state as unknown as PersistedFlowDraft
}

function trimmedOrNull(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}
