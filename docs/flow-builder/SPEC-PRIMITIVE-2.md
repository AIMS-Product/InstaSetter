# Spec — Primitive #2: Ambient triggers (TDD, fully expanded)

Depends on: Week 1 (schema, compileBlock, engine hookable), Week 2 (editor wired). Previews optional but handy for trigger preview.

Flow-level, time-based primitive. Scheduler table + Vercel cron (5-min cadence) + engine hooks. Respects Instagram's 24h messaging window with three modes: `in_window_only`, `human_agent_tag`, `wait_for_next_window`.

---

## Slice 1 — Schema: `ins_scheduled_triggers`

### Test additions to `schema.integration.test.ts`

```ts
describe('schema — ins_scheduled_triggers', () => {
  const db = createServiceClient()
  beforeEach(async () => {
    await db.rpc('truncate_table', { table_name: 'ins_scheduled_triggers' })
  })

  it('inserts with required fields', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)

    const { data, error } = await db
      .from('ins_scheduled_triggers')
      .insert({
        conversation_id: conv.id,
        contact_id: contact.id,
        flow_version_id: version.id,
        trigger_id: 'at_1',
        target_block_id: 'blk_followup',
        fires_at: new Date(Date.now() + 60_000).toISOString(),
        cancel_on: ['prospect_reply'],
        meta_send_mode: 'in_window_only',
        status: 'scheduled',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.status).toBe('scheduled')
  })

  it('rejects invalid meta_send_mode', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    const { error } = await db.from('ins_scheduled_triggers').insert({
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      trigger_id: 'x',
      target_block_id: 'x',
      fires_at: new Date().toISOString(),
      meta_send_mode: 'bogus' as any,
      status: 'scheduled',
    })
    expect(error?.code).toBe('23514')
  })

  it('partial index on (fires_at) WHERE status=scheduled exists', async () => {
    const { data } = await db.rpc('pg_indexes_on' as any, {
      table: 'ins_scheduled_triggers',
    })
    expect(String(data)).toContain('idx_sched_due')
  })

  it('cascades on conversation delete', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    await db.from('ins_scheduled_triggers').insert({
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      trigger_id: 'x',
      target_block_id: 'x',
      fires_at: new Date().toISOString(),
      meta_send_mode: 'in_window_only',
      status: 'scheduled',
    })
    await db.from('conversations').delete().eq('id', conv.id)
    const { data } = await db.from('ins_scheduled_triggers').select()
    expect(data).toEqual([])
  })
})
```

### Impl

`supabase/migrations/20260418000003_scheduled_triggers.sql`

```sql
create table public.ins_scheduled_triggers (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  contact_id        uuid not null references public.contacts (id) on delete cascade,
  flow_version_id   uuid not null references public.ins_flow_versions (id),
  trigger_id        text not null,
  target_block_id   text not null,
  fires_at          timestamptz,
  cancel_on         text[] not null default array[]::text[],
  meta_send_mode    text not null default 'in_window_only'
                    check (meta_send_mode in ('in_window_only', 'human_agent_tag', 'wait_for_next_window')),
  status            text not null default 'scheduled'
                    check (status in ('scheduled', 'fired', 'cancelled', 'failed', 'awaiting_window')),
  created_at        timestamptz not null default now(),
  fired_at          timestamptz,
  cancelled_at      timestamptz,
  cancelled_reason  text,
  error             text
);

create index idx_sched_due
  on public.ins_scheduled_triggers (fires_at)
  where status = 'scheduled';

create index idx_sched_conv_active
  on public.ins_scheduled_triggers (conversation_id)
  where status = 'scheduled';

alter table public.ins_scheduled_triggers enable row level security;

create policy "Service role on ins_scheduled_triggers"
  on public.ins_scheduled_triggers for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Helper for schema tests
create or replace function public.pg_indexes_on(table_name text)
returns text as $$
  select string_agg(indexname, ',') from pg_indexes where tablename = table_name;
$$ language sql stable;
```

### Commits

- `test(schema): ins_scheduled_triggers structure, constraints, indexes, cascade`
- `feat(schema): add ins_scheduled_triggers with partial indexes`

---

## Slice 2 — `meta-window.ts` pure functions

### Test file

`src/lib/services/__tests__/meta-window.test.ts`

### Test bodies

