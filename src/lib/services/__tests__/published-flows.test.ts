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
  updated_by: string | null
  updated_at: string
}

interface PublishLogRow {
  id: string
  brand: string
  flow_id: string
  version_id: string
  action: string
  actor: string | null
  note: string | null
  created_at: string
}

const versionRows: VersionRow[] = []
const channelRows: ChannelRow[] = []
const publishLogRows: PublishLogRow[] = []
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
    rpc: (name: string, args: Record<string, unknown>) => callRpc(name, args),
  }
}

function buildFromHandler(table: string) {
  if (table === 'ins_flow_versions') {
    return buildVersionsHandler()
  }
  if (table === 'ins_flow_channels') {
    return buildChannelsHandler()
  }
  if (table === 'ins_flow_publish_log') {
    return buildPublishLogHandler()
  }
  return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
}

interface VersionFilter {
  id?: string
  brand?: string
  flow_id?: string
}

function buildVersionsHandler() {
  const filter: VersionFilter = {}
  let order: { col: string; ascending: boolean } | undefined
  let limit: number | undefined

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
    order(col: string, opts?: { ascending: boolean }) {
      order = { col, ascending: opts?.ascending ?? true }
      return builder
    },
    limit(n: number) {
      limit = n
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
    then(
      resolve: (value: { data: VersionRow[]; error: null }) => void,
      _reject?: (err: unknown) => void
    ) {
      let rows = matchVersions(filter)
      if (order) {
        const ord = order
        rows = [...rows].sort((a, b) => {
          const av = (a as unknown as Record<string, number>)[ord.col] ?? 0
          const bv = (b as unknown as Record<string, number>)[ord.col] ?? 0
          return ord.ascending ? av - bv : bv - av
        })
      }
      if (limit !== undefined) rows = rows.slice(0, limit)
      resolve({ data: rows, error: null })
      return undefined
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

function buildPublishLogHandler() {
  return {
    select() {
      return {
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ then: () => ({ data: [], error: null }) }),
            }),
          }),
        }),
      }
    },
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
  const updatedAt = new Date().toISOString()
  if (channelIdx >= 0) {
    channelRows[channelIdx] = {
      ...channelRows[channelIdx]!,
      active_version_id: newRow.id,
      updated_by: (args.p_published_by as string | null) ?? null,
      updated_at: updatedAt,
    }
  } else {
    channelRows.push({
      brand,
      flow_id: flowId,
      channel,
      active_version_id: newRow.id,
      updated_by: (args.p_published_by as string | null) ?? null,
      updated_at: updatedAt,
    })
  }

  const action = args.p_source === 'rollback' ? 'rollback' : 'publish'
  publishLogRows.push({
    id: genId('log'),
    brand,
    flow_id: flowId,
    version_id: newRow.id,
    action,
    actor: (args.p_published_by as string | null) ?? null,
    note: (args.p_note as string | null) ?? null,
    created_at: updatedAt,
  })

  return { data: newRow.id, error: null }
}

import {
  __clearActiveFlowVersionCacheForTests,
  getActiveFlowVersion,
  listFlowVersions,
  publishFlow,
  rollbackPublishedFlow,
} from '@/lib/services/published-flows'

function makeDraft(
  overrides: Partial<{
    confirmationMessage: string
    deliveryMode: 'none' | 'manual' | 'customerio' | 'close' | 'webhook'
  }> = {}
): PersistedFlowDraft {
  const flow: Flow = {
    id: 'ig-organic-dm',
    brand: 'VendingPreneurs',
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
            confirmationMessage:
              overrides.confirmationMessage ??
              DEFAULT_POST_EMAIL_BEHAVIOR.confirmationMessage,
            deliveryMode:
              overrides.deliveryMode ??
              DEFAULT_POST_EMAIL_BEHAVIOR.deliveryMode,
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
  publishLogRows.length = 0
  nextId = 1
  __clearActiveFlowVersionCacheForTests()
})

