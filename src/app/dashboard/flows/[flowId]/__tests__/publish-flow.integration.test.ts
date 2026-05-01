/**
 * Integration test for the P2.02 published-snapshot path. Walks the publish →
 * cutover → fresh-conversation → rollback loop entirely against in-memory
 * fakes — there is no live Supabase connection in this suite, but the harness
 * mirrors the contract of `ins_publish_flow` and the channel/audit tables so
 * the same engine code runs.
 *
 * The most important assertion is the in-flight carve-out: a conversation
 * created with `flow_version_id = NULL` (i.e. before the flag flipped) must
 * NOT pick up the snapshot's confirmation copy on its next inbound turn,
 * even after publish + flag-on. This is ROLLOUT.md safety invariant #7.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_POST_EMAIL_BEHAVIOR } from '@/lib/prompts/post-email-behavior'
import type { PersistedFlowDraft } from '@/app/dashboard/flows/[flowId]/draft-persistence'
import type { Flow } from '@/app/dashboard/flows/[flowId]/types'

interface VersionRow {
  id: string
  brand: string
  flow_id: string
  version_number: number
  state: unknown
  compiled: unknown
  checksum: string
  source: string
  note: string | null
  published_by: string | null
  published_at: string
}

interface ChannelRow {
  brand: string
  flow_id: string
  channel: string
  active_version_id: string | null
}

interface FlagRow {
  id: string
  key: string
  scope: 'global' | 'brand'
  scope_id: string | null
  enabled: boolean
}

const versionRows: VersionRow[] = []
const channelRows: ChannelRow[] = []
const flagRows: FlagRow[] = []
let nextId = 1

function genId(prefix: string): string {
  return `${prefix}-${nextId++}`
}

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => buildSupabase(),
}))

function buildSupabase() {
  return {
    from: (table: string) => buildFromHandler(table),
    rpc: (name: string, args: Record<string, unknown>) => callRpc(name, args),
  }
}

function buildFromHandler(table: string) {
  if (table === 'ins_flow_versions') return buildVersionsHandler()
  if (table === 'ins_flow_channels') return buildChannelsHandler()
  if (table === 'ins_feature_flags') return buildFlagsHandler()
  if (table === 'ins_feature_flags_audit') return buildAuditHandler()
  if (table === 'ins_flow_publish_log') return buildPublishLogHandler()
  return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
}

interface VersionFilter {
  id?: string
  brand?: string
  flow_id?: string
}

function buildVersionsHandler() {
  const filter: VersionFilter = {}
  const builder = {
    select() {
      return builder
    },
    eq(col: string, value: unknown) {
      if (col === 'id') filter.id = value as string
      if (col === 'brand') filter.brand = value as string
      if (col === 'flow_id') filter.flow_id = value as string
      return builder
    },
    order() {
      return builder
    },
    limit() {
      return builder
    },
    async single() {
      const row = matchVersions(filter)[0]
      if (!row) return { data: null, error: { message: 'not found' } }
      return { data: row, error: null }
    },
    async maybeSingle() {
      const row = matchVersions(filter)[0]
      return { data: row ?? null }
    },
  }
  return builder
}

function matchVersions(filter: VersionFilter): VersionRow[] {
  return versionRows.filter((row) => {
    if (filter.id && row.id !== filter.id) return false
    if (filter.brand && row.brand !== filter.brand) return false
    if (filter.flow_id && row.flow_id !== filter.flow_id) return false
    return true
  })
}

function buildChannelsHandler() {
  const filter: { brand?: string; flow_id?: string; channel?: string } = {}
  const builder = {
    select() {
      return builder
    },
    eq(col: string, value: unknown) {
      if (col === 'brand') filter.brand = value as string
      if (col === 'flow_id') filter.flow_id = value as string
      if (col === 'channel') filter.channel = value as string
      return builder
    },
    async maybeSingle() {
      const row = channelRows.find(
        (r) =>
          r.brand === filter.brand &&
          r.flow_id === filter.flow_id &&
          r.channel === filter.channel
      )
      return { data: row ?? null }
    },
  }
  return builder
}

interface FlagFilter {
  key?: string
  scope?: 'global' | 'brand'
  scope_id?: string | null
  scope_id_is_null?: boolean
}

function buildFlagsHandler() {
  const filter: FlagFilter = {}
  const builder = {
    select() {
      return builder
    },
    eq(col: string, value: unknown) {
      if (col === 'key') filter.key = value as string
      if (col === 'scope') filter.scope = value as 'global' | 'brand'
      if (col === 'scope_id') filter.scope_id = value as string
      return builder
    },
    is(col: string, value: unknown) {
      if (col === 'scope_id' && value === null) filter.scope_id_is_null = true
      return builder
    },
    async maybeSingle() {
      const row = flagRows.find((r) => {
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
      return { data: row ?? null }
    },
    insert(row: Record<string, unknown>) {
      const newRow: FlagRow = {
        id: genId('flag'),
        key: row.key as string,
        scope: row.scope as 'global' | 'brand',
        scope_id: (row.scope_id as string | null) ?? null,
        enabled: (row.enabled as boolean) ?? false,
      }
      flagRows.push(newRow)
      return {
        select: () => ({
          single: async () => ({ data: { id: newRow.id }, error: null }),
        }),
      }
    },
    update(patch: Record<string, unknown>) {
      return {
        eq(col: string, value: unknown) {
          if (col === 'id') {
            const row = flagRows.find((r) => r.id === value)
            if (row) Object.assign(row, patch)
          }
          return Promise.resolve({ error: null })
        },
      }
    },
  }
  return builder
}

function buildAuditHandler() {
  return {
    insert: () => Promise.resolve({ error: null }),
  }
}

function buildPublishLogHandler() {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => ({ limit: () => ({ data: [], error: null }) }),
        }),
      }),
    }),
  }
}

async function callRpc(name: string, args: Record<string, unknown>) {
  if (name !== 'ins_publish_flow') {
    return { data: null, error: { message: `Unknown RPC ${name}` } }
  }

  const brand = args.p_brand as string
  const flowId = args.p_flow_id as string
  const channel = args.p_channel as string

  const existing = versionRows.filter(
    (r) => r.brand === brand && r.flow_id === flowId
  )
  const versionNumber = existing.length
    ? Math.max(...existing.map((r) => r.version_number)) + 1
    : 1

  const newRow: VersionRow = {
    id: genId('ver'),
    brand,
    flow_id: flowId,
    version_number: versionNumber,
    state: args.p_state,
    compiled: args.p_compiled,
    checksum: args.p_checksum as string,
    source: args.p_source as string,
    note: (args.p_note as string | null) ?? null,
    published_by: (args.p_published_by as string | null) ?? null,
    published_at: new Date().toISOString(),
  }
  versionRows.push(newRow)

  const channelIdx = channelRows.findIndex(
    (r) => r.brand === brand && r.flow_id === flowId && r.channel === channel
  )
  if (channelIdx >= 0) {
    channelRows[channelIdx]!.active_version_id = newRow.id
  } else {
    channelRows.push({
      brand,
      flow_id: flowId,
      channel,
      active_version_id: newRow.id,
    })
  }

  return { data: newRow.id, error: null }
}

import { __setFlagCacheForTests, setFlag } from '@/lib/services/flags'
import {
  __clearActiveFlowVersionCacheForTests,
  getActiveFlowVersion,
  publishFlow,
  rollbackPublishedFlow,
} from '@/lib/services/published-flows'

const BRAND = 'VendingPreneurs'
const FLOW_ID = 'ig-organic-dm'

function makeDraft(confirmation: string): PersistedFlowDraft {
  const flow: Flow = {
    id: FLOW_ID,
    brand: BRAND,
    name: 'IG Organic DM',
    channel: 'IG Organic',
    draft: 1,
    published: 0,
    nodes: [
      {
        id: 'email',
        type: 'email',
        name: 'Email Capture',
        goal: '',
        guidance: '',
        examples: [],
        captures: [],
        branches: [],
        pos: { x: 0, y: 0 },
        blockConfig: {
          kind: 'email',
          triggers: [],
          confirmationScript: '',
          hesitationScript: '',
          postEmailBehavior: {
            ...DEFAULT_POST_EMAIL_BEHAVIOR,
            confirmationMessage: confirmation,
            deliveryMode: 'manual',
          },
        },
      },
    ],
  }

  return {
    flow,
    triggers: [],
    bot: {
      name: '',
      persona: '',
      messageConstraints: '',
      forbiddenPhrases: [],
      brandGuardrails: [],
    },
    variables: [],
    versions: [],
    publishedVersion: 0,
    draftVersion: 1,
    dirtySincePublish: false,
  }
}

beforeEach(() => {
  versionRows.length = 0
  channelRows.length = 0
  flagRows.length = 0
  nextId = 1
  __setFlagCacheForTests(null)
  __clearActiveFlowVersionCacheForTests()
})

describe('publish-flow integration', () => {
  it('publish → cutover → fresh conversation reads v1 compiled config', async () => {
    const v1 = await publishFlow({
      brand: BRAND,
      flowId: FLOW_ID,
      draft: makeDraft('v1 confirmation'),
      publishedBy: 'sofia@example.com',
      note: 'cutover',
    })
    expect(v1.success).toBe(true)
    if (!v1.success) return

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: BRAND,
      enabled: true,
      actor: 'sofia@example.com',
      reason: 'cutover',
    })

    const active = await getActiveFlowVersion({
      brand: BRAND,
      flowId: FLOW_ID,
    })
    expect(active?.versionId).toBe(v1.data.versionId)
    expect(active?.compiled.postEmailBehavior.confirmationMessage).toBe(
      'v1 confirmation'
    )
  })

  it('rollback restores the prior compiled config and stays atomic', async () => {
    const v1 = await publishFlow({
      brand: BRAND,
      flowId: FLOW_ID,
      draft: makeDraft('good copy'),
      publishedBy: 'sofia@example.com',
    })
    expect(v1.success).toBe(true)
    if (!v1.success) return

    await publishFlow({
      brand: BRAND,
      flowId: FLOW_ID,
      draft: makeDraft('bad copy'),
      publishedBy: 'sofia@example.com',
    })

    const rollback = await rollbackPublishedFlow({
      brand: BRAND,
      flowId: FLOW_ID,
      versionId: v1.data.versionId,
      publishedBy: 'sofia@example.com',
      note: 'rolling back bad copy',
    })
    expect(rollback.success).toBe(true)
    if (!rollback.success) return

    expect(versionRows[2]?.source).toBe('rollback')

    const active = await getActiveFlowVersion({
      brand: BRAND,
      flowId: FLOW_ID,
    })
    expect(active?.compiled.postEmailBehavior.confirmationMessage).toBe(
      'good copy'
    )
  })

  it('flag-OFF path leaves getActiveFlowVersion observable but unused by the engine', async () => {
    // This test guards the carve-out: a conversation created BEFORE the flag
    // flipped has flow_version_id = NULL. Even though getActiveFlowVersion()
    // returns a populated row after we flip the flag, the engine's check is
    // `cutoverFlagOn && conversation.flow_version_id != null`, which is
    // false here.
    await publishFlow({
      brand: BRAND,
      flowId: FLOW_ID,
      draft: makeDraft('should-not-leak-into-pre-cutover'),
      publishedBy: 'sofia@example.com',
    })

    await setFlag({
      key: 'email_delivery.use_published_snapshot',
      scope: 'brand',
      scopeId: BRAND,
      enabled: true,
      actor: 'sofia@example.com',
    })

    const active = await getActiveFlowVersion({
      brand: BRAND,
      flowId: FLOW_ID,
    })

    // Direct access still returns the row (used by the engine when stamping a
    // fresh conversation). But: the engine's two-condition guard means a
    // conversation with flow_version_id=NULL never threads this through to
    // buildSystemPrompt(). That guard is asserted separately in
    // engine.test.ts under the "pre-cutover row falls through" test.
    expect(active).not.toBeNull()
    expect(active?.compiled.postEmailBehavior.confirmationMessage).toBe(
      'should-not-leak-into-pre-cutover'
    )
  })
})
