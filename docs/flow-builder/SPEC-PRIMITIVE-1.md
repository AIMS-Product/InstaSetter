# Spec — Primitive #1: Live reply preview (TDD, fully expanded)

Depends on: Week 1 (`compileBlock` merged, contract test green), Week 2 (block editor wired).

Rate limit: **500/day/user/bot**. Model: `claude-sonnet-4-6`. Cache persists in Supabase.

---

## Slice 1 — Migrations: `ins_preview_cache` + `ins_preview_usage`

### Test additions to `schema.integration.test.ts`

```ts
describe('schema — ins_preview_cache + ins_preview_usage', () => {
  const db = createServiceClient()
  beforeEach(async () => {
    await db.rpc('truncate_table', { table_name: 'ins_preview_cache' })
    await db.rpc('truncate_table', { table_name: 'ins_preview_usage' })
  })

  it('inserts a cache row keyed on checksum', async () => {
    const { data, error } = await db
      .from('ins_preview_cache')
      .insert({
        checksum: 'abc123',
        reply_text: 'Hi there',
        tokens_in: 100,
        tokens_out: 10,
        model: 'claude-sonnet-4-6',
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.checksum).toBe('abc123')
  })

  it('enforces unique checksum', async () => {
    await db.from('ins_preview_cache').insert({
      checksum: 'dup',
      reply_text: 'a',
      tokens_in: 1,
      tokens_out: 1,
      model: 'claude-sonnet-4-6',
    })
    const { error } = await db.from('ins_preview_cache').insert({
      checksum: 'dup',
      reply_text: 'b',
      tokens_in: 1,
      tokens_out: 1,
      model: 'claude-sonnet-4-6',
    })
    expect(error?.code).toBe('23505')
  })

  it('ins_preview_usage enforces (user_email, bot_id, date) unique', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'for-usage', name: 'X', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    await db.from('ins_preview_usage').insert({
      user_email: 'a@x.com',
      bot_id: flow!.id,
      date: '2026-04-18',
      count: 1,
    })
    const { error } = await db.from('ins_preview_usage').insert({
      user_email: 'a@x.com',
      bot_id: flow!.id,
      date: '2026-04-18',
      count: 1,
    })
    expect(error?.code).toBe('23505')
  })
})
```

### Impl

`supabase/migrations/20260418000002_preview.sql`

```sql
create table public.ins_preview_cache (
  id            uuid primary key default gen_random_uuid(),
  checksum      text not null unique,
  reply_text    text not null,
  tokens_in     integer not null,
  tokens_out    integer not null,
  model         text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

create index idx_preview_cache_last_used on public.ins_preview_cache (last_used_at);

create table public.ins_preview_usage (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  bot_id      uuid not null references public.ins_flows (id) on delete cascade,
  date        date not null default current_date,
  count       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint preview_usage_unique unique (user_email, bot_id, date)
);

alter table public.ins_preview_cache enable row level security;
alter table public.ins_preview_usage enable row level security;

create policy "Service role on ins_preview_cache"
  on public.ins_preview_cache for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role on ins_preview_usage"
  on public.ins_preview_usage for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

### Commits

- `test(schema): preview cache + usage`
- `feat(schema): add ins_preview_cache and ins_preview_usage`

---

## Slice 2 — Rate limit service

### Test file

`src/lib/services/__tests__/preview-rate-limit.integration.test.ts`

### Test bodies

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import {
  checkRateLimit,
  consumeRateLimit,
} from '@/lib/services/preview-rate-limit'
import { insertTestFlow } from '@/test/fixtures'

const LIMIT = 500

describe('preview rate limit', () => {
  const db = createServiceClient()

  beforeEach(async () => {
    await resetFlowBuilderTables(db)
  })

  it('new user on new day returns { used: 0, limit: 500 }', async () => {
    const flow = await insertTestFlow(db)
    const status = await checkRateLimit({
      userEmail: 'a@x.com',
      botId: flow.id,
    })
    expect(status).toMatchObject({ used: 0, limit: LIMIT, allowed: true })
  })

  it('consume bumps count by 1', async () => {
    const flow = await insertTestFlow(db)
    await consumeRateLimit({ userEmail: 'a@x.com', botId: flow.id })
    const status = await checkRateLimit({
      userEmail: 'a@x.com',
      botId: flow.id,
    })
    expect(status.used).toBe(1)
  })

  it(`returns allowed=false at ${LIMIT}`, async () => {
    const flow = await insertTestFlow(db)
    await db.from('ins_preview_usage').insert({
      user_email: 'a@x.com',
      bot_id: flow.id,
      date: new Date().toISOString().slice(0, 10),
      count: LIMIT,
    })
    const status = await checkRateLimit({
      userEmail: 'a@x.com',
      botId: flow.id,
    })
    expect(status.allowed).toBe(false)
    expect(status.used).toBe(LIMIT)
  })

  it('isolated per bot', async () => {
    const bot1 = await insertTestFlow(db, { slug: 'b1' })
    const bot2 = await insertTestFlow(db, { slug: 'b2' })
    await consumeRateLimit({ userEmail: 'a@x.com', botId: bot1.id })
    const s1 = await checkRateLimit({ userEmail: 'a@x.com', botId: bot1.id })
    const s2 = await checkRateLimit({ userEmail: 'a@x.com', botId: bot2.id })
    expect(s1.used).toBe(1)
    expect(s2.used).toBe(0)
  })

  it('date rolls at UTC midnight', async () => {
    const flow = await insertTestFlow(db)
    await db.from('ins_preview_usage').insert({
      user_email: 'a@x.com',
      bot_id: flow.id,
      date: '2026-04-17', // yesterday
      count: LIMIT,
    })
    const status = await checkRateLimit({
      userEmail: 'a@x.com',
      botId: flow.id,
      // today = whatever UTC today is
    })
    expect(status.used).toBe(0)
    expect(status.allowed).toBe(true)
  })
})
```

