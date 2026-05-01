import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersistedFlowDraft } from '@/app/dashboard/flows/[flowId]/draft-persistence'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => globalThis.__mockSupabaseClient),
}))

declare global {
  var __mockSupabaseClient: ReturnType<typeof createTestClient> | undefined
}

interface VersionRow {
  brand: string
  flow_id: string
  version_number: number
  schema_version: number
  state: PersistedFlowDraft
  reason: string | null
  created_by: string | null
  created_at: string
}

interface AuditRow {
  brand: string
  flow_id: string
  version_number: number | null
  action: string
  reason: string | null
  changed_field_ids: string[]
  actor_email: string | null
  created_at: string
}

interface DraftRow {
  brand: string
  flow_id: string
  schema_version: number
  state: PersistedFlowDraft
  updated_at: string
}

function createTestClient() {
  const versions: VersionRow[] = []
  const audit: AuditRow[] = []
  const drafts: DraftRow[] = []
  let auditClock = 1

  function mkAuditTimestamp(): string {
    const stamp = new Date(
      Date.UTC(2026, 4, 4, 0, 0, 0, auditClock)
    ).toISOString()
    auditClock += 1
    return stamp
  }

  function fromVersions() {
    const where: { brand?: string; flow_id?: string; version_number?: number } =
      {}
    let orderDesc = false
    let limit: number | null = null
    let queryMode: 'select' | 'insert' = 'select'
    let insertRow: VersionRow | null = null

    const builder: Record<string, unknown> = {
      select() {
        queryMode = 'select'
        return builder
      },
      insert(row: Partial<VersionRow>) {
        queryMode = 'insert'
        const filledRow: VersionRow = {
          brand: row.brand!,
          flow_id: row.flow_id!,
          version_number: row.version_number!,
          schema_version: row.schema_version ?? 4,
          state: row.state!,
          reason: row.reason ?? null,
          created_by: row.created_by ?? null,
          created_at: row.created_at ?? mkAuditTimestamp(),
        }
        insertRow = filledRow
        return builder
      },
      eq(column: string, value: unknown) {
        ;(where as Record<string, unknown>)[column] = value
        return builder
      },
      order(_column: string, opts: { ascending: boolean }) {
        orderDesc = !opts.ascending
        return builder
      },
      limit(n: number) {
        limit = n
        return builder
      },
      maybeSingle() {
        const row = filterAndSort()[0]
        return Promise.resolve({ data: row ?? null, error: null })
      },
      then(resolve: (value: { data: unknown; error: unknown }) => void) {
        if (queryMode === 'insert' && insertRow) {
          versions.push(insertRow)
          insertRow = null
          resolve({ data: null, error: null })
          return Promise.resolve()
        }
        const rows = filterAndSort()
        resolve({ data: rows, error: null })
        return Promise.resolve()
      },
    }

    function filterAndSort(): VersionRow[] {
      let rows = versions.filter((row) => {
        for (const [k, v] of Object.entries(where)) {
          if ((row as unknown as Record<string, unknown>)[k] !== v) return false
        }
        return true
      })
      if (orderDesc) {
        rows = [...rows].sort((a, b) => b.version_number - a.version_number)
      }
      if (limit !== null) rows = rows.slice(0, limit)
      return rows
    }

    return builder
  }

  function fromAudit() {
    const where: Record<string, unknown> = {}
    let orderDesc = false
    let limit: number | null = null
    let queryMode: 'select' | 'insert' = 'select'
    let insertRow: AuditRow | null = null

    const builder: Record<string, unknown> = {
      select() {
        queryMode = 'select'
        return builder
      },
      insert(row: Partial<AuditRow>) {
        queryMode = 'insert'
        insertRow = {
          brand: row.brand!,
          flow_id: row.flow_id!,
          version_number: row.version_number ?? null,
          action: row.action!,
          reason: row.reason ?? null,
          changed_field_ids: row.changed_field_ids ?? [],
          actor_email: row.actor_email ?? null,
          created_at: row.created_at ?? mkAuditTimestamp(),
        }
        return builder
      },
      eq(column: string, value: unknown) {
        where[column] = value
        return builder
      },
      order(_column: string, opts: { ascending: boolean }) {
        orderDesc = !opts.ascending
        return builder
      },
      limit(n: number) {
        limit = n
        return builder
      },
      then(resolve: (value: { data: unknown; error: unknown }) => void) {
        if (queryMode === 'insert' && insertRow) {
          audit.push(insertRow)
          insertRow = null
          resolve({ data: null, error: null })
          return Promise.resolve()
        }
        let rows = audit.filter((row) => {
          for (const [k, v] of Object.entries(where)) {
            if ((row as unknown as Record<string, unknown>)[k] !== v)
              return false
          }
          return true
        })
        if (orderDesc) {
          rows = [...rows].sort((a, b) =>
            a.created_at < b.created_at ? 1 : -1
          )
        }
        if (limit !== null) rows = rows.slice(0, limit)
        resolve({ data: rows, error: null })
        return Promise.resolve()
      },
    }

    return builder
  }

  function fromDrafts() {
    const where: Record<string, unknown> = {}
    let queryMode: 'select' | 'upsert' = 'select'
    let upsertRow: DraftRow | null = null

    const builder: Record<string, unknown> = {
      select() {
        queryMode = 'select'
        return builder
      },
      upsert(row: Partial<DraftRow>) {
        queryMode = 'upsert'
        upsertRow = {
          brand: row.brand!,
          flow_id: row.flow_id!,
          schema_version: row.schema_version ?? 4,
          state: row.state!,
          updated_at: row.updated_at ?? mkAuditTimestamp(),
        }
        return builder
      },
      eq(column: string, value: unknown) {
        where[column] = value
        return builder
      },
      maybeSingle() {
        const row = drafts.find((draft) => {
          for (const [k, v] of Object.entries(where)) {
            if ((draft as unknown as Record<string, unknown>)[k] !== v)
              return false
          }
          return true
        })
        return Promise.resolve({ data: row ?? null, error: null })
      },
      then(resolve: (value: { data: unknown; error: unknown }) => void) {
        if (queryMode === 'upsert' && upsertRow) {
          const idx = drafts.findIndex(
            (d) =>
              d.brand === upsertRow!.brand && d.flow_id === upsertRow!.flow_id
          )
          if (idx >= 0) drafts[idx] = upsertRow
          else drafts.push(upsertRow)
          upsertRow = null
          resolve({ data: null, error: null })
          return Promise.resolve()
        }
        resolve({ data: null, error: null })
        return Promise.resolve()
      },
    }

    return builder
  }

  return {
    from(table: string) {
      if (table === 'ins_flow_draft_versions') return fromVersions()
      if (table === 'ins_flow_draft_audit') return fromAudit()
      if (table === 'ins_flow_drafts') return fromDrafts()
      throw new Error(`Unexpected table ${table}`)
    },
    seedDraft(row: DraftRow) {
      drafts.push(row)
    },
    versions,
    audit,
    drafts,
  }
}

