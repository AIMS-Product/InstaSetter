# Spec — Week 1: Foundation (TDD, fully expanded)

Every slice is: **write failing test → minimum impl to pass → commit**. Each slice lists the test file, test bodies, impl file, impl skeleton, and the two commits.

Dependencies: [SPEC-TEST-INFRA.md](SPEC-TEST-INFRA.md) must be in place before Slice 2.

---

## Slice 1 — Test infrastructure + Playwright

Effort: 0.5 day. No red/green cycle — this is pure infrastructure.

### Tasks

- Write all files described in SPEC-TEST-INFRA.md:
  - `src/test/supabase.ts`
  - `src/test/fixtures.ts`
  - `src/test/claude-stub.ts`
  - `src/test/sendpulse-stub.ts`
  - `src/test/auth.ts`
  - `src/test/time.ts`
- Add test SQL helpers migration (local-only): `supabase/migrations/99999999999999_test_helpers.sql`
- Install Playwright: `npm install -D @playwright/test && npx playwright install chromium`
- Add `playwright.config.ts`
- Add `tests/e2e/fixtures.ts`
- Update `vitest.config.ts` with `projects` split
- Add `.github/workflows/test.yml`

### Smoke tests to prove infra works

```ts
// src/test/__tests__/fixtures.test.ts
import { describe, it, expect } from 'vitest'
import { createTestBot, createTestBlock } from '@/test/fixtures'

describe('fixtures', () => {
  it('createTestBot returns deterministic shape with override', () => {
    const bot = createTestBot({ brandName: 'Acme' })
    expect(bot.brandName).toBe('Acme')
    expect(bot.bookingUrl).toContain('http')
  })

  it('createTestBlock returns qualifier by default', () => {
    const block = createTestBlock()
    expect(block.type).toBe('qualifier')
    expect(block.exampleGood.length).toBeGreaterThan(0)
  })
})
```

```ts
// src/test/__tests__/supabase.integration.test.ts
import { describe, it, expect } from 'vitest'
import { createServiceClient } from '@/test/supabase'

describe('supabase harness', () => {
  it('can run a SELECT 1', async () => {
    const db = createServiceClient()
    const { data, error } = await db.rpc('set_test_now', {
      instant: '2026-04-17T00:00:00Z',
    })
    expect(error).toBeNull()
  })
})
```

### Commits

- `chore(test): add Supabase integration harness + fixture builders`
- `chore(test): add Claude and SendPulse stubs`
- `chore(test): install Playwright and configure e2e`
- `chore(ci): split unit/integration/contract/e2e jobs`

---

## Slice 2 — Schema: `ins_flows` + `ins_flow_versions`

### Test file

`supabase/migrations/__tests__/schema.integration.test.ts`

### Test bodies

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createAnonClient, createServiceClient } from '@/test/supabase'

describe('schema — ins_flows + ins_flow_versions', () => {
  const db = createServiceClient()
  const anon = createAnonClient()

  beforeEach(async () => {
    // Truncate in-order for FKs
    await db.rpc('truncate_table', { table_name: 'ins_flow_versions' })
    await db.rpc('truncate_table', { table_name: 'ins_flows' })
  })

  it('creates ins_flows with required columns', async () => {
    const { data, error } = await db
      .from('ins_flows')
      .insert({
        slug: 'test-flow',
        name: 'Test',
        scope: 'flow',
        created_by: 'test@example.com',
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({
      slug: 'test-flow',
      scope: 'flow',
    })
    expect(data?.id).toBeDefined()
  })

  it('rejects duplicate slug on ins_flows', async () => {
    await db.from('ins_flows').insert({
      slug: 'dup',
      name: 'A',
      scope: 'flow',
      created_by: 'x',
    })
    const { error } = await db.from('ins_flows').insert({
      slug: 'dup',
      name: 'B',
      scope: 'flow',
      created_by: 'x',
    })
    expect(error?.code).toBe('23505') // unique_violation
  })

  it('creates ins_flow_versions tied to a flow', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'f1', name: 'F', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    const { data, error } = await db
      .from('ins_flow_versions')
      .insert({
        flow_id: flow!.id,
        version_number: 1,
        status: 'draft',
        source: 'editor',
        graph: { nodes: [], edges: [], ambientTriggers: [] },
        checksum: 'abc',
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.status).toBe('draft')
  })

  it('enforces (flow_id, version_number) unique', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'f2', name: 'F', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    await db.from('ins_flow_versions').insert({
      flow_id: flow!.id,
      version_number: 1,
      status: 'draft',
      source: 'editor',
      graph: {},
      checksum: 'a',
    })
    const { error } = await db.from('ins_flow_versions').insert({
      flow_id: flow!.id,
      version_number: 1,
      status: 'draft',
      source: 'editor',
      graph: {},
      checksum: 'b',
    })
    expect(error?.code).toBe('23505')
  })

  it('cascades delete: removing a flow removes its versions', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'f3', name: 'F', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    await db.from('ins_flow_versions').insert({
      flow_id: flow!.id,
      version_number: 1,
      status: 'draft',
      source: 'editor',
      graph: {},
      checksum: 'c',
    })
    await db.from('ins_flows').delete().eq('id', flow!.id)
    const { data } = await db
      .from('ins_flow_versions')
      .select()
      .eq('flow_id', flow!.id)
    expect(data).toEqual([])
  })

  it('enables RLS on both tables', async () => {
    const { data } = await db.rpc('get_rls_enabled' as any, {
      table_names: ['ins_flows', 'ins_flow_versions'],
    })
    expect(data).toEqual(
      expect.arrayContaining([
        { table: 'ins_flows', enabled: true },
        { table: 'ins_flow_versions', enabled: true },
      ])
    )
  })

  it('denies anon role from reading ins_flows', async () => {
    await db.from('ins_flows').insert({
      slug: 'private',
      name: 'P',
      scope: 'flow',
      created_by: 'x',
    })
    const { data, error } = await anon.from('ins_flows').select()
    // Either RLS denies outright or returns empty — both acceptable
    expect(data ?? []).toEqual([])
  })
})
```

### Impl file

`supabase/migrations/20260418000001_flow_builder_core.sql`

### Impl skeleton

```sql
-- Core flow-builder tables: ins_flows + ins_flow_versions
-- Additive-only, RLS-enabled, service-role-only for MVP