### Impl

`src/lib/services/preview-rate-limit.ts`

```ts
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role'

export const PREVIEW_DAILY_LIMIT = 500

interface Args {
  userEmail: string
  botId: string
  now?: Date
}

export async function checkRateLimit(args: Args): Promise<{
  used: number
  limit: number
  allowed: boolean
}> {
  const db = getSupabaseServiceRoleClient()
  const date = (args.now ?? new Date()).toISOString().slice(0, 10)
  const { data } = await db
    .from('ins_preview_usage')
    .select('count')
    .eq('user_email', args.userEmail)
    .eq('bot_id', args.botId)
    .eq('date', date)
    .maybeSingle()
  const used = data?.count ?? 0
  return {
    used,
    limit: PREVIEW_DAILY_LIMIT,
    allowed: used < PREVIEW_DAILY_LIMIT,
  }
}

export async function consumeRateLimit(args: Args): Promise<void> {
  const db = getSupabaseServiceRoleClient()
  const date = (args.now ?? new Date()).toISOString().slice(0, 10)
  // Upsert via RPC for atomic increment
  await db.rpc('increment_preview_usage', {
    p_user_email: args.userEmail,
    p_bot_id: args.botId,
    p_date: date,
  })
}
```

Supporting SQL function (in the same migration):

```sql
create or replace function public.increment_preview_usage(
  p_user_email text, p_bot_id uuid, p_date date
) returns void as $$
begin
  insert into public.ins_preview_usage (user_email, bot_id, date, count)
  values (p_user_email, p_bot_id, p_date, 1)
  on conflict (user_email, bot_id, date)
  do update set count = ins_preview_usage.count + 1, updated_at = now();
end;
$$ language plpgsql security definer;
```

### Commits

- `test(preview-rate-limit): counts, limits, per-bot isolation, UTC rollover`
- `feat(preview-rate-limit): implement with atomic increment RPC`

---

## Slice 3 — Cache service

### Test file

`src/lib/services/__tests__/preview-cache.integration.test.ts`

### Test bodies

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import {
  getCached,
  putCached,
  pruneStaleCache,
} from '@/lib/services/preview-cache'