```ts
import { describe, it, expect } from 'vitest'
import { inWindow, resolveMode } from '@/lib/services/meta-window'

const now = new Date('2026-04-18T12:00:00Z')

describe('inWindow', () => {
  it('true when diff < 24h', () => {
    expect(
      inWindow({
        lastInboundAt: new Date('2026-04-18T08:00:00Z'),
        now,
      })
    ).toBe(true)
  })
  it('false at exactly 24h + 1s', () => {
    expect(
      inWindow({
        lastInboundAt: new Date('2026-04-17T11:59:59Z'),
        now,
      })
    ).toBe(false)
  })
  it('false when lastInboundAt is null', () => {
    expect(inWindow({ lastInboundAt: null, now })).toBe(false)
  })
})

describe('resolveMode', () => {
  const inside = new Date('2026-04-18T11:00:00Z')
  const outside = new Date('2026-04-17T00:00:00Z')

  it('in_window_only + outside → drop', () => {
    expect(
      resolveMode({
        mode: 'in_window_only',
        lastInboundAt: outside,
        now,
      })
    ).toEqual({ action: 'drop' })
  })
  it('in_window_only + inside → send with no tag', () => {
    expect(
      resolveMode({
        mode: 'in_window_only',
        lastInboundAt: inside,
        now,
      })
    ).toEqual({ action: 'send', tag: null })
  })
  it('human_agent_tag + outside → send with HUMAN_AGENT', () => {
    expect(
      resolveMode({
        mode: 'human_agent_tag',
        lastInboundAt: outside,
        now,
      })
    ).toEqual({ action: 'send', tag: 'HUMAN_AGENT' })
  })
  it('human_agent_tag + inside → send with no tag', () => {
    expect(
      resolveMode({
        mode: 'human_agent_tag',
        lastInboundAt: inside,
        now,
      })
    ).toEqual({ action: 'send', tag: null })
  })
  it('wait_for_next_window + outside → defer', () => {
    expect(
      resolveMode({
        mode: 'wait_for_next_window',
        lastInboundAt: outside,
        now,
      })
    ).toEqual({ action: 'defer' })
  })
  it('wait_for_next_window + inside → send with no tag', () => {
    expect(
      resolveMode({
        mode: 'wait_for_next_window',
        lastInboundAt: inside,
        now,
      })
    ).toEqual({ action: 'send', tag: null })
  })
})
```

### Impl

`src/lib/services/meta-window.ts`

```ts
const WINDOW_MS = 24 * 60 * 60 * 1000

type MetaMode = 'in_window_only' | 'human_agent_tag' | 'wait_for_next_window'
type Resolution =
  | { action: 'send'; tag: 'HUMAN_AGENT' | null }
  | { action: 'drop' }
  | { action: 'defer' }

export function inWindow(args: {
  lastInboundAt: Date | null
  now: Date
}): boolean {
  if (!args.lastInboundAt) return false
  return args.now.getTime() - args.lastInboundAt.getTime() < WINDOW_MS
}

export function resolveMode(args: {
  mode: MetaMode
  lastInboundAt: Date | null
  now: Date
}): Resolution {
  const inside = inWindow(args)
  if (inside) return { action: 'send', tag: null }
  switch (args.mode) {
    case 'in_window_only':
      return { action: 'drop' }
    case 'human_agent_tag':
      return { action: 'send', tag: 'HUMAN_AGENT' }
    case 'wait_for_next_window':
      return { action: 'defer' }
  }
}
```

### Commits

- `test(meta-window): inWindow + resolveMode covers all mode×window combos`
- `feat(meta-window): implement Meta 24h window resolver`

---

## Slice 3 — `scheduleAmbientTriggersForBlock`

### Test file

`src/lib/services/__tests__/scheduler-schedule.integration.test.ts`

### Test bodies

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { scheduleAmbientTriggersForBlock } from '@/lib/services/scheduler'
import {
  insertTestFlow,
  insertTestFlowVersion,
  insertTestContact,
  insertTestConversation,
} from '@/test/fixtures'
import type { AmbientTrigger } from '@/types/flow-builder'

function makeTrigger(overrides: Partial<AmbientTrigger> = {}): AmbientTrigger {
  return {
    id: 'at_1',
    name: 'test',
    triggerOn: { type: 'block_entered', blockId: 'blk_booking' },
    delay: { amount: 60, unit: 'minute' },
    cancelOn: ['prospect_reply'],
    conditions: [],
    targetBlockId: 'blk_followup',
    metaSendMode: 'in_window_only',
    ...overrides,
  }
}