create table public.ins_flows (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  name            text not null,
  description     text,
  scope           text not null default 'flow' check (scope in ('flow', 'module')),
  brand_id        text,
  archived_at     timestamptz,
  created_by      text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ins_flows_slug_unique unique (slug)
);

create index idx_ins_flows_scope on public.ins_flows (scope) where archived_at is null;
create index idx_ins_flows_brand on public.ins_flows (brand_id);

create table public.ins_flow_versions (
  id                   uuid primary key default gen_random_uuid(),
  flow_id              uuid not null references public.ins_flows (id) on delete cascade,
  version_number       integer not null,
  status               text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source               text not null default 'editor' check (source in ('editor', 'code')),
  graph                jsonb not null,
  compiled             jsonb,
  variables_snapshot   jsonb not null default '[]'::jsonb,
  checksum             text not null,
  label                text,
  published_at         timestamptz,
  published_by         text,
  created_at           timestamptz not null default now(),

  constraint ins_flow_versions_flow_version_unique unique (flow_id, version_number)
);

create index idx_ins_flow_versions_flow on public.ins_flow_versions (flow_id, status);

alter table public.ins_flows enable row level security;
alter table public.ins_flow_versions enable row level security;

create policy "Service role on ins_flows"
  on public.ins_flows for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role on ins_flow_versions"
  on public.ins_flow_versions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Helper function used by schema tests
create or replace function public.get_rls_enabled(table_names text[])
returns table(table_name text, enabled boolean) as $$
begin
  return query
    select c.relname::text, c.relrowsecurity
    from pg_class c
    where c.relname = any(table_names) and c.relkind = 'r';
end;
$$ language plpgsql security definer;
```

Regenerate types: `npx supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts`. For local dev: `npx supabase gen types typescript --local > src/types/database.ts`.

### Commits

- `test(schema): ins_flows + ins_flow_versions structure and RLS`
- `feat(schema): create ins_flows and ins_flow_versions tables`

---

## Slice 3 — Schema: `ins_flow_channels` + `ins_flow_publish_log`

### Test additions to `schema.integration.test.ts`

```ts
describe('schema — ins_flow_channels + ins_flow_publish_log', () => {
  const db = createServiceClient()

  beforeEach(async () => {
    await db.rpc('truncate_table', { table_name: 'ins_flow_publish_log' })
    await db.rpc('truncate_table', { table_name: 'ins_flow_channels' })
    await db.rpc('truncate_table', { table_name: 'ins_flow_versions' })
    await db.rpc('truncate_table', { table_name: 'ins_flows' })
  })

  it('stores a channel pointing to an active version', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'c1', name: 'C', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    const { data: version } = await db
      .from('ins_flow_versions')
      .insert({
        flow_id: flow!.id,
        version_number: 1,
        status: 'published',
        source: 'editor',
        graph: {},
        checksum: 'ck1',
      })
      .select()
      .single()

    const { data, error } = await db
      .from('ins_flow_channels')
      .insert({
        slug: 'ig_organic_dm',
        active_version_id: version!.id,
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data?.active_version_id).toBe(version!.id)
  })

  it('publish log append-only: reads show chronological order', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'c2', name: 'C', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    await db.from('ins_flow_publish_log').insert([
      {
        flow_id: flow!.id,
        action: 'publish',
        actor_email: 'a@x.com',
      },
      {
        flow_id: flow!.id,
        action: 'rollback',
        actor_email: 'a@x.com',
      },
    ])
    const { data } = await db
      .from('ins_flow_publish_log')
      .select('action')
      .eq('flow_id', flow!.id)
      .order('created_at', { ascending: true })
    expect(data?.map((r) => r.action)).toEqual(['publish', 'rollback'])
  })
})
```

### Impl additions to the same migration

```sql
create table public.ins_flow_channels (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  active_version_id    uuid references public.ins_flow_versions (id),
  ab_test_id           uuid,
  updated_at           timestamptz not null default now()
);