describe('preview-cache', () => {
  const db = createServiceClient()
  beforeEach(async () => await resetFlowBuilderTables(db))

  it('get returns null when missing', async () => {
    const result = await getCached('noexist')
    expect(result).toBeNull()
  })

  it('put then get returns the cached reply', async () => {
    await putCached({
      checksum: 'ck1',
      replyText: 'Hello',
      tokensIn: 100,
      tokensOut: 10,
    })
    const result = await getCached('ck1')
    expect(result?.replyText).toBe('Hello')
  })

  it('get bumps last_used_at', async () => {
    await putCached({
      checksum: 'ck2',
      replyText: 'X',
      tokensIn: 1,
      tokensOut: 1,
    })
    const { data: before } = await db
      .from('ins_preview_cache')
      .select('last_used_at')
      .eq('checksum', 'ck2')
      .single()
    await new Promise((r) => setTimeout(r, 20))
    await getCached('ck2')
    const { data: after } = await db
      .from('ins_preview_cache')
      .select('last_used_at')
      .eq('checksum', 'ck2')
      .single()
    expect(new Date(after!.last_used_at!).getTime()).toBeGreaterThan(
      new Date(before!.last_used_at!).getTime()
    )
  })

  it('pruneStaleCache removes rows older than N days', async () => {
    await db.from('ins_preview_cache').insert([
      {
        checksum: 'old',
        reply_text: 'a',
        tokens_in: 1,
        tokens_out: 1,
        model: 'claude-sonnet-4-6',
        last_used_at: '2020-01-01T00:00:00Z',
      },
      {
        checksum: 'new',
        reply_text: 'b',
        tokens_in: 1,
        tokens_out: 1,
        model: 'claude-sonnet-4-6',
      },
    ])
    const pruned = await pruneStaleCache({ olderThanDays: 30 })
    expect(pruned).toBe(1)
    const remaining = await getCached('new')
    expect(remaining).not.toBeNull()
  })
})
```

### Impl

`src/lib/services/preview-cache.ts`

```ts
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role'

export interface CachedReply {
  replyText: string
  tokensIn: number
  tokensOut: number
}

export async function getCached(checksum: string): Promise<CachedReply | null> {
  const db = getSupabaseServiceRoleClient()
  const { data } = await db
    .from('ins_preview_cache')
    .select('reply_text, tokens_in, tokens_out')
    .eq('checksum', checksum)
    .maybeSingle()
  if (!data) return null
  // Fire-and-forget last_used_at bump
  void db
    .from('ins_preview_cache')
    .update({ last_used_at: new Date().toISOString() })
    .eq('checksum', checksum)
  return {
    replyText: data.reply_text,
    tokensIn: data.tokens_in,
    tokensOut: data.tokens_out,
  }
}

export async function putCached(args: {
  checksum: string
  replyText: string
  tokensIn: number
  tokensOut: number
  model?: string
}): Promise<void> {
  const db = getSupabaseServiceRoleClient()
  await db.from('ins_preview_cache').insert({
    checksum: args.checksum,
    reply_text: args.replyText,
    tokens_in: args.tokensIn,
    tokens_out: args.tokensOut,
    model: args.model ?? 'claude-sonnet-4-6',
  })
}

export async function pruneStaleCache(args: {
  olderThanDays: number
}): Promise<number> {
  const db = getSupabaseServiceRoleClient()
  const cutoff = new Date(
    Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000
  ).toISOString()
  const { data } = await db
    .from('ins_preview_cache')
    .delete({ count: 'exact' })
    .lt('last_used_at', cutoff)
    .select('id')
  return data?.length ?? 0
}
```

### Commits

- `test(preview-cache): get/put/pruneStale`
- `feat(preview-cache): implement with fire-and-forget last_used_at bump`

---

## Slice 4 — Prune cron

### Test

`src/app/api/cron/prune-preview-cache/__tests__/route.integration.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { GET } from '../route'

