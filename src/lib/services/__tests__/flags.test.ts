import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const flagsRows: Array<{
  id: string
  key: string
  scope: 'global' | 'brand'
  scope_id: string | null
  enabled: boolean
  updated_by: string | null
  updated_at: string
}> = []

const auditRows: Array<{
  id: string
  flag_id: string
  brand: string
  action: string
  actor: string | null
  reason: string | null
  created_at: string
}> = []

let nextId = 1
function genId(prefix: string): string {
  return `${prefix}-${nextId++}`
}

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => buildFakeSupabase(),
}))

function buildFakeSupabase() {
  return {
    from: (table: string) => buildFromHandler(table),
  }
}

function buildFromHandler(table: string) {
  if (table === 'ins_feature_flags') {
    return {
      select: () => buildFlagsSelect(),
      insert: (row: Record<string, unknown>) => insertFlag(row),
      update: (patch: Record<string, unknown>) => updateFlag(patch),
    }
  }
  if (table === 'ins_feature_flags_audit') {
    return {
      insert: (row: Record<string, unknown>) => insertAudit(row),
    }
  }
  return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
}

interface FlagFilter {
  key?: string
  scope?: 'global' | 'brand'
  scope_id?: string | null
  scope_id_is_null?: boolean
}

function buildFlagsSelect() {
  const filter: FlagFilter = {}
  const builder = {
    eq(col: string, value: unknown) {
      if (col === 'key') filter.key = value as string
      if (col === 'scope') filter.scope = value as 'global' | 'brand'
      if (col === 'scope_id') filter.scope_id = value as string
      if (col === 'id') filter.scope_id = value as string // unused for select
      return builder
    },
    is(col: string, value: unknown) {
      if (col === 'scope_id' && value === null) filter.scope_id_is_null = true
      return builder
    },
    async maybeSingle() {
      const row = flagsRows.find((r) => {
        if (filter.key && r.key !== filter.key) return false
        if (filter.scope && r.scope !== filter.scope) return false
        if (filter.scope_id_is_null && r.scope_id !== null) return false
        if (
          !filter.scope_id_is_null &&
          filter.scope_id !== undefined &&
          r.scope_id !== filter.scope_id
        )
          return false
        return true
      })
      if (!row) return { data: null }
      return { data: row }
    },
    async single() {
      const result = await builder.maybeSingle()
      if (!result.data) {
        return { data: null, error: { message: 'not found' } }
      }
      return { data: result.data }
    },
  }
  return builder
}

function insertFlag(row: Record<string, unknown>) {
  const newRow = {
    id: genId('flag'),
    key: row.key as string,
    scope: row.scope as 'global' | 'brand',
    scope_id: (row.scope_id as string | null) ?? null,
    enabled: (row.enabled as boolean) ?? false,
    updated_by: (row.updated_by as string | null) ?? null,
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  }
  flagsRows.push(newRow)
  return {
    select: () => ({
      single: async () => ({ data: { id: newRow.id }, error: null }),
    }),
  }
}

function updateFlag(patch: Record<string, unknown>) {
  return {
    eq(col: string, value: unknown) {
      if (col === 'id') {
        const row = flagsRows.find((r) => r.id === value)
        if (row) {
          Object.assign(row, patch)
        }
      }
      return Promise.resolve({ error: null })
    },
  }
}

function insertAudit(row: Record<string, unknown>) {
  auditRows.push({
    id: genId('audit'),
    flag_id: row.flag_id as string,
    brand: row.brand as string,
    action: row.action as string,
    actor: (row.actor as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    created_at: new Date().toISOString(),
  })
  return Promise.resolve({ error: null })
}

import { __setFlagCacheForTests, flagOn, setFlag } from '@/lib/services/flags'

beforeEach(() => {
  flagsRows.length = 0
  auditRows.length = 0
  nextId = 1
  __setFlagCacheForTests(null)
})

afterEach(() => {
  __setFlagCacheForTests(null)
})

describe('flagOn', () => {
  it('returns false when no row exists', async () => {
    const result = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(result).toBe(false)
  })

  it('reads brand-scoped row when present', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: 'sofia@example.com',
      updated_at: new Date().toISOString(),
    })

    const result = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(result).toBe(true)
  })

  it('falls back to global when no brand row exists', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'global',
      scope_id: null,
      enabled: true,
      updated_by: 'sofia@example.com',
      updated_at: new Date().toISOString(),
    })

    const result = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(result).toBe(true)
  })

  it('brand-scoped row beats global when both exist', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'global',
      scope_id: null,
      enabled: true,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })
    flagsRows.push({
      id: 'f2',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: false,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    const result = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(result).toBe(false)
  })

  it('caches results within TTL', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    const first = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(first).toBe(true)

    // Mutate row directly without invalidating cache
    flagsRows[0]!.enabled = false

    const second = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(second).toBe(true)
  })

  it('cache is invalidated by setFlag for the same brand', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    const first = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(first).toBe(true)

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: 'VendingPreneurs',
      enabled: false,
      actor: 'sofia@example.com',
      reason: 'rolling back',
    })

    const second = await flagOn('email_delivery.use_published_snapshot', {
      brand: 'VendingPreneurs',
    })
    expect(second).toBe(false)
  })
})

describe('setFlag', () => {
  it('upserts the flag row and writes an audit entry', async () => {
    const result = await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: 'VendingPreneurs',
      enabled: true,
      actor: 'sofia@example.com',
      reason: 'cutover',
    })

    expect(result.success).toBe(true)
    expect(flagsRows).toHaveLength(1)
    expect(flagsRows[0]).toMatchObject({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: 'sofia@example.com',
    })
    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]).toMatchObject({
      action: 'enabled',
      actor: 'sofia@example.com',
      reason: 'cutover',
      brand: 'VendingPreneurs',
    })
  })

  it('action=resumed when enabling an already-enabled row', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: 'VendingPreneurs',
      enabled: true,
      actor: 'sofia@example.com',
    })

    expect(auditRows[0]?.action).toBe('resumed')
  })

  it('action=paused-manual when disabling an enabled row from operator', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: 'VendingPreneurs',
      enabled: false,
      actor: 'sofia@example.com',
      reason: 'bad copy shipped',
    })

    expect(auditRows[0]?.action).toBe('paused-manual')
  })

  it('action=paused-auto when actor is system:auto-pause', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: true,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: 'VendingPreneurs',
      enabled: false,
      actor: 'system:auto-pause',
      reason: 'bounce-rate exceeded threshold',
    })

    expect(auditRows[0]?.action).toBe('paused-auto')
    expect(auditRows[0]?.actor).toBe('system:auto-pause')
  })

  it('rejects scope=brand without scopeId', async () => {
    const result = await setFlag({
      key: 'foo',
      scope: 'brand',
      enabled: true,
      actor: 'sofia@example.com',
    })

    expect(result.success).toBe(false)
    expect(flagsRows).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('disabled action when disabling a flag that was never on', async () => {
    flagsRows.push({
      id: 'f1',
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scope_id: 'VendingPreneurs',
      enabled: false,
      updated_by: null,
      updated_at: new Date().toISOString(),
    })

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: 'VendingPreneurs',
      enabled: false,
      actor: 'sofia@example.com',
    })

    expect(auditRows[0]?.action).toBe('disabled')
  })
})