create table public.ins_flow_publish_log (
  id                 uuid primary key default gen_random_uuid(),
  flow_id            uuid not null references public.ins_flows (id),
  channel_id         uuid references public.ins_flow_channels (id),
  action             text not null check (action in ('publish', 'rollback', 'archive', 'ab_start', 'ab_end')),
  from_version_id    uuid references public.ins_flow_versions (id),
  to_version_id      uuid references public.ins_flow_versions (id),
  actor_email        text not null,
  reason             text,
  created_at         timestamptz not null default now()
);

create index idx_publish_log_flow on public.ins_flow_publish_log (flow_id, created_at desc);

alter table public.ins_flow_channels enable row level security;
alter table public.ins_flow_publish_log enable row level security;

create policy "Service role on ins_flow_channels"
  on public.ins_flow_channels for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role on ins_flow_publish_log"
  on public.ins_flow_publish_log for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

### Commits

- `test(schema): ins_flow_channels + ins_flow_publish_log`
- `feat(schema): add channels and publish log tables`

---

## Slice 4 — Schema: `ins_flow_variables`

### Test additions

```ts
describe('schema — ins_flow_variables', () => {
  const db = createServiceClient()

  it('stores typed variable definitions per flow', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'v1', name: 'V', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    const { data, error } = await db
      .from('ins_flow_variables')
      .insert({
        flow_id: flow!.id,
        key: 'machine_count',
        scope: 'contact',
        data_type: 'number',
        description: 'Machines owned',
      })
      .select()
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ key: 'machine_count', data_type: 'number' })
  })

  it('enforces (flow_id, key) unique', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'v2', name: 'V', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    const base = {
      flow_id: flow!.id,
      key: 'dup',
      scope: 'contact' as const,
      data_type: 'string' as const,
    }
    await db.from('ins_flow_variables').insert(base)
    const { error } = await db.from('ins_flow_variables').insert(base)
    expect(error?.code).toBe('23505')
  })

  it('rejects invalid data_type', async () => {
    const { data: flow } = await db
      .from('ins_flows')
      .insert({ slug: 'v3', name: 'V', scope: 'flow', created_by: 'x' })
      .select()
      .single()
    const { error } = await db.from('ins_flow_variables').insert({
      flow_id: flow!.id,
      key: 'bad',
      scope: 'contact',
      data_type: 'nonsense' as any,
    })
    expect(error?.code).toBe('23514') // check_violation
  })
})
```

### Impl additions

```sql
create table public.ins_flow_variables (
  id              uuid primary key default gen_random_uuid(),
  flow_id         uuid not null references public.ins_flows (id) on delete cascade,
  key             text not null,
  scope           text not null check (scope in ('brand', 'contact', 'conversation')),
  data_type       text not null check (data_type in (
    'string', 'number', 'boolean', 'date', 'datetime', 'enum', 'url', 'email', 'phone', 'list'
  )),
  default_value   jsonb,
  enum_values     jsonb,
  description     text,
  is_pii          boolean not null default false,
  is_guaranteed   boolean not null default false,
  mapped_table    text,
  mapped_column   text,
  created_at      timestamptz not null default now(),

  constraint ins_flow_variables_flow_key_unique unique (flow_id, key)
);

alter table public.ins_flow_variables enable row level security;

create policy "Service role on ins_flow_variables"
  on public.ins_flow_variables for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

### Commits

- `test(schema): ins_flow_variables`
- `feat(schema): add variable registry per flow`

---

## Slice 5 — Types + empty `compileBlock`

### Test file

`src/lib/prompts/__tests__/compile-block.test.ts`

### Test bodies (red)

```ts
import { describe, it, expect } from 'vitest'
import { compileBlock } from '@/lib/prompts/compile-block'
import {
  createTestBlock,
  createTestBot,
  createEmptyContext,
} from '@/test/fixtures'

describe('compileBlock', () => {
  it('returns an array of PromptSection', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every section has id, title, body, and source', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    for (const section of result) {
      expect(section.id).toBeTruthy()
      expect(section.title).toBeTruthy()
      expect(section.body).toBeTypeOf('string')
      expect(['bot', 'block', 'runtime', 'contact']).toContain(
        section.source.type
      )
      expect(section.source.label).toBeTruthy()
    }
  })
})
```

### Types file

`src/types/flow-builder.ts` (new — extend to match what fixtures.ts expects):

```ts
export type BlockType =
  | 'opening'
  | 'qualifier'
  | 'objection'
  | 'email-capture'
  | 'booking'
  | 'followup'
  | 'escalation'
  | 'summary'

export interface CaptureRule {
  id: string
  label: string
  variable: string
  source: 'llm-extract' | 'user-answer'
}

export interface ExitBranch {
  id: string
  label: string
  target: string | null
  conditionSummary: string
}

export interface BlockData {
  id: string
  type: BlockType
  name: string
  goal: string
  messageGuidance: string
  exampleGood: string[]
  captureRules: CaptureRule[]
  exitBranches: ExitBranch[]
}

export interface BotData {
  id: string
  brandId: string
  brandName: string
  bookingUrl: string
  timezone: string
  personaText: string
  messageConstraints: string
  forbiddenPhrases: string[]
}

export interface RuntimeContext {
  contact: Record<string, unknown>
  conversation: Record<string, unknown>
  brand: Record<string, unknown>
}