describe('prune-preview-cache cron', () => {
  const db = createServiceClient()
  beforeEach(async () => await resetFlowBuilderTables(db))

  it('401 without CRON_SECRET', async () => {
    const res = await GET(new Request('http://x', { method: 'GET' }))
    expect(res.status).toBe(401)
  })

  it('200 + prunes stale rows with correct secret', async () => {
    process.env.CRON_SECRET = 'testsecret'
    await db.from('ins_preview_cache').insert({
      checksum: 'stale',
      reply_text: 'x',
      tokens_in: 1,
      tokens_out: 1,
      model: 'claude-sonnet-4-6',
      last_used_at: '2020-01-01T00:00:00Z',
    })
    const res = await GET(
      new Request('http://x', {
        headers: { authorization: 'Bearer testsecret' },
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.pruned).toBeGreaterThanOrEqual(1)
  })
})
```

### Impl

`src/app/api/cron/prune-preview-cache/route.ts`

```ts
import { pruneStaleCache } from '@/lib/services/preview-cache'

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const pruned = await pruneStaleCache({ olderThanDays: 30 })
  return Response.json({ pruned })
}
```

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/prune-preview-cache", "schedule": "0 3 * * *" }
  ]
}
```

### Commits

- `test(cron): prune-preview-cache route`
- `feat(cron): prune stale preview cache rows daily`

---

## Slice 5 — `previewBlockReply` orchestrator

### Test file

`src/lib/services/__tests__/preview.test.ts` (unit, Claude stubbed, Supabase mocked per repo pattern)

### Test bodies

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'node:crypto'

// Mock deps before import
vi.mock('@/lib/services/preview-cache', () => ({
  getCached: vi.fn(),
  putCached: vi.fn(),
}))
vi.mock('@/lib/services/preview-rate-limit', () => ({
  checkRateLimit: vi.fn(),
  consumeRateLimit: vi.fn(),
}))
vi.mock('@/lib/services/claude', () => ({
  sendClaudeRequest: vi.fn(),
  buildClaudeRequest: vi.fn().mockReturnValue({
    model: 'claude-sonnet-4-6',
    system: 'compiled prompt',
    messages: [{ role: 'user', content: 'Dallas, got 7K' }],
    max_tokens: 64,
    tools: [],
  }),
}))

import { previewBlockReply } from '@/lib/services/preview'
import { getCached, putCached } from '@/lib/services/preview-cache'
import {
  checkRateLimit,
  consumeRateLimit,
} from '@/lib/services/preview-rate-limit'
import { sendClaudeRequest } from '@/lib/services/claude'
import {
  createTestBlock,
  createTestBot,
  createEmptyContext,
} from '@/test/fixtures'

describe('previewBlockReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockResolvedValue({
      used: 0,
      limit: 500,
      allowed: true,
    })
  })

  it('cache hit: returns reply, fromCache=true, no Claude call', async () => {
    vi.mocked(getCached).mockResolvedValue({
      replyText: 'Cached hello',
      tokensIn: 100,
      tokensOut: 5,
    })
    const result = await previewBlockReply({
      block: createTestBlock(),
      bot: createTestBot(),
      sampleProspectMessage: 'Dallas, got 7K',
      userEmail: 'a@x.com',
      botId: 'bot_1',
    })
    expect(result).toMatchObject({
      reply: 'Cached hello',
      fromCache: true,
    })
    expect(sendClaudeRequest).not.toHaveBeenCalled()
  })

  it('cache miss: calls Claude, puts cache, increments usage', async () => {
    vi.mocked(getCached).mockResolvedValue(null)
    vi.mocked(sendClaudeRequest).mockResolvedValue({
      content: [{ type: 'text', text: 'Fresh reply' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 20 },
    } as never)
    const result = await previewBlockReply({
      block: createTestBlock(),
      bot: createTestBot(),
      sampleProspectMessage: 'Dallas, got 7K',
      userEmail: 'a@x.com',
      botId: 'bot_1',
    })
    expect(result).toMatchObject({
      reply: 'Fresh reply',
      fromCache: false,
    })
    expect(sendClaudeRequest).toHaveBeenCalledOnce()
    expect(putCached).toHaveBeenCalledOnce()
    expect(consumeRateLimit).toHaveBeenCalledOnce()
  })

  it('at rate limit: returns rate_limited, no Claude call, no cache write', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      used: 500,
      limit: 500,
      allowed: false,
    })
    const result = await previewBlockReply({
      block: createTestBlock(),
      bot: createTestBot(),
      sampleProspectMessage: 'hi',
      userEmail: 'a@x.com',
      botId: 'bot_1',
    })
    expect(result).toMatchObject({ error: 'rate_limited' })
    expect(sendClaudeRequest).not.toHaveBeenCalled()
    expect(putCached).not.toHaveBeenCalled()
  })

  it('Claude throws: returns claude_error, rate limit NOT incremented', async () => {
    vi.mocked(getCached).mockResolvedValue(null)
    vi.mocked(sendClaudeRequest).mockRejectedValue(new Error('429'))
    const result = await previewBlockReply({
      block: createTestBlock(),
      bot: createTestBot(),
      sampleProspectMessage: 'hi',
      userEmail: 'a@x.com',
      botId: 'bot_1',
    })
    expect(result).toMatchObject({ error: 'claude_error' })
    expect(consumeRateLimit).not.toHaveBeenCalled()
  })

  it('checksum differs when block guidance differs', async () => {
    vi.mocked(getCached).mockResolvedValue(null)
    vi.mocked(sendClaudeRequest).mockResolvedValue({
      content: [{ type: 'text', text: 'r' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
    } as never)
    const args1 = {
      block: createTestBlock({ messageGuidance: 'A' }),
      bot: createTestBot(),
      sampleProspectMessage: 'hi',
      userEmail: 'a@x.com',
      botId: 'bot_1',
    }
    const args2 = { ...args1, block: createTestBlock({ messageGuidance: 'B' }) }
    await previewBlockReply(args1)
    await previewBlockReply(args2)
    const calls = vi.mocked(putCached).mock.calls
    expect(calls[0]![0].checksum).not.toBe(calls[1]![0].checksum)
  })
})
```

### Impl

`src/lib/services/preview.ts`

```ts
import crypto from 'node:crypto'
import { compileBlock } from '@/lib/prompts/compile-block'
import { getCached, putCached } from '@/lib/services/preview-cache'
import {
  checkRateLimit,
  consumeRateLimit,
  PREVIEW_DAILY_LIMIT,
} from '@/lib/services/preview-rate-limit'
import { buildClaudeRequest, sendClaudeRequest } from '@/lib/services/claude'
import type { BlockData, BotData, RuntimeContext } from '@/types/flow-builder'