function makeDraft(label = 'baseline'): PersistedFlowDraft {
  return {
    flow: {
      id: 'ig-organic-dm',
      brand: 'Acme',
      name: label,
      channel: 'instagram',
      draft: 1,
      published: 1,
      nodes: [],
    },
    triggers: [],
    bot: {
      name: '',
      persona: 'baseline',
      messageConstraints: '',
      forbiddenPhrases: [],
      brandGuardrails: [],
    },
    variables: [],
    versions: [],
    publishedVersion: 1,
    draftVersion: 1,
    dirtySincePublish: false,
  }
}

let mockClient: ReturnType<typeof createTestClient>

beforeEach(() => {
  mockClient = createTestClient()
  globalThis.__mockSupabaseClient = mockClient
})

afterEach(() => {
  globalThis.__mockSupabaseClient = undefined
  vi.clearAllMocks()
})

describe('flow-draft-versions service', () => {
  it('creates monotonic version numbers per (brand, flow_id)', async () => {
    const { createVersion, listVersions } =
      await import('@/lib/services/flow-draft-versions')

    const a = await createVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      state: makeDraft('v1'),
      reason: 'first',
      changedFieldIds: ['bot.persona'],
      actorEmail: 'op@example.com',
      action: 'manual_save',
    })
    const b = await createVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      state: makeDraft('v2'),
      reason: 'second',
      changedFieldIds: ['bot.persona'],
      actorEmail: 'op@example.com',
      action: 'manual_save',
    })

    expect(a.versionNumber).toBe(1)
    expect(b.versionNumber).toBe(2)

    const list = await listVersions({ brand: 'Acme', flowId: 'ig-organic-dm' })
    expect(list.map((row) => row.versionNumber)).toEqual([2, 1])
    expect(list[0]?.reason).toBe('second')
  })

  it('writes audit rows for every save action', async () => {
    const { createVersion, listAuditTrail } =
      await import('@/lib/services/flow-draft-versions')

    await createVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      state: makeDraft(),
      changedFieldIds: ['bot.persona'],
      actorEmail: null,
      action: 'manual_save',
      reason: 'reason A',
    })

    const trail = await listAuditTrail({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
    })
    expect(trail).toHaveLength(1)
    expect(trail[0]?.action).toBe('manual_save')
    expect(trail[0]?.reason).toBe('reason A')
    expect(trail[0]?.changedFieldIds).toEqual(['bot.persona'])
  })

  it('restoreVersion writes a pre-snapshot, restore audit row, and overwrites the live draft', async () => {
    const { createVersion, restoreVersion, listAuditTrail, listVersions } =
      await import('@/lib/services/flow-draft-versions')

    const v1 = makeDraft('v1')
    await createVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      state: v1,
      reason: 'first',
      changedFieldIds: [],
      actorEmail: null,
      action: 'manual_save',
    })

    // Seed the current draft so restore can snapshot it as restore_pre.
    mockClient.seedDraft({
      brand: 'Acme',
      flow_id: 'ig-organic-dm',
      schema_version: 4,
      state: makeDraft('current'),
      updated_at: new Date().toISOString(),
    })

    const result = await restoreVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      versionNumber: 1,
      reason: 'rollback test',
      actorEmail: 'op@example.com',
    })

    expect(result.restored.flow.name).toBe('v1')

    const versions = await listVersions({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
    })
    // initial v1 + restore_pre snapshot + restored copy
    expect(versions.length).toBe(3)

    const trail = await listAuditTrail({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
    })
    const actions = trail.map((row) => row.action)
    expect(actions).toContain('restore')
    expect(actions).toContain('restore_pre_snapshot')

    const restoredDraft = mockClient.drafts.find(
      (d) => d.brand === 'Acme' && d.flow_id === 'ig-organic-dm'
    )
    expect(restoredDraft?.state.flow.name).toBe('v1')
  })

  it('restoreVersion is idempotent against duplicate calls with the same reason', async () => {
    const { createVersion, restoreVersion, listAuditTrail } =
      await import('@/lib/services/flow-draft-versions')

    await createVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      state: makeDraft('v1'),
      reason: 'first',
      changedFieldIds: [],
      actorEmail: null,
      action: 'manual_save',
    })
    mockClient.seedDraft({
      brand: 'Acme',
      flow_id: 'ig-organic-dm',
      schema_version: 4,
      state: makeDraft('current'),
      updated_at: new Date().toISOString(),
    })

    await restoreVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      versionNumber: 1,
      reason: 'unique reason',
      actorEmail: 'op@example.com',
    })
    const before = await listAuditTrail({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
    })

    await restoreVersion({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
      versionNumber: 1,
      reason: 'unique reason',
      actorEmail: 'op@example.com',
    })
    const after = await listAuditTrail({
      brand: 'Acme',
      flowId: 'ig-organic-dm',
    })

    expect(after.length).toBe(before.length)
  })
})