export interface PromptSectionSource {
  type: 'bot' | 'block' | 'runtime' | 'contact'
  label: string
  editUrl?: string
}

export interface PromptSection {
  id: string
  title: string
  body: string
  source: PromptSectionSource
}

export interface AmbientTrigger {
  id: string
  name: string
  triggerOn: { type: 'block_entered'; blockId: string }
  delay: { amount: number; unit: 'minute' | 'hour' | 'day' }
  cancelOn: Array<
    'prospect_reply' | 'conversation_closed' | `tag_added:${string}`
  >
  conditions: unknown[] // future; unused in v1
  targetBlockId: string
  metaSendMode: 'in_window_only' | 'human_agent_tag' | 'wait_for_next_window'
}

export interface FlowGraph {
  nodes: Array<{
    id: string
    position: { x: number; y: number }
    block: BlockData
  }>
  edges: Array<{
    id: string
    source: string
    sourceHandle: string
    target: string
    label?: string
  }>
  ambientTriggers: AmbientTrigger[]
  viewport?: { x: number; y: number; zoom: number }
}
```

### Impl file

`src/lib/prompts/compile-block.ts`

### Impl skeleton (green — minimum to pass)

```ts
import type {
  BlockData,
  BotData,
  PromptSection,
  RuntimeContext,
} from '@/types/flow-builder'

interface CompileArgs {
  block: BlockData
  bot: BotData
  runtimeContext: RuntimeContext
}

export function compileBlock(args: CompileArgs): PromptSection[] {
  return [
    {
      id: 'stub',
      title: 'Stub',
      body: '',
      source: { type: 'bot', label: 'Stub' },
    },
  ]
}
```

### Commits

- `test(compile-block): returns array of PromptSection with required fields`
- `feat(compile-block): add types and stub implementation`

---

## Slice 6 — Persona section

### Test additions

```ts
describe('compileBlock — persona section', () => {
  it('includes a persona section sourced from bot', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot({ personaText: 'You are Mike.' }),
      runtimeContext: createEmptyContext(),
    })
    const persona = result.find((s) => s.id === 'persona')
    expect(persona).toBeDefined()
    expect(persona!.body).toContain('You are Mike.')
    expect(persona!.source.type).toBe('bot')
    expect(persona!.source.label).toMatch(/Bot/i)
  })

  it('mutating bot.personaText changes persona body', () => {
    const a = compileBlock({
      block: createTestBlock(),
      bot: createTestBot({ personaText: 'Version A' }),
      runtimeContext: createEmptyContext(),
    }).find((s) => s.id === 'persona')
    const b = compileBlock({
      block: createTestBlock(),
      bot: createTestBot({ personaText: 'Version B' }),
      runtimeContext: createEmptyContext(),
    }).find((s) => s.id === 'persona')
    expect(a?.body).toContain('Version A')
    expect(b?.body).toContain('Version B')
    expect(a?.body).not.toEqual(b?.body)
  })
})
```

### Impl

```ts
import type { BotData, PromptSection } from '@/types/flow-builder'

export function compileBlock(args: CompileArgs): PromptSection[] {
  return [buildPersonaSection(args.bot)]
}

function buildPersonaSection(bot: BotData): PromptSection {
  return {
    id: 'persona',
    title: 'Persona',
    body: `## Persona\n\n${bot.personaText}`,
    source: { type: 'bot', label: 'Bot settings → Persona' },
  }
}
```

### Commits

- `test(compile-block): persona section uses bot.personaText`
- `feat(compile-block): implement persona section`

---

## Slice 7 — Constraints section

### Test additions

```ts
describe('compileBlock — constraints section', () => {
  it('includes a message-constraints section sourced from bot', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot({
        messageConstraints: 'MAXIMUM 2 sentences.',
      }),
      runtimeContext: createEmptyContext(),
    })
    const constraints = result.find((s) => s.id === 'constraints')
    expect(constraints).toBeDefined()
    expect(constraints!.body).toContain('MAXIMUM 2 sentences.')
    expect(constraints!.source.type).toBe('bot')
  })

  it('appends forbidden phrases to constraints body', () => {
    const result = compileBlock({
      block: createTestBlock(),
      bot: createTestBot({
        forbiddenPhrases: ['just popping in', 'Still with me?'],
      }),
      runtimeContext: createEmptyContext(),
    })
    const body = result.find((s) => s.id === 'constraints')!.body
    expect(body).toContain('just popping in')
    expect(body).toContain('Still with me?')
  })
})
```

### Impl

```ts
function buildConstraintsSection(bot: BotData): PromptSection {
  const lines = [`## Message Constraints\n\n${bot.messageConstraints}`]
  if (bot.forbiddenPhrases.length > 0) {
    lines.push(
      '',
      '### Forbidden phrases',
      ...bot.forbiddenPhrases.map((p) => `- Never say "${p}"`)
    )
  }
  return {
    id: 'constraints',
    title: 'Message Constraints',
    body: lines.join('\n'),
    source: { type: 'bot', label: 'Bot settings → Constraints' },
  }
}