describe('scheduleAmbientTriggersForBlock', () => {
  const db = createServiceClient()
  beforeEach(async () => await resetFlowBuilderTables(db))

  async function setup(triggers: AmbientTrigger[]) {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id, {
      graph: {
        nodes: [],
        edges: [],
        ambientTriggers: triggers,
      } as unknown as Record<string, unknown>,
    })
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    return { flow, version, contact, conv }
  }

  it('inserts a row for each matching trigger', async () => {
    const { version, contact, conv } = await setup([
      makeTrigger({ id: 'at_1' }),
      makeTrigger({ id: 'at_2' }),
    ])
    await scheduleAmbientTriggersForBlock({
      conversationId: conv.id,
      contactId: contact.id,
      flowVersionId: version.id,
      blockId: 'blk_booking',
      now: new Date('2026-04-18T12:00:00Z'),
    })
    const { data } = await db.from('ins_scheduled_triggers').select()
    expect(data).toHaveLength(2)
  })

  it('skips triggers that do not match the entered block', async () => {
    const { version, contact, conv } = await setup([
      makeTrigger({
        id: 'at_1',
        triggerOn: { type: 'block_entered', blockId: 'blk_other' },
      }),
    ])
    await scheduleAmbientTriggersForBlock({
      conversationId: conv.id,
      contactId: contact.id,
      flowVersionId: version.id,
      blockId: 'blk_booking',
      now: new Date(),
    })
    const { data } = await db.from('ins_scheduled_triggers').select()
    expect(data).toEqual([])
  })

  it('honors delay.amount/unit', async () => {
    const now = new Date('2026-04-18T12:00:00Z')
    const { version, contact, conv } = await setup([
      makeTrigger({ delay: { amount: 2, unit: 'hour' } }),
    ])
    await scheduleAmbientTriggersForBlock({
      conversationId: conv.id,
      contactId: contact.id,
      flowVersionId: version.id,
      blockId: 'blk_booking',
      now,
    })
    const { data } = await db
      .from('ins_scheduled_triggers')
      .select('fires_at')
      .single()
    const expected = new Date(now.getTime() + 2 * 60 * 60_000).toISOString()
    expect(data!.fires_at).toBe(expected)
  })

  it('copies cancel_on and meta_send_mode', async () => {
    const { version, contact, conv } = await setup([
      makeTrigger({
        cancelOn: ['prospect_reply', 'conversation_closed'],
        metaSendMode: 'human_agent_tag',
      }),
    ])
    await scheduleAmbientTriggersForBlock({
      conversationId: conv.id,
      contactId: contact.id,
      flowVersionId: version.id,
      blockId: 'blk_booking',
      now: new Date(),
    })
    const { data } = await db.from('ins_scheduled_triggers').select().single()
    expect(data!.cancel_on).toEqual(['prospect_reply', 'conversation_closed'])
    expect(data!.meta_send_mode).toBe('human_agent_tag')
  })

  it('idempotent: scheduling twice for same (conv, trigger) produces one row', async () => {
    const { version, contact, conv } = await setup([makeTrigger()])
    await scheduleAmbientTriggersForBlock({
      conversationId: conv.id,
      contactId: contact.id,
      flowVersionId: version.id,
      blockId: 'blk_booking',
      now: new Date(),
    })
    await scheduleAmbientTriggersForBlock({
      conversationId: conv.id,
      contactId: contact.id,
      flowVersionId: version.id,
      blockId: 'blk_booking',
      now: new Date(),
    })
    const { data } = await db.from('ins_scheduled_triggers').select()
    expect(data).toHaveLength(1)
  })
})
```

### Impl

`src/lib/services/scheduler.ts`

```ts
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role'
import type { AmbientTrigger, FlowGraph } from '@/types/flow-builder'

function delayToMs(delay: AmbientTrigger['delay']): number {
  const mult = { minute: 60_000, hour: 3_600_000, day: 86_400_000 }[delay.unit]
  return delay.amount * mult
}

export async function scheduleAmbientTriggersForBlock(args: {
  conversationId: string
  contactId: string
  flowVersionId: string
  blockId: string
  now?: Date
}): Promise<{ scheduled: number }> {
  const db = getSupabaseServiceRoleClient()
  const now = args.now ?? new Date()

  const { data: version } = await db
    .from('ins_flow_versions')
    .select('graph')
    .eq('id', args.flowVersionId)
    .maybeSingle()
  if (!version) return { scheduled: 0 }

  const graph = version.graph as unknown as FlowGraph
  const matches = (graph.ambientTriggers ?? []).filter(
    (t) =>
      t.triggerOn.type === 'block_entered' &&
      t.triggerOn.blockId === args.blockId
  )
  if (matches.length === 0) return { scheduled: 0 }

  let scheduled = 0
  for (const t of matches) {
    const fires_at = new Date(now.getTime() + delayToMs(t.delay)).toISOString()
    const { error } = await db.from('ins_scheduled_triggers').insert({
      conversation_id: args.conversationId,
      contact_id: args.contactId,
      flow_version_id: args.flowVersionId,
      trigger_id: t.id,
      target_block_id: t.targetBlockId,
      fires_at,
      cancel_on: t.cancelOn,
      meta_send_mode: t.metaSendMode,
      status: 'scheduled',
    })
    // Idempotency guard via partial unique index on (conversation_id, trigger_id) WHERE status='scheduled'
    if (!error) scheduled++
  }
  return { scheduled }
}
```

Add to migration:

```sql
create unique index idx_sched_conv_trigger_unique
  on public.ins_scheduled_triggers (conversation_id, trigger_id)
  where status = 'scheduled';
