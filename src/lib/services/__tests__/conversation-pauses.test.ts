import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/config', () => ({
  config: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test',
  },
  getSupabaseServerConfig: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  }),
}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  getActiveConversationPause,
  pauseConversationForHumanReview,
  resumeConversationFromHumanReview,
} from '@/lib/services/conversation-pauses'

type ChainResult = { data: unknown; error: unknown }
type Chain = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  __resolveTo: (result: ChainResult) => void
  // Make the builder awaitable so `await client.from(t).update().eq()` works
  // for write paths that don't terminate in `.single()`.
  then: (
    onFulfilled?: (value: ChainResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>
}

function makeChain(): Chain {
  let resolved: ChainResult = { data: null, error: null }
  const chain = {} as Chain
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolved))
  chain.single = vi.fn(() => Promise.resolve(resolved))
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolved).then(onFulfilled, onRejected)
  chain.__resolveTo = (result) => {
    resolved = result
  }
  return chain
}

function makeClient() {
  const tables: Record<string, Chain> = {}
  return {
    from: vi.fn((name: string) => {
      if (!tables[name]) tables[name] = makeChain()
      return tables[name]
    }),
    table(name: string) {
      if (!tables[name]) tables[name] = makeChain()
      return tables[name]
    },
  }
}

describe('getActiveConversationPause', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the active pause for a conversation', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: {
        id: 'pause-1',
        conversation_id: 'conv-1',
        reason: 'Hostile pattern',
        severity: 'hostile',
        requested_by: 'bot',
        requested_at: '2026-04-29T10:00:00Z',
        cleared_at: null,
      },
      error: null,
    })

    const result = await getActiveConversationPause('conv-1')

    expect(result).toEqual({
      conversationId: 'conv-1',
      reason: 'Hostile pattern',
      severity: 'hostile',
      requestedAt: '2026-04-29T10:00:00Z',
      requestedBy: 'bot',
    })
    expect(client.from).toHaveBeenCalledWith('conversation_human_review_pauses')
  })

  it('returns null when no active pause exists', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: null,
      error: null,
    })

    const result = await getActiveConversationPause('conv-1')
    expect(result).toBeNull()
  })

  it('returns null when query errors', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: null,
      error: { message: 'transient' },
    })

    const result = await getActiveConversationPause('conv-1')
    expect(result).toBeNull()
  })
})

describe('pauseConversationForHumanReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a pause row and updates conversation status to flagged', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: { id: 'pause-1' },
      error: null,
    })
    client.table('conversations').__resolveTo({ data: null, error: null })

    const result = await pauseConversationForHumanReview({
      conversationId: 'conv-1',
      reason: 'Compliance issue',
      severity: 'compliance',
      requestedBy: 'bot',
    })

    expect(result.success).toBe(true)

    const pauseChain = client.table('conversation_human_review_pauses')
    expect(pauseChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-1',
        reason: 'Compliance issue',
        severity: 'compliance',
        requested_by: 'bot',
      })
    )

    const convChain = client.table('conversations')
    expect(convChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'flagged' })
    )
  })

  it('returns error when insert fails', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: null,
      error: { message: 'unique constraint' },
    })

    const result = await pauseConversationForHumanReview({
      conversationId: 'conv-1',
      reason: 'test',
      severity: 'concern',
      requestedBy: 'bot',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('unique constraint')
    }
  })
})

describe('resumeConversationFromHumanReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks the active pause cleared and resets conversation status', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: { id: 'pause-1' },
      error: null,
    })
    client.table('conversations').__resolveTo({ data: null, error: null })

    const result = await resumeConversationFromHumanReview({
      conversationId: 'conv-1',
      clearedBy: 'james@aims',
    })

    expect(result.success).toBe(true)

    const pauseChain = client.table('conversation_human_review_pauses')
    expect(pauseChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cleared_by: 'james@aims',
      })
    )
    // Active pause filtered with .is('cleared_at', null)
    expect(pauseChain.is).toHaveBeenCalledWith('cleared_at', null)

    const convChain = client.table('conversations')
    expect(convChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    )
  })

  it('returns error when update fails', async () => {
    const client = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    client.table('conversation_human_review_pauses').__resolveTo({
      data: null,
      error: { message: 'permission denied' },
    })

    const result = await resumeConversationFromHumanReview({
      conversationId: 'conv-1',
      clearedBy: 'james@aims',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('permission denied')
    }
  })
})