export function compileBlock(args: CompileArgs): PromptSection[] {
  return [buildPersonaSection(args.bot), buildConstraintsSection(args.bot)]
}
```

### Commits

- `test(compile-block): constraints section includes bot constraints and forbidden phrases`
- `feat(compile-block): implement constraints section`

---

## Slice 8 — Block section

### Test additions

```ts
describe('compileBlock — block section', () => {
  it('includes block goal', () => {
    const result = compileBlock({
      block: createTestBlock({ goal: 'Collect motivation.' }),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    const block = result.find((s) => s.id === 'block')
    expect(block).toBeDefined()
    expect(block!.body).toContain('Collect motivation.')
  })

  it('includes message guidance', () => {
    const result = compileBlock({
      block: createTestBlock({ messageGuidance: 'Weave naturally.' }),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'block')!.body).toContain(
      'Weave naturally.'
    )
  })

  it('includes each example good reply verbatim', () => {
    const examples = ['Hi there', 'Hey friend']
    const result = compileBlock({
      block: createTestBlock({ exampleGood: examples }),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    const body = result.find((s) => s.id === 'block')!.body
    for (const ex of examples) expect(body).toContain(ex)
  })

  it('block section source is block with editUrl', () => {
    const block = createTestBlock({ id: 'blk_xyz' })
    const section = compileBlock({
      block,
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    }).find((s) => s.id === 'block')!
    expect(section.source.type).toBe('block')
    expect(section.source.editUrl).toContain('blk_xyz')
  })
})
```

### Impl

```ts
function buildBlockSection(block: BlockData): PromptSection {
  const lines = [
    `## Current Block: ${block.name}`,
    '',
    `Goal: ${block.goal}`,
    '',
    `Message guidance: ${block.messageGuidance}`,
  ]
  if (block.exampleGood.length > 0) {
    lines.push('', 'Example good replies:')
    for (const ex of block.exampleGood) lines.push(`- "${ex}"`)
  }
  return {
    id: 'block',
    title: `Current Block: ${block.name}`,
    body: lines.join('\n'),
    source: {
      type: 'block',
      label: `Block editor → ${block.name}`,
      editUrl: `/dashboard/flows/current#block-${block.id}`,
    },
  }
}

export function compileBlock(args: CompileArgs): PromptSection[] {
  return [
    buildPersonaSection(args.bot),
    buildConstraintsSection(args.bot),
    buildBlockSection(args.block),
  ]
}
```

### Commits

- `test(compile-block): block section includes goal, guidance, examples, edit link`
- `feat(compile-block): implement block section`

---

## Slice 9 — Capture section

### Test additions

```ts
describe('compileBlock — capture section', () => {
  it('skips capture section when no capture rules', () => {
    const result = compileBlock({
      block: createTestBlock({ captureRules: [] }),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'capture')).toBeUndefined()
  })

  it('lists each capture rule with its target variable', () => {
    const block = createTestBlock({
      captureRules: [
        {
          id: 'c1',
          label: 'Motivation',
          variable: 'contact.motivation',
          source: 'llm-extract',
        },
        {
          id: 'c2',
          label: 'Budget',
          variable: 'contact.budget',
          source: 'llm-extract',
        },
      ],
    })
    const section = compileBlock({
      block,
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    }).find((s) => s.id === 'capture')
    expect(section).toBeDefined()
    expect(section!.body).toContain('contact.motivation')
    expect(section!.body).toContain('contact.budget')
  })
})
```

### Impl

```ts
function buildCaptureSection(block: BlockData): PromptSection | null {
  if (block.captureRules.length === 0) return null
  const lines = ['## Capture rules']
  for (const rule of block.captureRules) {
    lines.push(
      `- When the user provides ${rule.label.toLowerCase()}, capture it to \`${rule.variable}\`.`
    )
  }
  return {
    id: 'capture',
    title: 'Capture rules',
    body: lines.join('\n'),
    source: {
      type: 'block',
      label: `Block editor → ${block.name} → Capture rules`,
      editUrl: `/dashboard/flows/current#block-${block.id}-capture`,
    },
  }
}

export function compileBlock(args: CompileArgs): PromptSection[] {
  const sections = [
    buildPersonaSection(args.bot),
    buildConstraintsSection(args.bot),
    buildBlockSection(args.block),
  ]
  const capture = buildCaptureSection(args.block)
  if (capture) sections.push(capture)
  return sections
}
```

### Commits

- `test(compile-block): capture section lists rules or is absent`
- `feat(compile-block): implement capture section`

---

## Slice 10 — Routing section

### Test additions

```ts
describe('compileBlock — routing section', () => {
  it('formats exit branches in marketer language', () => {
    const block = createTestBlock({
      exitBranches: [
        {
          id: 'br_1',
          label: 'Qualified',
          target: 'blk_booking',
          conditionSummary:
            'contact.location is set AND contact.motivation is set',
        },
        {
          id: 'br_2',
          label: 'Objection',
          target: 'blk_objection',
          conditionSummary: 'last message ⚡ seems like an objection',
        },
      ],
    })
    const section = compileBlock({
      block,
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    }).find((s) => s.id === 'routing')!
    expect(section.body).toContain('When')
    expect(section.body).toContain('Qualified')
    expect(section.body).toContain('Objection')
    expect(section.body).toContain('contact.location is set')
  })

  it('omits routing section when block has no exit branches', () => {
    const result = compileBlock({
      block: createTestBlock({ exitBranches: [] }),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'routing')).toBeUndefined()
  })
})
```

### Impl

```ts
function buildRoutingSection(block: BlockData): PromptSection | null {
  if (block.exitBranches.length === 0) return null
  const lines = ['## Exit Routing']
  for (const br of block.exitBranches) {
    lines.push(`- When ${br.conditionSummary} → move to ${br.label}`)
  }
  return {
    id: 'routing',
    title: 'Exit Routing',
    body: lines.join('\n'),
    source: {
      type: 'block',
      label: `Block editor → ${block.name} → Exit branches`,
      editUrl: `/dashboard/flows/current#block-${block.id}-routing`,
    },
  }
}

export function compileBlock(args: CompileArgs): PromptSection[] {
  const sections: PromptSection[] = [
    buildPersonaSection(args.bot),
    buildConstraintsSection(args.bot),
    buildBlockSection(args.block),
  ]
  const capture = buildCaptureSection(args.block)
  if (capture) sections.push(capture)
  const routing = buildRoutingSection(args.block)
  if (routing) sections.push(routing)
  return sections
}
```

### Commits

- `test(compile-block): routing section lists branches in marketer language`
- `feat(compile-block): implement routing section`

---

## Slice 11 — Context section

### Test additions

```ts
describe('compileBlock — context section', () => {
  it('splits runtime into Known and Unknown', () => {
    const ctx = createEmptyContext()
    ctx.contact = { location: 'Dallas', budget: null, email: null }
    const section = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: ctx,
    }).find((s) => s.id === 'context')!
    expect(section.body).toContain('Known')
    expect(section.body).toContain('location: "Dallas"')
    expect(section.body).toContain('Unknown')
    expect(section.body).toContain('budget')
    expect(section.body).toContain('email')
  })

  it('source type is runtime', () => {
    const section = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    }).find((s) => s.id === 'context')!
    expect(section.source.type).toBe('runtime')
  })
})
```

### Impl

```ts
function buildContextSection(ctx: RuntimeContext): PromptSection {
  const lines = ['## Contact Context']
  const known: string[] = []
  const unknown: string[] = []
  for (const [key, val] of Object.entries(ctx.contact)) {
    if (val === null || val === undefined || val === '') {
      unknown.push(key)
    } else {
      known.push(`- ${key}: ${JSON.stringify(val)}`)
    }
  }
  if (known.length > 0) {
    lines.push('', 'Known:', ...known)
  }
  if (unknown.length > 0) {
    lines.push('', 'Unknown:', ...unknown.map((k) => `- ${k}`))
  }
  return {
    id: 'context',
    title: 'Contact Context',
    body: lines.join('\n'),
    source: { type: 'runtime', label: 'Runtime — current conversation' },
  }
}