```

### Commits

- `test(scheduler): schedule matches block, copies fields, honors delay, idempotent`
- `feat(scheduler): scheduleAmbientTriggersForBlock`
- `feat(schema): unique index for scheduled trigger idempotency`

---

## Slice 4 — `cancelTriggersForConversation`

### Test file

`src/lib/services/__tests__/scheduler-cancel.integration.test.ts`

### Test bodies

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { cancelTriggersForConversation } from '@/lib/services/scheduler'
import {
  insertTestFlow,
  insertTestFlowVersion,
  insertTestContact,
  insertTestConversation,
  insertTestTrigger,
} from '@/test/fixtures'

describe('cancelTriggersForConversation', () => {
  const db = createServiceClient()
  beforeEach(async () => await resetFlowBuilderTables(db))

  it('cancels rows where cancel_on includes prospect_reply', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    const trg = await insertTestTrigger(db, {
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      cancel_on: ['prospect_reply'],
    })

    const result = await cancelTriggersForConversation({
      conversationId: conv.id,
      reason: 'prospect_reply',
    })
    expect(result.cancelled).toBe(1)

    const { data } = await db
      .from('ins_scheduled_triggers')
      .select()
      .eq('id', trg.id)
      .single()
    expect(data?.status).toBe('cancelled')
    expect(data?.cancelled_reason).toBe('prospect_reply')
  })

  it('does not touch rows where cancel_on excludes prospect_reply', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    await insertTestTrigger(db, {
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      cancel_on: ['conversation_closed'],
    })
    const result = await cancelTriggersForConversation({
      conversationId: conv.id,
      reason: 'prospect_reply',
    })
    expect(result.cancelled).toBe(0)
  })

  it('does not touch already-fired rows', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    const trg = await insertTestTrigger(db, {
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      cancel_on: ['prospect_reply'],
      status: 'fired',
    })
    await cancelTriggersForConversation({
      conversationId: conv.id,
      reason: 'prospect_reply',
    })
    const { data } = await db
      .from('ins_scheduled_triggers')
      .select()
      .eq('id', trg.id)
      .single()
    expect(data?.status).toBe('fired')
  })
})
```

### Impl (add to `scheduler.ts`)

```ts
export async function cancelTriggersForConversation(args: {
  conversationId: string
  reason: 'prospect_reply' | 'conversation_closed'
}): Promise<{ cancelled: number }> {
  const db = getSupabaseServiceRoleClient()
  const { data, error } = await db
    .from('ins_scheduled_triggers')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: args.reason,
    })
    .eq('conversation_id', args.conversationId)
    .eq('status', 'scheduled')
    .contains('cancel_on', [args.reason])
    .select('id')
  if (error) return { cancelled: 0 }
  return { cancelled: data?.length ?? 0 }
}
```

### Commits

- `test(scheduler): cancelTriggersForConversation respects cancel_on and status`
- `feat(scheduler): cancelTriggersForConversation`

---

## Slice 5 — `fireDueTriggers`

### Test file

`src/lib/services/__tests__/scheduler-fire.integration.test.ts`

### Test bodies

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { fireDueTriggers } from '@/lib/services/scheduler'
import { sendPulseStub } from '@/test/sendpulse-stub'
import {
  insertTestFlow,
  insertTestFlowVersion,
  insertTestContact,
  insertTestConversation,
  insertTestTrigger,
} from '@/test/fixtures'

vi.mock('@/lib/services/sendpulse', async () => {
  const real = await vi.importActual<typeof import('@/lib/services/sendpulse')>(
    '@/lib/services/sendpulse'
  )
  return {
    ...real,
    sendInstagramMessage: (
      cid: string,
      text: string,
      opts?: { messageTag?: 'HUMAN_AGENT' }
    ) => sendPulseStub.sendInstagramMessage(cid, text, opts),
  }
})

// Claude stub for rendering target block replies in fire loop
vi.mock('@/lib/services/claude', async () => {
  const real = await vi.importActual<typeof import('@/lib/services/claude')>(
    '@/lib/services/claude'
  )
  return {
    ...real,
    sendClaudeRequest: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Hey, checking in' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 50, output_tokens: 10 },
    }),
  }
})