interface Args {
  block: BlockData
  bot: BotData
  runtimeContext?: RuntimeContext
  sampleProspectMessage: string
  userEmail: string
  botId: string
}

type Result =
  | {
      reply: string
      fromCache: boolean
      usageUsed: number
      usageLimit: number
    }
  | {
      error: 'rate_limited' | 'claude_error'
      usageUsed: number
      usageLimit: number
    }

export async function previewBlockReply(args: Args): Promise<Result> {
  const rate = await checkRateLimit({
    userEmail: args.userEmail,
    botId: args.botId,
  })
  const usage = { usageUsed: rate.used, usageLimit: rate.limit }

  const ctx = args.runtimeContext ?? {
    contact: {},
    conversation: {},
    brand: {
      brand_name: args.bot.brandName,
      booking_url: args.bot.bookingUrl,
      timezone: args.bot.timezone,
    },
  }

  const compiled = compileBlock({
    block: args.block,
    bot: args.bot,
    runtimeContext: ctx,
  })
    .map((s) => s.body)
    .join('\n\n')

  const checksum = crypto
    .createHash('sha256')
    .update(compiled + '||' + args.sampleProspectMessage)
    .digest('hex')

  // Cache bypass is not gated by rate limit (free)
  const cached = await getCached(checksum)
  if (cached) {
    return { reply: cached.replyText, fromCache: true, ...usage }
  }

  if (!rate.allowed) {
    return { error: 'rate_limited', ...usage }
  }

  try {
    const req = buildClaudeRequest(compiled, [
      { role: 'user', content: args.sampleProspectMessage },
    ])
    const resp = await sendClaudeRequest({ ...req, max_tokens: 64 })
    const text = resp.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('')

    await putCached({
      checksum,
      replyText: text,
      tokensIn: resp.usage.input_tokens,
      tokensOut: resp.usage.output_tokens,
    })
    await consumeRateLimit({ userEmail: args.userEmail, botId: args.botId })

    return {
      reply: text,
      fromCache: false,
      usageUsed: rate.used + 1,
      usageLimit: PREVIEW_DAILY_LIMIT,
    }
  } catch (err) {
    return { error: 'claude_error', ...usage }
  }
}
```

### Commits

- `test(preview): cache hit/miss, rate limit, claude error, checksum variance`
- `feat(preview): orchestrator with cache + rate limit + claude call`

---

## Slice 6 — `/api/preview` route

### Test

`src/app/api/preview/__tests__/route.integration.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { insertTestFlow } from '@/test/fixtures'
import { POST } from '../route'