export function compileBlock(args: CompileArgs): PromptSection[] {
  const sections: PromptSection[] = [
    buildPersonaSection(args.bot),
    buildConstraintsSection(args.bot),
    buildBlockSection(args.block),
  ]
  const capture = buildCaptureSection(args.block)
  if (capture) sections.push(capture)
  const routing = buildRoutingSection(args.block)
  if (routing) sections.push(routing)
  sections.push(buildContextSection(args.runtimeContext))
  return sections
}
```

### Commits

- `test(compile-block): context section splits Known vs Unknown`
- `feat(compile-block): implement context section`

---

## Slice 12 — Determinism + edge cases

### Test additions

```ts
describe('compileBlock — invariants', () => {
  it('is deterministic for same inputs', () => {
    const args = {
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: createTestContext(),
    }
    const a = compileBlock(args)
    const b = compileBlock(args)
    expect(a).toEqual(b)
  })

  it('unrelated runtime changes do not reorder sections', () => {
    const ctx1 = createEmptyContext()
    ctx1.contact = { location: 'Dallas' }
    const ctx2 = createEmptyContext()
    ctx2.contact = { location: 'Dallas', extra: 'ignored' }
    const ids1 = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: ctx1,
    }).map((s) => s.id)
    const ids2 = compileBlock({
      block: createTestBlock(),
      bot: createTestBot(),
      runtimeContext: ctx2,
    }).map((s) => s.id)
    expect(ids1).toEqual(ids2)
  })

  it('handles empty block gracefully', () => {
    const result = compileBlock({
      block: createTestBlock({
        goal: '',
        messageGuidance: '',
        exampleGood: [],
        captureRules: [],
        exitBranches: [],
      }),
      bot: createTestBot(),
      runtimeContext: createEmptyContext(),
    })
    expect(result.find((s) => s.id === 'persona')).toBeDefined()
    expect(result.find((s) => s.id === 'block')).toBeDefined()
    expect(result.find((s) => s.id === 'capture')).toBeUndefined()
    expect(result.find((s) => s.id === 'routing')).toBeUndefined()
  })
})
```

### Impl

No new code — these tests pass if prior slices are correct. If one fails, the issue is elsewhere.

### Commits

- `test(compile-block): determinism and edge cases`

---

## Slice 13 — Contract test vs engine (**critical**)

### What this slice does

Refactor `engine.ts` so the system prompt is produced by `compileBlock()` **behind a feature flag**. The existing `buildSystemPrompt()` path stays intact. A contract test asserts the two produce byte-identical output for every block type in the seed flow. If the assertion holds, flipping the flag is safe and silent.

### Test file

`src/lib/prompts/__tests__/compile-block.contract.test.ts`

### Test bodies

```ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import { compileBlock } from '@/lib/prompts/compile-block'
import {
  createTestContext,
  seedVendingPreneursBot,
  seedSetterV2Blocks,
} from '@/test/fixtures'