describe('fireDueTriggers', () => {
  const db = createServiceClient()
  beforeEach(async () => {
    await resetFlowBuilderTables(db)
    sendPulseStub.reset()
  })

  async function setupDueTrigger(
    opts: { mode?: string; firedAgo?: number; lastInboundAgoMin?: number } = {}
  ) {
    const firedAgo = opts.firedAgo ?? 5_000
    const lastInbound = opts.lastInboundAgoMin ?? 60
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id, {
      last_message_at: new Date(
        Date.now() - lastInbound * 60_000
      ).toISOString(),
    } as never)
    const trg = await insertTestTrigger(db, {
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      fires_at: new Date(Date.now() - firedAgo).toISOString(),
      meta_send_mode: (opts.mode ?? 'in_window_only') as never,
    })
    return { flow, version, contact, conv, trg }
  }

  it('fires due trigger, marks row=fired, sends via SendPulse', async () => {
    const { trg, contact } = await setupDueTrigger()
    const result = await fireDueTriggers({ now: new Date() })
    expect(result.fired).toBe(1)
    expect(sendPulseStub.calls).toHaveLength(1)
    expect(sendPulseStub.calls[0]!.contactId).toBe(contact.inro_contact_id)
    const { data } = await db
      .from('ins_scheduled_triggers')
      .select()
      .eq('id', trg.id)
      .single()
    expect(data?.status).toBe('fired')
  })

  it('ignores rows where fires_at > now', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    const contact = await insertTestContact(db)
    const conv = await insertTestConversation(db, contact.id)
    await insertTestTrigger(db, {
      conversation_id: conv.id,
      contact_id: contact.id,
      flow_version_id: version.id,
      fires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    const result = await fireDueTriggers({ now: new Date() })
    expect(result.fired).toBe(0)
  })

  it('limit 100 per call', async () => {
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    for (let i = 0; i < 105; i++) {
      const contact = await insertTestContact(db, {
        instagram_handle: `u${i}_${Date.now()}`,
      })
      const conv = await insertTestConversation(db, contact.id)
      await insertTestTrigger(db, {
        conversation_id: conv.id,
        contact_id: contact.id,
        flow_version_id: version.id,
        trigger_id: `t${i}`,
        fires_at: new Date(Date.now() - 1000).toISOString(),
      })
    }
    const result = await fireDueTriggers({ now: new Date() })
    expect(result.fired).toBeLessThanOrEqual(100)
  })

  it('FOR UPDATE SKIP LOCKED: concurrent calls divide work', async () => {
    // 10 due triggers, two concurrent callers
    const flow = await insertTestFlow(db)
    const version = await insertTestFlowVersion(db, flow.id)
    for (let i = 0; i < 10; i++) {
      const contact = await insertTestContact(db, {
        instagram_handle: `c${i}_${Date.now()}`,
      })
      const conv = await insertTestConversation(db, contact.id)
      await insertTestTrigger(db, {
        conversation_id: conv.id,
        contact_id: contact.id,
        flow_version_id: version.id,
        trigger_id: `t${i}`,
        fires_at: new Date(Date.now() - 1000).toISOString(),
      })
    }
    const [a, b] = await Promise.all([
      fireDueTriggers({ now: new Date() }),
      fireDueTriggers({ now: new Date() }),
    ])
    expect(a.fired + b.fired).toBe(10)
  })

  it('Meta window: in_window_only outside → cancelled with reason=outside_meta_window', async () => {
    const { trg } = await setupDueTrigger({
      mode: 'in_window_only',
      lastInboundAgoMin: 25 * 60, // 25 hours ago → outside
    })
    const result = await fireDueTriggers({ now: new Date() })
    expect(result.fired).toBe(0)
    expect(result.skippedMetaWindow).toBe(1)
    const { data } = await db
      .from('ins_scheduled_triggers')
      .select()
      .eq('id', trg.id)
      .single()
    expect(data?.status).toBe('cancelled')
    expect(data?.cancelled_reason).toBe('outside_meta_window')
  })

  it('Meta window: human_agent_tag outside → sends with HUMAN_AGENT tag', async () => {
    await setupDueTrigger({
      mode: 'human_agent_tag',
      lastInboundAgoMin: 25 * 60,
    })
    const result = await fireDueTriggers({ now: new Date() })
    expect(result.fired).toBe(1)
    expect(sendPulseStub.calls[0]!.messageTag).toBe('HUMAN_AGENT')
  })

  it('Meta window: wait_for_next_window outside → defer (status=awaiting_window, fires_at=null)', async () => {
    const { trg } = await setupDueTrigger({
      mode: 'wait_for_next_window',
      lastInboundAgoMin: 25 * 60,
    })
    await fireDueTriggers({ now: new Date() })
    const { data } = await db
      .from('ins_scheduled_triggers')
      .select()
      .eq('id', trg.id)
      .single()
    expect(data?.status).toBe('awaiting_window')
    expect(data?.fires_at).toBeNull()
  })

  it('SendPulse error: marks row=failed with error message', async () => {
    sendPulseStub.setNextResult({ success: false, error: 'network timeout' })
    const { trg } = await setupDueTrigger()
    const result = await fireDueTriggers({ now: new Date() })
    expect(result.failed).toBe(1)
    const { data } = await db
      .from('ins_scheduled_triggers')
      .select()
      .eq('id', trg.id)
      .single()
    expect(data?.status).toBe('failed')
    expect(data?.error).toContain('network timeout')
  })
})
```

### Impl (add to `scheduler.ts`)

```ts
import { resolveMode } from '@/lib/services/meta-window'
import { sendInstagramMessage } from '@/lib/services/sendpulse'
import { compileBlock } from '@/lib/prompts/compile-block'
import { buildClaudeRequest, sendClaudeRequest } from '@/lib/services/claude'
// plus bot/context loading helpers