vi.mock('@/lib/services/preview', () => ({
  previewBlockReply: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: 'a@x.com' } },
        error: null,
      }),
    },
  }),
}))

import { previewBlockReply } from '@/lib/services/preview'

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/preview', () => {
  const db = createServiceClient()
  beforeEach(async () => {
    await resetFlowBuilderTables(db)
    vi.clearAllMocks()
  })

  it('401 when unauthenticated', async () => {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(getSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'unauth' },
        }),
      },
    } as never)
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(401)
  })

  it('400 on invalid body', async () => {
    const res = await POST(makePostRequest({ garbage: true }))
    expect(res.status).toBe(400)
  })

  it('200 on valid body with reply', async () => {
    vi.mocked(previewBlockReply).mockResolvedValue({
      reply: 'Hi',
      fromCache: false,
      usageUsed: 1,
      usageLimit: 500,
    })
    const flow = await insertTestFlow(db)
    const res = await POST(
      makePostRequest({
        block: {
          id: 'b1',
          type: 'qualifier',
          name: 'Q',
          goal: '',
          messageGuidance: '',
          exampleGood: [],
          captureRules: [],
          exitBranches: [],
        },
        bot: {
          id: 'bot1',
          brandId: 'vp',
          brandName: 'VP',
          bookingUrl: 'x',
          timezone: 't',
          personaText: 'p',
          messageConstraints: 'c',
          forbiddenPhrases: [],
        },
        sampleProspectMessage: 'hi',
        botId: flow.id,
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reply).toBe('Hi')
  })

  it('429 when rate limited', async () => {
    vi.mocked(previewBlockReply).mockResolvedValue({
      error: 'rate_limited',
      usageUsed: 500,
      usageLimit: 500,
    })
    const flow = await insertTestFlow(db)
    const res = await POST(
      makePostRequest({
        block: {
          id: 'b1',
          type: 'qualifier',
          name: 'Q',
          goal: '',
          messageGuidance: '',
          exampleGood: [],
          captureRules: [],
          exitBranches: [],
        },
        bot: {
          id: 'bot1',
          brandId: 'vp',
          brandName: 'VP',
          bookingUrl: 'x',
          timezone: 't',
          personaText: 'p',
          messageConstraints: 'c',
          forbiddenPhrases: [],
        },
        sampleProspectMessage: 'hi',
        botId: flow.id,
      })
    )
    expect(res.status).toBe(429)
  })
})
```

### Impl

`src/app/api/preview/route.ts`

```ts
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { previewBlockReply } from '@/lib/services/preview'

const BlockSchema = z.object({
  id: z.string(),
  type: z.enum([
    'opening',
    'qualifier',
    'objection',
    'email-capture',
    'booking',
    'followup',
    'escalation',
    'summary',
  ]),
  name: z.string(),
  goal: z.string(),
  messageGuidance: z.string(),
  exampleGood: z.array(z.string()),
  captureRules: z.array(z.unknown()),
  exitBranches: z.array(z.unknown()),
})

const BotSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  brandName: z.string(),
  bookingUrl: z.string().url().or(z.string()),
  timezone: z.string(),
  personaText: z.string(),
  messageConstraints: z.string(),
  forbiddenPhrases: z.array(z.string()),
})

const Input = z.object({
  block: BlockSchema,
  bot: BotSchema,
  sampleProspectMessage: z.string().min(1).max(500),
  botId: z.string().uuid(),
})

export async function POST(req: Request): Promise<Response> {
  const db = await getSupabaseServerClient()
  const { data: authData, error: authErr } = await db.auth.getUser()
  if (authErr || !authData?.user?.email) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = Input.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const result = await previewBlockReply({
    ...parsed.data,
    userEmail: authData.user.email,
  } as never)

  if ('error' in result) {
    if (result.error === 'rate_limited') {
      return Response.json(result, { status: 429 })
    }
    return Response.json(result, { status: 500 })
  }
  return Response.json(result)
}
```

### Commits

- `test(route:preview): auth, validation, rate-limit status codes`
- `feat(route:preview): POST /api/preview`

---

## Slice 7 — Seed sample prospects

### Test

`src/lib/prompts/__tests__/preview-seeds.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { PREVIEW_SEEDS } from '@/lib/prompts/preview-seeds'