describe('compile-block contract: matches legacy buildSystemPrompt', () => {
  const bot = seedVendingPreneursBot()
  const ctx = createTestContext()

  for (const block of seedSetterV2Blocks()) {
    it(`${block.type} block produces the same prompt as legacy`, () => {
      const legacy = buildSystemPrompt({
        brandName: bot.brandName,
        contactContext: {
          tags: [],
          name: undefined,
          email: undefined,
          lastQualification: undefined,
        },
      })
      const modern = compileBlock({ block, bot, runtimeContext: ctx })
        .map((s) => s.body)
        .join('\n\n')

      // Legacy covers the whole setter-v2 sections (not block-specific).
      // For the contract, verify every sentence that exists in the
      // legacy prompt for the block's type also exists in the modern output,
      // and no forbidden phrase has leaked in.
      const legacySentences = legacy
        .split(/(?<=\.)\s+/)
        .filter((s) => s.length > 20)

      for (const sentence of legacySentences.filter((s) =>
        belongsToBlockType(s, block.type)
      )) {
        expect(modern).toContain(sentence.trim())
      }

      for (const forbidden of bot.forbiddenPhrases) {
        expect(modern.toLowerCase()).not.toContain(forbidden.toLowerCase())
      }
    })
  }
})

function belongsToBlockType(sentence: string, type: string): boolean {
  // Heuristic mapping; conservative to avoid false positives.
  const keywords: Record<string, string[]> = {
    opening: ['peer-mentor', 'Match the prospect'],
    qualifier: ['qualifier', 'location', 'motivation', 'budget'],
    objection: ['Acknowledge', 'Probe', 'Respond', 'objection'],
    'email-capture': ['email', 'capture_email'],
    booking: ['booking', 'link', 'book_call'],
    followup: ['48 hours', 'Post-Call'],
    escalation: ['escalate', 'human closer'],
    summary: ['generate_summary', 'end of conversation'],
  }
  return (keywords[type] ?? []).some((k) =>
    sentence.toLowerCase().includes(k.toLowerCase())
  )
}
```

### Fixture additions (`src/test/fixtures.ts`)

```ts
export function seedVendingPreneursBot(): BotData {
  return createTestBot({
    id: 'bot_vp',
    brandId: 'vp',
    brandName: 'VendingPreneurs',
    bookingUrl: 'https://book.vendingpreneurs.com/AK-DM',
    personaText:
      `You are Mike, the founder of VendingPreneurs. A peer-level ` +
      `vending entrepreneur and mentor, not a salesperson.`,
    messageConstraints: `MAXIMUM 2 sentences per message.`,
    forbiddenPhrases: [
      'just popping in here real quick',
      'Still with me?',
      'Did you get my last message? Been having issues in the DMs lately',
    ],
  })
}

export function seedSetterV2Blocks(): BlockData[] {
  return [
    createTestBlock({
      id: 'blk_opening',
      type: 'opening',
      name: 'Opening',
      goal: 'Hook with warmth, detect initial interest and location.',
    }),
    createTestBlock({
      id: 'blk_qualifier',
      type: 'qualifier',
      name: 'Qualifier',
      goal: 'Collect location and motivation.',
    }),
    // … one per setter-v2 section
  ]
}
```

### Impl: engine refactor (behind flag)

`src/lib/services/engine.ts` — find the call that computes the system prompt:

```ts
// before:
const systemPrompt = buildSystemPrompt({ brandName, ... })

// after:
const systemPrompt = await flagOn('flow_engine.use_compile_block', { brand_id })
  ? buildFromCompiler(block, bot, ctx)
  : buildSystemPrompt({ brandName, ... })
```

Helper (new file):

```ts
// src/lib/services/system-prompt.ts
import { compileBlock } from '@/lib/prompts/compile-block'
import type { BlockData, BotData, RuntimeContext } from '@/types/flow-builder'

export function buildFromCompiler(
  block: BlockData,
  bot: BotData,
  ctx: RuntimeContext
): string {
  return compileBlock({ block, bot, runtimeContext: ctx })
    .map((s) => s.body)
    .join('\n\n')
}
```

Feature flag service (tiny MVP):

```ts
// src/lib/services/flags.ts
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role'

const CACHE_MS = 60_000
const cache = new Map<string, { value: boolean; expires: number }>()