describe('publishFlow', () => {
  it('writes v1 with monotonic version_number on first publish', async () => {
    const result = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft(),
      publishedBy: 'sofia@example.com',
      note: 'first cutover',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.versionNumber).toBe(1)
    expect(versionRows).toHaveLength(1)
    expect(versionRows[0]?.brand).toBe('VendingPreneurs')
    expect(versionRows[0]?.flow_id).toBe('ig-organic-dm')
    expect(versionRows[0]?.source).toBe('editor')
    expect(versionRows[0]?.checksum).toBe(result.data.checksum)
  })

  it('increments version_number on each subsequent publish', async () => {
    const draft = makeDraft()
    await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft,
      publishedBy: 'sofia@example.com',
    })
    const second = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: 'updated copy' }),
      publishedBy: 'sofia@example.com',
    })

    expect(second.success).toBe(true)
    if (!second.success) return
    expect(second.data.versionNumber).toBe(2)
    expect(versionRows).toHaveLength(2)
  })

  it('updates the channel pointer to the new version', async () => {
    const result = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft(),
      publishedBy: 'sofia@example.com',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(channelRows).toHaveLength(1)
    expect(channelRows[0]?.active_version_id).toBe(result.data.versionId)
    expect(channelRows[0]?.channel).toBe('ig_organic_dm')
  })

  it('writes a publish_log entry with action=publish', async () => {
    await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft(),
      publishedBy: 'sofia@example.com',
      note: 'cutover',
    })

    expect(publishLogRows).toHaveLength(1)
    expect(publishLogRows[0]?.action).toBe('publish')
    expect(publishLogRows[0]?.note).toBe('cutover')
  })

  it('rejects drafts whose postEmailBehavior fails validation', async () => {
    const draft = makeDraft({
      confirmationMessage: '   ',
    })

    const result = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft,
      publishedBy: 'sofia@example.com',
    })

    expect(result.success).toBe(false)
    expect(versionRows).toHaveLength(0)
    expect(channelRows).toHaveLength(0)
  })

  it('rejects drafts that pair deliveryMode=none with immediate-send copy', async () => {
    const draft = makeDraft({
      confirmationMessage: 'Sending it right now',
      deliveryMode: 'none',
    })

    const result = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft,
      publishedBy: 'sofia@example.com',
    })

    expect(result.success).toBe(false)
  })
})

describe('getActiveFlowVersion', () => {
  it('returns null when no channel pointer exists', async () => {
    const active = await getActiveFlowVersion({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })
    expect(active).toBeNull()
  })

  it('returns the published version after publishFlow', async () => {
    const result = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: "Got it, I've saved that." }),
      publishedBy: 'sofia@example.com',
    })
    expect(result.success).toBe(true)

    const active = await getActiveFlowVersion({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(active?.versionNumber).toBe(1)
    expect(active?.compiled.postEmailBehavior.confirmationMessage).toBe(
      "Got it, I've saved that."
    )
  })

  it('cache is invalidated when a new publish lands', async () => {
    await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: 'first copy' }),
      publishedBy: 'sofia@example.com',
    })

    const first = await getActiveFlowVersion({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })
    expect(first?.compiled.postEmailBehavior.confirmationMessage).toBe(
      'first copy'
    )

    await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: 'second copy' }),
      publishedBy: 'sofia@example.com',
    })

    const second = await getActiveFlowVersion({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })
    expect(second?.compiled.postEmailBehavior.confirmationMessage).toBe(
      'second copy'
    )
  })
})

describe('rollbackPublishedFlow', () => {
  it('restores a prior version as a new immutable row', async () => {
    const v1 = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: 'good copy' }),
      publishedBy: 'sofia@example.com',
    })
    expect(v1.success).toBe(true)
    if (!v1.success) return

    await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: 'bad copy' }),
      publishedBy: 'sofia@example.com',
    })

    const result = await rollbackPublishedFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      versionId: v1.data.versionId,
      publishedBy: 'sofia@example.com',
      note: 'rolling back bad copy',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.versionNumber).toBe(3)
    expect(versionRows).toHaveLength(3)
    expect(versionRows[2]?.source).toBe('rollback')

    const active = await getActiveFlowVersion({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })
    expect(active?.compiled.postEmailBehavior.confirmationMessage).toBe(
      'good copy'
    )
  })

  it('refuses to roll back to a version that belongs to another brand', async () => {
    const result = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft(),
      publishedBy: 'sofia@example.com',
    })
    expect(result.success).toBe(true)
    if (!result.success) return

    const rollback = await rollbackPublishedFlow({
      brand: 'OtherBrand',
      flowId: 'ig-organic-dm',
      versionId: result.data.versionId,
      publishedBy: 'sofia@example.com',
    })

    expect(rollback.success).toBe(false)
  })
})

describe('listFlowVersions', () => {
  it('returns versions newest first with the active flag set', async () => {
    const v1 = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft(),
      publishedBy: 'sofia@example.com',
    })
    expect(v1.success).toBe(true)
    if (!v1.success) return

    const v2 = await publishFlow({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
      draft: makeDraft({ confirmationMessage: 'v2 copy' }),
      publishedBy: 'sofia@example.com',
    })
    expect(v2.success).toBe(true)

    const { versions } = await listFlowVersions({
      brand: 'VendingPreneurs',
      flowId: 'ig-organic-dm',
    })

    expect(versions).toHaveLength(2)
    expect(versions[0]?.versionNumber).toBe(2)
    expect(versions[0]?.isActive).toBe(true)
    expect(versions[1]?.versionNumber).toBe(1)
    expect(versions[1]?.isActive).toBe(false)
  })
})