export async function fireDueTriggers(args: {
  now?: Date
  limit?: number
}): Promise<{
  fired: number
  failed: number
  skippedMetaWindow: number
  deferred: number
}> {
  const db = getSupabaseServiceRoleClient()
  const now = args.now ?? new Date()
  const limit = args.limit ?? 100

  // Lock and select due rows
  const { data: rows } = await db.rpc('claim_due_triggers', {
    p_now: now.toISOString(),
    p_limit: limit,
  })
  if (!rows || rows.length === 0) {
    return { fired: 0, failed: 0, skippedMetaWindow: 0, deferred: 0 }
  }

  let fired = 0,
    failed = 0,
    skippedMetaWindow = 0,
    deferred = 0

  for (const row of rows as Array<{
    id: string
    conversation_id: string
    contact_id: string
    flow_version_id: string
    target_block_id: string
    meta_send_mode:
      | 'in_window_only'
      | 'human_agent_tag'
      | 'wait_for_next_window'
  }>) {
    try {
      const ctx = await loadContext(db, row.conversation_id, row.contact_id)
      const resolution = resolveMode({
        mode: row.meta_send_mode,
        lastInboundAt: ctx.lastInboundAt,
        now,
      })

      if (resolution.action === 'drop') {
        await db
          .from('ins_scheduled_triggers')
          .update({
            status: 'cancelled',
            cancelled_at: now.toISOString(),
            cancelled_reason: 'outside_meta_window',
          })
          .eq('id', row.id)
        skippedMetaWindow++
        continue
      }

      if (resolution.action === 'defer') {
        await db
          .from('ins_scheduled_triggers')
          .update({ status: 'awaiting_window', fires_at: null })
          .eq('id', row.id)
        deferred++
        continue
      }

      const reply = await renderBlockReply(
        db,
        row.flow_version_id,
        row.target_block_id,
        ctx
      )
      const sendResult = await sendInstagramMessage(
        ctx.inroContactId,
        reply,
        resolution.tag ? { messageTag: resolution.tag } : undefined
      )
      if (!sendResult.success) {
        await db
          .from('ins_scheduled_triggers')
          .update({ status: 'failed', error: sendResult.error ?? 'unknown' })
          .eq('id', row.id)
        failed++
        continue
      }

      await db
        .from('ins_scheduled_triggers')
        .update({ status: 'fired', fired_at: now.toISOString() })
        .eq('id', row.id)
      fired++
    } catch (err) {
      await db
        .from('ins_scheduled_triggers')
        .update({ status: 'failed', error: String(err) })
        .eq('id', row.id)
      failed++
    }
  }

  return { fired, failed, skippedMetaWindow, deferred }
}

async function loadContext(db: any, conversationId: string, contactId: string) {
  // ... load last inbound time, inro_contact_id, contact tags, runtime vars
  return { lastInboundAt: null as Date | null, inroContactId: '' }
}

async function renderBlockReply(
  db: any,
  flowVersionId: string,
  blockId: string,
  ctx: any
) {
  // ... load block from graph, compile, call Claude, extract text
  return ''
}
```

SQL for atomic claim:

```sql
create or replace function public.claim_due_triggers(p_now timestamptz, p_limit int)
returns setof public.ins_scheduled_triggers as $$
  with due as (
    select id
    from public.ins_scheduled_triggers
    where status = 'scheduled' and fires_at <= p_now
    order by fires_at
    for update skip locked
    limit p_limit
  )
  update public.ins_scheduled_triggers
  set status = 'scheduled' -- no-op; just locks the rows for this caller
  where id in (select id from due)
  returning *;
$$ language sql;
```

### Commits

- `test(scheduler): fireDueTriggers happy + meta modes + SKIP LOCKED + limit + failure`
- `feat(scheduler): fireDueTriggers with atomic claim + Meta window resolver`
- `feat(schema): claim_due_triggers RPC for FOR UPDATE SKIP LOCKED`

---

## Slice 6 — `/api/cron/fire-triggers` route

### Test

`src/app/api/cron/fire-triggers/__tests__/route.integration.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from '../route'

vi.mock('@/lib/services/scheduler', () => ({
  fireDueTriggers: vi.fn().mockResolvedValue({
    fired: 3,
    failed: 1,
    skippedMetaWindow: 0,
    deferred: 0,
  }),
}))