export async function flagOn(
  key: string,
  context: { brand_id?: string } = {}
): Promise<boolean> {
  const cacheKey = `${key}:${context.brand_id ?? '*'}`
  const now = Date.now()
  const hit = cache.get(cacheKey)
  if (hit && hit.expires > now) return hit.value

  const db = getSupabaseServiceRoleClient()
  const { data } = await db
    .from('ins_feature_flags')
    .select('enabled')
    .eq('key', key)
    .in('scope_id', context.brand_id ? [context.brand_id, '*'] : ['*'])
    .order('scope', { ascending: false }) // 'brand' before 'global'
    .limit(1)
    .maybeSingle()

  const value = data?.enabled ?? false
  cache.set(cacheKey, { value, expires: now + CACHE_MS })
  return value
}
```

Plus a migration for `ins_feature_flags`:

```sql
create table public.ins_feature_flags (
  id          uuid primary key default gen_random_uuid(),
  key         text not null,
  scope       text not null default 'global' check (scope in ('global', 'brand')),
  scope_id    text not null default '*',
  enabled     boolean not null default false,
  updated_by  text,
  updated_at  timestamptz not null default now(),
  unique (key, scope, scope_id)
);

alter table public.ins_feature_flags enable row level security;
create policy "Service role on ins_feature_flags"
  on public.ins_feature_flags for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

### Commits

- `test(compile-block): contract test vs legacy buildSystemPrompt`
- `feat(flags): add ins_feature_flags table and flagOn service`
- `feat(engine): route prompt building through compileBlock behind flag`

---

## Slice 14 — Seed setter-v2

### Test file

`scripts/__tests__/seed-setter-v2.integration.test.ts`

### Test bodies

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createServiceClient } from '@/test/supabase'
import { seedSetterV2 } from '@/scripts/seed-setter-v2'

describe('seedSetterV2', () => {
  const db = createServiceClient()

  beforeAll(async () => {
    await db.rpc('truncate_table', { table_name: 'ins_flow_versions' })
    await db.rpc('truncate_table', { table_name: 'ins_flows' })
    await seedSetterV2(db)
  })

  it('creates one ins_flows row for vp-ig-organic-dm', async () => {
    const { data } = await db
      .from('ins_flows')
      .select()
      .eq('slug', 'vp-ig-organic-dm')
    expect(data).toHaveLength(1)
  })

  it('creates version 1 marked source=code, status=published', async () => {
    const { data } = await db
      .from('ins_flow_versions')
      .select()
      .order('version_number', { ascending: true })
    expect(data).toHaveLength(1)
    expect(data![0].source).toBe('code')
    expect(data![0].status).toBe('published')
    expect(data![0].version_number).toBe(1)
  })

  it('graph has exactly 8 nodes matching setter-v2 section blocks', async () => {
    const { data } = await db.from('ins_flow_versions').select('graph').single()
    const graph = data!.graph as { nodes: unknown[] }
    expect(graph.nodes).toHaveLength(8)
  })

  it('is idempotent — running twice does not create duplicate rows', async () => {
    await seedSetterV2(db)
    const { data } = await db
      .from('ins_flows')
      .select()
      .eq('slug', 'vp-ig-organic-dm')
    expect(data).toHaveLength(1)
  })
})
```

### Impl file

`scripts/seed-setter-v2.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { seedSetterV2Blocks, seedVendingPreneursBot } from '@/test/fixtures'

export async function seedSetterV2(
  db: SupabaseClient<Database>
): Promise<void> {
  // Upsert flow
  const { data: flow } = await db
    .from('ins_flows')
    .upsert(
      {
        slug: 'vp-ig-organic-dm',
        name: 'VP — IG Organic DM (seed from setter-v2)',
        scope: 'flow',
        brand_id: 'vp',
        created_by: 'system',
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()

  if (!flow) throw new Error('failed to upsert seed flow')

  // Only insert version 1 if missing
  const { data: existing } = await db
    .from('ins_flow_versions')
    .select('id')
    .eq('flow_id', flow.id)
    .eq('version_number', 1)
    .maybeSingle()

  if (existing) return

  const blocks = seedSetterV2Blocks()
  const nodes = blocks.map((b, i) => ({
    id: b.id,
    position: { x: 0, y: i * 200 },
    block: b,
  }))

  await db.from('ins_flow_versions').insert({
    flow_id: flow.id,
    version_number: 1,
    status: 'published',
    source: 'code',
    graph: { nodes, edges: [], ambientTriggers: [] },
    checksum: `setter-v2-seed`,
    label: 'Seeded from setter-v2 on 2026-04-18',
  })
}
```

### Commits

- `test(seed): setter-v2 seed creates one flow + v1 published from code`
- `feat(seed): script to seed setter-v2 as code-source flow version`

---

## End-of-week verification

Before merging Week 1 to main:

- [ ] `npx vitest --project=unit` — 100% green, <20s
- [ ] `npx vitest --project=integration` — 100% green, <2min
- [ ] `npx vitest run src/lib/prompts/__tests__/compile-block.contract.test.ts` — green
- [ ] `npm run type-check` — clean
- [ ] Coverage: `src/lib/prompts/**` ≥ 90% lines
- [ ] `flow_engine.use_compile_block` flag exists in prod, default off
- [ ] Seed flow visible in prod DB (via migration + one-off script run)
- [ ] Zero change to prod runtime behavior — verify by replaying one prod conversation locally with flag off; output must be byte-identical to prod