describe('PREVIEW_SEEDS', () => {
  it('provides at least 2 seeds per block type', () => {
    for (const type of Object.keys(PREVIEW_SEEDS)) {
      expect(
        PREVIEW_SEEDS[type as keyof typeof PREVIEW_SEEDS].length
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('all seeds are non-empty strings', () => {
    for (const entries of Object.values(PREVIEW_SEEDS)) {
      for (const s of entries) {
        expect(typeof s).toBe('string')
        expect(s.length).toBeGreaterThan(4)
      }
    }
  })
})
```

### Impl

`src/lib/prompts/preview-seeds.ts`

```ts
import type { BlockType } from '@/types/flow-builder'

export const PREVIEW_SEEDS: Record<BlockType, string[]> = {
  opening: [
    'hey I saw your stuff about vending',
    'been watching your content for a minute',
    'Is this a scam? seems too good to be true',
  ],
  qualifier: [
    'Dallas, got about 7K saved',
    "I'm in a small town in Oklahoma, not sure it works here",
    'not sure what my budget is honestly',
  ],
  objection: [
    'sounds great but money is tight right now',
    'I need to talk to my spouse',
    "what's the actual catch here",
  ],
  'email-capture': [
    'sure, email is bob@example.com',
    "I'd rather not share my email yet",
  ],
  booking: [
    "cool, I'll grab a time",
    'just booked for Thursday',
    "the link isn't working for me",
  ],
  followup: [
    'sorry been slammed, can we reschedule?',
    'yeah the call went great',
    "I decided it's too expensive",
  ],
  escalation: ['fine, my number is 555-123-4567', 'just email me instead'],
  summary: ['thanks, talk soon', 'bye'],
}
```

### Commits

- `test(preview-seeds): 2+ seeds per block type, non-empty`
- `feat(preview-seeds): ship seed prospect messages per block type`

---

## Slice 8 — Preview panel UI + debounce

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/preview-panel.test.tsx`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewPanel from '../preview-panel'
import { createTestBlock, createTestBot } from '@/test/fixtures'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error — jsdom global fetch
  global.fetch = mockFetch
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      reply: 'Cached hi',
      fromCache: true,
      usageUsed: 4,
      usageLimit: 500,
    }),
  })
})