describe('GET /api/cron/fire-triggers', () => {
  it('401 without Authorization header', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(401)
  })

  it('401 with wrong secret', async () => {
    process.env.CRON_SECRET = 'correct'
    const res = await GET(
      new Request('http://x', {
        headers: { authorization: 'Bearer wrong' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('200 with correct secret returns counts', async () => {
    process.env.CRON_SECRET = 'right'
    const res = await GET(
      new Request('http://x', {
        headers: { authorization: 'Bearer right' },
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ fired: 3, failed: 1 })
  })
})
```

### Impl

`src/app/api/cron/fire-triggers/route.ts`

```ts
import { fireDueTriggers } from '@/lib/services/scheduler'

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await fireDueTriggers({ now: new Date() })
  return Response.json(result)
}
```

Add to `vercel.json`:

```json
{ "path": "/api/cron/fire-triggers", "schedule": "*/5 * * * *" }
```

### Commits

- `test(cron): fire-triggers auth + returns counts`
- `feat(cron): fire-triggers endpoint wired to scheduler`
- `chore(vercel): schedule fire-triggers every 5 min`

---

## Slices 7-9 — Engine integration (schedule/cancel hooks)

### Test file

`src/lib/services/__tests__/engine-triggers.integration.test.ts`

### Test bodies (abridged — 4 tests)

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'

vi.mock('@/lib/services/scheduler', () => ({
  scheduleAmbientTriggersForBlock: vi.fn().mockResolvedValue({ scheduled: 1 }),
  cancelTriggersForConversation: vi.fn().mockResolvedValue({ cancelled: 0 }),
  fireDueTriggers: vi.fn(),
}))

import { processInboundMessage } from '@/lib/services/engine'
import {
  scheduleAmbientTriggersForBlock,
  cancelTriggersForConversation,
} from '@/lib/services/scheduler'

describe('engine ↔ scheduler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('on inbound message, cancelTriggersForConversation is called first', async () => {
    // arrange: conversation exists, seed flow
    // act: call processInboundMessage('hello')
    // assert: cancelTriggersForConversation called with reason='prospect_reply'
    // and called BEFORE the Claude send path
    // (order asserted via vi.mock side-effect log)
  })

  it('on block entry during reply, scheduleAmbientTriggersForBlock fires', async () => {
    // arrange: flow with block_entered trigger on 'blk_booking'
    // act: run engine so it enters blk_booking
    // assert: scheduleAmbientTriggersForBlock called with blockId='blk_booking'
  })

  it('on conversation close (generate_summary tool), cancel all pending', async () => {
    // arrange: pending trigger
    // act: run engine that fires generate_summary tool
    // assert: cancelTriggersForConversation called with reason='conversation_closed'
  })

  it('engine treats scheduler failures non-fatally (try/catch wrapping)', async () => {
    vi.mocked(scheduleAmbientTriggersForBlock).mockRejectedValueOnce(
      new Error('db down')
    )
    // act: engine completes reply normally despite scheduler throwing
    // assert: prod reply still sent, error logged (not thrown)
  })
})
```

### Impl sketch in `engine.ts`

```ts
// Near the top of processInboundMessage, after loading conversation:
try {
  await cancelTriggersForConversation({
    conversationId: conversation.id,
    reason: 'prospect_reply',
  })
} catch (err) {
  // Log, don't throw — ambient trigger errors cannot kill prod replies
  logSentry('scheduler.cancel.failed', { err, conversationId })
}

// After Claude generates a reply and we've determined the current block id:
try {
  await scheduleAmbientTriggersForBlock({
    conversationId: conversation.id,
    contactId: contact.id,
    flowVersionId: conversation.flow_version_id,
    blockId: currentBlockId,
  })
} catch (err) {
  logSentry('scheduler.schedule.failed', { err, conversationId })
}

// In the generate_summary tool handler, when closing the conversation:
try {
  await cancelTriggersForConversation({
    conversationId: conversation.id,
    reason: 'conversation_closed',
  })
} catch (err) {
  logSentry('scheduler.cancel.close.failed', { err, conversationId })
}
```

### Commits

- `test(engine-triggers): cancel on inbound, schedule on block entry, cancel on close, errors non-fatal`
- `feat(engine): wire schedule + cancel hooks behind flow_engine.ambient_triggers flag`
- `feat(engine): flag-gate ambient triggers off by default in prod`

---

## Slice 10 — SendPulse tag passthrough

### Test

`src/lib/services/__tests__/sendpulse.test.ts` (add to existing file)

```ts
describe('sendInstagramMessage', () => {
  it('passes message_tag when provided', async () => {
    // mock fetch, assert the JSON body includes { messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' }
  })

  it('omits message_tag when not provided', async () => {
    // assert body has no messaging_type or tag keys
  })
})
```

### Impl

`src/lib/services/sendpulse.ts` — add optional `opts?: { messageTag?: 'HUMAN_AGENT' }` to `sendInstagramMessage`, pass through to SendPulse's `message_tag` field per their IG message tag docs.

### Commits

- `test(sendpulse): message_tag passthrough`
- `feat(sendpulse): support message_tag for out-of-window sends`

---

## Slice 11 — `ambientTriggers` in graph jsonb

Already designed in `types/flow-builder.ts`. Slice work:

- Update `compileBlock` contract test to ignore ambient triggers (they don't appear in block-level prompt)
- Update `validateFlowForPublish` (Week 2 Slice 8) to check every trigger's `targetBlockId` references an existing node. Tests in `flow-validator.test.ts`.

```ts
it('validates ambientTriggers.targetBlockId exists', () => {
  const graph: FlowGraph = {
    nodes: [
      {
        id: 'n1',
        position: { x: 0, y: 0 },
        block: { ...createTestBlock(), id: 'n1' },
      },
    ],
    edges: [],
    ambientTriggers: [
      {
        id: 'at_1',
        name: 't',
        triggerOn: { type: 'block_entered', blockId: 'n1' },
        delay: { amount: 1, unit: 'hour' },
        cancelOn: [],
        conditions: [],
        targetBlockId: 'nonexistent',
        metaSendMode: 'in_window_only',
      },
    ],
  }
  const issues = validateFlowForPublish(graph)
  expect(issues.some((i) => i.includes('nonexistent'))).toBe(true)
})
```

### Commits

- `test(flow-validator): ambient trigger targetBlockId must exist`
- `feat(flow-validator): validate ambient trigger targets`

---

## Slice 12 — UI: Ambient Triggers section on Flow

### Component test

`src/app/dashboard/flows/[flowId]/components/__tests__/ambient-triggers-section.test.tsx`

### Test bodies (abridged)

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AmbientTriggersSection from '../ambient-triggers-section'

function makeTrigger(overrides = {}) {
  return {
    id: 'at_1', name: '24h nudge', triggerOn: { type: 'block_entered', blockId: 'blk_booking' },
    delay: { amount: 24, unit: 'hour' }, cancelOn: ['prospect_reply'],
    conditions: [], targetBlockId: 'blk_followup', metaSendMode: 'in_window_only',
    ...overrides,
  }
}

describe('AmbientTriggersSection', () => {
  it('renders all triggers', () => {
    render(<AmbientTriggersSection triggers={[makeTrigger(), makeTrigger({ id: 'at_2', name: '48h' })]} onSave={vi.fn()} onDelete={vi.fn()} blockOptions={[]} />)
    expect(screen.getByText('24h nudge')).toBeInTheDocument()
    expect(screen.getByText('48h')).toBeInTheDocument()
  })

  it('"Add trigger" opens modal', async () => {
    render(<AmbientTriggersSection triggers={[]} onSave={vi.fn()} onDelete={vi.fn()} blockOptions={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /Add trigger/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows Meta warning when delay > 24h and mode = in_window_only', async () => {
    render(<AmbientTriggersSection triggers={[
      makeTrigger({ delay: { amount: 48, unit: 'hour' }, metaSendMode: 'in_window_only' }),
    ]} onSave={vi.fn()} onDelete={vi.fn()} blockOptions={[]} />)
    expect(screen.getByText(/outside.*24h/i)).toBeInTheDocument()
  })

  it('Meta warning suggests HUMAN_AGENT tag mode', async () => {
    render(<AmbientTriggersSection triggers={[
      makeTrigger({ delay: { amount: 48, unit: 'hour' }, metaSendMode: 'in_window_only' }),
    ]} onSave={vi.fn()} onDelete={vi.fn()} blockOptions={[]} />)
    expect(screen.getByText(/HUMAN_AGENT/)).toBeInTheDocument()
  })

  it('save fires onSave callback with trigger data', async () => {
    const onSave = vi.fn()
    render(<AmbientTriggersSection triggers={[]} onSave={onSave} onDelete={vi.fn()} blockOptions={[
      { id: 'blk_booking', name: 'Booking Handoff' },
      { id: 'blk_followup', name: 'Follow-up' },
    ]} />)
    await userEvent.click(screen.getByRole('button', { name: /Add trigger/i }))
    await userEvent.type(screen.getByLabelText(/Name/i), 'test nudge')
    // ... fill other fields
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))
    expect(onSave).toHaveBeenCalledOnce()
  })
})
```

### Impl

`ambient-triggers-section.tsx` — a flow-level section rendered under or alongside the canvas. Modal form with: name, triggerOn (block picker), delay amount/unit, cancelOn checkboxes, targetBlockId (block picker), metaSendMode dropdown. Warning banner inside the form when `(delay in ms > 24h) && mode === 'in_window_only'`. Save calls a Server Action that updates `flow_versions.graph.ambientTriggers`.

### Server Action

`save-ambient-triggers.action.ts` — similar pattern to `save-block.action.ts`. Rewrite the whole `ambientTriggers` array on the draft graph.

### Commits

- `test(ambient-triggers-section): renders, add-modal, meta warning, save callback`
- `feat(ambient-triggers-section): flow-level triggers UI with modal + warning`
- `test(save-ambient-triggers-action): integration`
- `feat(save-ambient-triggers-action): Server Action for triggers`

---

## Slice 13 — E2E

### Test

`tests/e2e/ambient-trigger.spec.ts`

```ts
import { test, expect } from './fixtures'

test('60s trigger fires after delay', async ({ page, flowId }) => {
  // Setup: add a 60s trigger via UI (or API-seeded)
  await page.goto(`/dashboard/flows/${flowId}`)
  // (seed the trigger via fixture before navigation)

  // Simulate inbound message via test API endpoint
  const res = await page.request.post('/api/test/simulate-inbound', {
    data: { flowId, message: 'hey', blockIdToEnter: 'blk_booking' },
  })
  expect(res.ok()).toBe(true)

  // Wait 70 seconds + a cron tick
  await page.waitForTimeout(65_000)
  await page.request.post('/api/cron/fire-triggers', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })

  // Assert trigger row = fired
  const triggers = await page.request.get(`/api/test/triggers?flowId=${flowId}`)
  const body = await triggers.json()
  expect(body.some((t: any) => t.status === 'fired')).toBe(true)
})

test('cancels on prospect reply', async ({ page, flowId }) => {
  // Seed 60s trigger, send inbound within 30s, verify cancelled
  // ...
})

test('Meta warning appears for 30h in_window_only trigger', async ({
  page,
  flowId,
}) => {
  await page.goto(`/dashboard/flows/${flowId}`)
  await page.getByRole('button', { name: /Add trigger/i }).click()
  await page.getByLabel('Delay amount').fill('30')
  await page.getByLabel('Delay unit').selectOption('hour')
  await page.getByLabel('Meta send mode').selectOption('in_window_only')
  await expect(page.getByText(/outside.*24h/i)).toBeVisible()
  await expect(page.getByText(/HUMAN_AGENT/)).toBeVisible()
})
```

### Commits

- `test(e2e): ambient trigger fires, cancels, meta warning`

---

## End of Primitive #2 verification

- [ ] Schema, meta-window, scheduler service, cron route, engine hooks, UI all tested green
- [ ] E2E triggers fire + cancel + warn about Meta window
- [ ] `flow_engine.ambient_triggers` flag off in prod; smoke test by flipping on for a test brand in staging
- [ ] Kill-switch drill: flip flag off → verify new conversations don't schedule; existing scheduled rows stay dormant until cron sees the flag