describe('PreviewPanel', () => {
  it('shows "No preview yet" when block guidance is empty', () => {
    render(
      <PreviewPanel
        block={createTestBlock({ messageGuidance: '', exampleGood: [] })}
        bot={createTestBot()}
        botId="bot_1"
      />
    )
    expect(screen.getByText(/No preview yet/)).toBeInTheDocument()
  })

  it('debounces preview call: no call within first 1.5s after edit', async () => {
    vi.useFakeTimers()
    render(
      <PreviewPanel
        block={createTestBlock({ messageGuidance: 'initial' })}
        bot={createTestBot()}
        botId="bot_1"
      />
    )
    // Simulate: re-render with new guidance
    // In real usage, parent controls block prop
    vi.advanceTimersByTime(1000)
    expect(mockFetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    vi.useRealTimers()
  })

  it('shows "cached" badge when fromCache is true', async () => {
    render(
      <PreviewPanel
        block={createTestBlock()}
        bot={createTestBot()}
        botId="bot_1"
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/cached/i)).toBeInTheDocument()
    )
  })

  it('shows usage counter "X of 500"', async () => {
    render(
      <PreviewPanel
        block={createTestBlock()}
        bot={createTestBot()}
        botId="bot_1"
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/4 of 500/)).toBeInTheDocument()
    )
  })

  it('shows rate-limit banner at 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'rate_limited', usageUsed: 500, usageLimit: 500,
      }),
    })
    render(
      <PreviewPanel
        block={createTestBlock()}
        bot={createTestBot()}
        botId="bot_1"
      />
    )
    await waitFor(() =>
      expect(screen.getByText(/500.*used.*today/i)).toBeInTheDocument()
    )
  })

  it('changing sample prospect dropdown fires a fresh call', async () => {
    render(
      <PreviewPanel
        block={createTestBlock({ type: 'qualifier' })}
        bot={createTestBot()}
        botId="bot_1"
      />
    )
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      // one of the PREVIEW_SEEDS[qualifier]
      "I'm in a small town in Oklahoma, not sure it works here"
    )
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })
})
```

### Impl

`src/app/dashboard/flows/[flowId]/components/preview-panel.tsx`

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { PREVIEW_SEEDS } from '@/lib/prompts/preview-seeds'
import type { BlockData, BotData } from '@/types/flow-builder'

interface Props {
  block: BlockData
  bot: BotData
  botId: string
}

interface PreviewResult {
  reply?: string
  fromCache?: boolean
  error?: string
  usageUsed: number
  usageLimit: number
}

export default function PreviewPanel({ block, bot, botId }: Props) {
  const seeds = useMemo(() => PREVIEW_SEEDS[block.type] ?? [], [block.type])
  const [sample, setSample] = useState<string>(seeds[0] ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)

  useEffect(() => {
    if (!block.messageGuidance && block.exampleGood.length === 0) return
    if (!sample) return
    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          block,
          bot,
          sampleProspectMessage: sample,
          botId,
        }),
      })
      const body = (await res.json()) as PreviewResult
      setResult(body)
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [block, bot, botId, sample])

  if (!block.messageGuidance && block.exampleGood.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted">
        No preview yet — add Message Guidance or an Example.
      </div>
    )
  }

  const rateLimited = result?.error === 'rate_limited'

  return (
    <section className="rounded-md border border-border bg-subtle/30 p-3 text-xs">
      <header className="mb-2 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide text-muted">
          💭 Sample reply
        </span>
        <span className={rateLimited ? 'text-danger' : 'text-muted'}>
          {result?.usageUsed ?? 0} of {result?.usageLimit ?? 500} today
        </span>
      </header>

      <label className="mb-2 flex items-center gap-2">
        <span className="text-muted">If prospect says:</span>
        <select
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="flex-1 rounded border border-border bg-panel px-1.5 py-0.5"
        >
          {seeds.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {rateLimited && (
        <div className="rounded bg-danger/10 p-2 text-danger">
          You've used 500 previews today — resets at midnight UTC.
        </div>
      )}

      {!rateLimited && (
        <div className="rounded bg-panel p-2">
          {loading ? (
            <span className="text-muted">Generating…</span>
          ) : (
            <>
              <p className="leading-snug">{result?.reply ?? '—'}</p>
              {result?.fromCache && (
                <span className="mt-1 inline-block rounded bg-emerald-50 px-1 py-0.5 text-[10px] text-emerald-700">
                  cached
                </span>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
```

### Commits

- `test(preview-panel): debounce, cached badge, usage counter, rate-limit banner, dropdown re-fire`
- `feat(preview-panel): live preview in Block editor`

---

## Slice 9 — E2E happy path

### Playwright test

`tests/e2e/live-preview.spec.ts`

```ts
import { test, expect } from './fixtures'

test('live preview appears after guidance edit', async ({ page, flowId }) => {
  await page.goto(`/dashboard/flows/${flowId}`)
  // Select the Qualifier block by clicking its canvas node
  await page.locator('[data-id*="qualifier"]').first().click()

  // Edit the guidance textarea
  const guidance = page.getByLabel('Message guidance', { exact: false })
  await guidance.fill('Weave naturally. Focus on motivation.')

  // Wait for debounce + preview
  await expect(page.getByText('💭 Sample reply')).toBeVisible()
  await expect(page.getByText(/Generating/)).toBeVisible({ timeout: 2500 })
  await expect(page.getByText(/Generating/)).toBeHidden({ timeout: 5000 })

  // Reply text shows
  const replyCard = page.locator('text=/If prospect says:/').locator('..')
  await expect(replyCard).toContainText(/.{10,}/)
})
```

### Commits

- `test(e2e): live preview happy path`

---

## End of Primitive #1 verification

- [ ] All `preview-*.test.ts` files green
- [ ] `/api/preview/route.ts` has 401/400/200/429 coverage
- [ ] Playwright e2e green
- [ ] Preview works from the dashboard editor in local dev
- [ ] Rate limit of 500 confirmed via manual test on localhost
- [ ] Cost check: edit guidance 30 times, confirm <$1 total Anthropic charge
