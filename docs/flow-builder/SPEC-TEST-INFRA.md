# Spec — Test Infrastructure

Shared test infrastructure used by every slice in every SPEC-\*.md file. Build this once in Week 1 day 1 before any feature slice.

## What exists today (do not duplicate)

- `src/test/setup.ts` — Vitest setup
- `src/test/helpers.ts` — `createMockClient()`, `createTableAwareMockClient()`, `asSupabaseClient()`
- `src/test/vitest-smoke.test.ts` — trivial smoke test
- `vitest.config.ts` — jsdom environment, `@/` alias, `.claude/**` excluded
- Convention: tests in `__tests__/` sibling folders, named `<name>.test.ts(x)`

## What's missing (this spec builds it)

- Real Supabase integration harness
- Fixture builders (bots, flows, blocks, contacts, conversations, triggers)
- Claude API stub with deterministic canned replies
- SendPulse stub with spy-style assertions
- Auth helper for Server Action tests
- Time control convention
- Playwright e2e setup
- CI wiring

---

## 1. Real Supabase integration harness

Some tests cannot mock the DB (schema tests, RLS tests, `FOR UPDATE SKIP LOCKED` tests, trigger lifecycle). Use a real local Supabase instance.

### Install

```bash
# supabase CLI is already a devDependency
npx supabase init          # one-time; may already exist
npx supabase start         # starts local Postgres + PostgREST + GoTrue
```

CI: GitHub Actions job runs `supabase start` before `vitest`.

### Harness: `src/test/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Real Supabase service-role client pointed at the local dev instance.
 * Every table is written/read with RLS bypassed (service role).
 * Tests that need to verify RLS use `createAnonClient()` instead.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321'
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // local default from `supabase start`
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

export function createAnonClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321'
  const key = process.env.SUPABASE_LOCAL_ANON_KEY ?? '...'
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

/**
 * Truncate all flow-builder tables between tests.
 * Cheaper than BEGIN/ROLLBACK for tests that don't need transaction isolation.
 */
export async function resetFlowBuilderTables(
  client: SupabaseClient<Database>
): Promise<void> {
  // Order matters: FK-dependent tables first
  const tables = [
    'ins_flow_node_events',
    'ins_scheduled_triggers',
    'ins_flow_executions',
    'ins_preview_usage',
    'ins_preview_cache',
    'ins_flow_publish_log',
    'ins_flow_channels',
    'ins_flow_versions',
    'ins_flow_variables',
    'ins_flows',
    'ins_feature_flags',
    // leave core tables (contacts, conversations, messages) — truncated by their own harness
  ] as const

  for (const table of tables) {
    const { error } = await client.rpc('truncate_table', { table_name: table })
    if (error) throw error
  }
}
```

Add a migration for the `truncate_table` function (test-only, guarded by schema):

```sql
-- supabase/migrations/99999999999999_test_helpers.sql (local only; gitignored from prod)
create or replace function public.truncate_table(table_name text)
returns void as $$
begin
  execute format('truncate table public.%I cascade', table_name);
end;
$$ language plpgsql security definer;

revoke all on function public.truncate_table(text) from public, anon, authenticated;
-- service_role retains access
```

### Usage pattern

```ts
import { beforeEach, afterAll } from 'vitest'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'

describe('some integration test', () => {
  const db = createServiceClient()

  beforeEach(async () => {
    await resetFlowBuilderTables(db)
  })

  it('does thing', async () => {
    await db.from('ins_flows').insert({ ... })
    // assertions
  })
})
```

Tests that need concurrency (FOR UPDATE SKIP LOCKED, race conditions) open **separate** service clients so Postgres sees two sessions.

### Time budget per test

Integration tests run ~150-300ms each vs ~5-20ms for unit tests. Budget:

- Unit tests: target <10ms per test
- Integration tests: target <500ms per test; skip in watch mode by default via `test.projects`

---

## 2. Fixture builders: `src/test/fixtures.ts`

All fixtures accept `Partial<T>` overrides. All fixtures use deterministic IDs via `nanoid(10)` seeded per test-file name — re-runs are reproducible.

```ts
import { nanoid } from 'nanoid'
import type { Database } from '@/types/database'
import type {
  BlockData,
  BotData,
  FlowGraph,
  PromptSection,
  RuntimeContext,
} from '@/types/flow-builder'

type FlowRow = Database['public']['Tables']['ins_flows']['Insert']
type FlowVersionRow =
  Database['public']['Tables']['ins_flow_versions']['Insert']
type ContactRow = Database['public']['Tables']['contacts']['Insert']
type ConversationRow = Database['public']['Tables']['conversations']['Insert']
type TriggerRow =
  Database['public']['Tables']['ins_scheduled_triggers']['Insert']

// -----------------------------------------------------------------------------
// In-memory shapes (no DB required)
// -----------------------------------------------------------------------------

export function createTestBot(overrides: Partial<BotData> = {}): BotData {
  return {
    id: `bot_${nanoid(10)}`,
    brandId: 'vp',
    brandName: 'VendingPreneurs',
    bookingUrl: 'https://book.vendingpreneurs.com/AK-DM',
    timezone: 'America/Chicago',
    personaText:
      'You are Mike, the founder of VendingPreneurs. A peer-level entrepreneur and mentor, not a salesperson.',
    messageConstraints:
      'MAXIMUM 2 sentences per message. One thought per message.',
    forbiddenPhrases: ['just popping in here real quick', 'Still with me?'],
    ...overrides,
  }
}

export function createTestBlock(overrides: Partial<BlockData> = {}): BlockData {
  return {
    id: `blk_${nanoid(10)}`,
    type: 'qualifier',
    name: 'Qualifier',
    goal: 'Collect motivation. Location already known.',
    messageGuidance:
      'Weave the question naturally. Never ask budget before value.',
    exampleGood: [
      'Are you thinking side income or going bigger?',
      'What caught your attention about vending — side hustle or full-time?',
    ],
    captureRules: [
      {
        id: 'cap_1',
        label: 'Motivation',
        variable: 'contact.motivation',
        source: 'llm-extract',
      },
    ],
    exitBranches: [
      {
        id: 'br_1',
        label: 'Qualified',
        target: 'blk_booking',
        conditionSummary:
          'contact.location is set AND contact.motivation is set',
      },
    ],
    ...overrides,
  }
}

export function createEmptyContext(): RuntimeContext {
  return {
    contact: {},
    conversation: {},
    brand: {
      brand_name: 'VendingPreneurs',
      booking_url: 'https://book.vendingpreneurs.com/AK-DM',
      timezone: 'America/Chicago',
    },
  }
}

export function createTestContext(
  overrides: Partial<RuntimeContext> = {}
): RuntimeContext {
  return {
    ...createEmptyContext(),
    ...overrides,
    contact: { location: 'Dallas', ...(overrides.contact ?? {}) },
  }
}

export function createTestGraph(overrides: Partial<FlowGraph> = {}): FlowGraph {
  const opening = createTestBlock({
    id: 'blk_opening',
    type: 'opening',
    name: 'Opening',
  })
  const qualifier = createTestBlock({
    id: 'blk_qualifier',
    type: 'qualifier',
    name: 'Qualifier',
  })
  return {
    nodes: [
      { id: opening.id, position: { x: 0, y: 0 }, block: opening },
      { id: qualifier.id, position: { x: 0, y: 200 }, block: qualifier },
    ],
    edges: [
      {
        id: 'edge_1',
        source: opening.id,
        sourceHandle: 'default',
        target: qualifier.id,
      },
    ],
    ambientTriggers: [],
    ...overrides,
  }
}

// -----------------------------------------------------------------------------
// DB-backed builders (require a SupabaseClient)
// -----------------------------------------------------------------------------

export async function insertTestFlow(
  db: SupabaseClient<Database>,
  overrides: Partial<FlowRow> = {}
): Promise<FlowRow & { id: string }> {
  const row: FlowRow = {
    slug: `flow-${nanoid(6)}`,
    name: 'Test Flow',
    scope: 'flow',
    created_by: 'test@example.com',
    ...overrides,
  }
  const { data, error } = await db
    .from('ins_flows')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertTestFlowVersion(
  db: SupabaseClient<Database>,
  flowId: string,
  overrides: Partial<FlowVersionRow> = {}
): Promise<FlowVersionRow & { id: string }> {
  const row: FlowVersionRow = {
    flow_id: flowId,
    version_number: 1,
    status: 'published',
    source: 'editor',
    graph: createTestGraph() as unknown as Record<string, unknown>,
    checksum: `ck_${nanoid(8)}`,
    ...overrides,
  }
  const { data, error } = await db
    .from('ins_flow_versions')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertTestContact(
  db: SupabaseClient<Database>,
  overrides: Partial<ContactRow> = {}
): Promise<ContactRow & { id: string }> {
  const handle = `testuser_${nanoid(6)}`
  const row: ContactRow = {
    sendpulse_contact_id: `sendpulse_${nanoid(8)}`,
    instagram_handle: handle,
    ...overrides,
  }
  const { data, error } = await db
    .from('contacts')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertTestConversation(
  db: SupabaseClient<Database>,
  contactId: string,
  overrides: Partial<ConversationRow> = {}
): Promise<ConversationRow & { id: string }> {
  const row: ConversationRow = {
    contact_id: contactId,
    status: 'active',
    prompt_version: 'setter-v2',
    is_test: true,
    ...overrides,
  }
  const { data, error } = await db
    .from('conversations')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertTestTrigger(
  db: SupabaseClient<Database>,
  overrides: Partial<TriggerRow> & {
    conversation_id: string
    contact_id: string
    flow_version_id: string
  }
): Promise<TriggerRow & { id: string }> {
  const row: TriggerRow = {
    trigger_id: `trg_${nanoid(6)}`,
    target_block_id: 'blk_followup',
    fires_at: new Date(Date.now() + 60_000).toISOString(),
    cancel_on: ['prospect_reply'],
    meta_send_mode: 'in_window_only',
    status: 'scheduled',
    ...overrides,
  }
  const { data, error } = await db
    .from('ins_scheduled_triggers')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}
```

---

## 3. Claude stub: `src/test/claude-stub.ts`

```ts
import { vi } from 'vitest'
import crypto from 'node:crypto'
import type { buildClaudeRequest } from '@/lib/services/claude'

type ClaudeRequest = ReturnType<typeof buildClaudeRequest>

interface CannedResponse {
  text: string
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens'
}

export class ClaudeStub {
  private cannedByHash = new Map<string, CannedResponse>()
  private defaultResponse: CannedResponse = {
    text: '[stub reply]',
    stopReason: 'end_turn',
  }
  public calls: ClaudeRequest[] = []

  /**
   * Register a canned response for a specific compiled prompt + messages pair.
   * Hash = sha256(system + JSON.stringify(messages)).
   */
  whenCompiled(
    args: { system: string; messages: unknown[] },
    response: CannedResponse
  ): void {
    const hash = this.hash(args.system, args.messages)
    this.cannedByHash.set(hash, response)
  }

  /**
   * Set the response returned for any unregistered input.
   */
  setDefault(response: CannedResponse): void {
    this.defaultResponse = response
  }

  /**
   * Implementation hooked into vi.mock('@/lib/services/claude').
   * Returns the raw Anthropic response shape.
   */
  async send(req: ClaudeRequest): Promise<{
    content: Array<
      | { type: 'text'; text: string }
      | {
          type: 'tool_use'
          id: string
          name: string
          input: Record<string, unknown>
        }
    >
    stop_reason: string
    usage: { input_tokens: number; output_tokens: number }
  }> {
    this.calls.push(req)
    const hash = this.hash(req.system ?? '', req.messages)
    const canned = this.cannedByHash.get(hash) ?? this.defaultResponse
    return {
      content: [
        { type: 'text' as const, text: canned.text },
        ...(canned.toolCalls?.map((tc, i) => ({
          type: 'tool_use' as const,
          id: `toolu_${i}`,
          name: tc.name,
          input: tc.input,
        })) ?? []),
      ],
      stop_reason: canned.stopReason ?? 'end_turn',
      usage: { input_tokens: 100, output_tokens: 20 },
    }
  }

  reset(): void {
    this.cannedByHash.clear()
    this.calls = []
  }

  private hash(system: string, messages: unknown[]): string {
    return crypto
      .createHash('sha256')
      .update(system + '||' + JSON.stringify(messages))
      .digest('hex')
  }
}

/**
 * Module-level singleton. Tests do:
 *   import { claudeStub } from '@/test/claude-stub'
 *   vi.mock('@/lib/services/claude', async () => {
 *     const real = await vi.importActual<typeof import('@/lib/services/claude')>('@/lib/services/claude')
 *     return { ...real, sendClaudeRequest: (req) => claudeStub.send(req) }
 *   })
 */
export const claudeStub = new ClaudeStub()
```

Each test file does `beforeEach(() => claudeStub.reset())`.

---

## 4. SendPulse stub: `src/test/sendpulse-stub.ts`

```ts
import { vi } from 'vitest'

interface SendCall {
  contactId: string
  text: string
  messageTag?: 'HUMAN_AGENT' | null
  timestamp: string
}

export class SendPulseStub {
  public calls: SendCall[] = []
  private nextResult: { success: boolean; error?: string } = { success: true }

  async sendInstagramMessage(
    contactId: string,
    text: string,
    opts?: { messageTag?: 'HUMAN_AGENT' }
  ): Promise<{ success: boolean; error?: string }> {
    this.calls.push({
      contactId,
      text,
      messageTag: opts?.messageTag ?? null,
      timestamp: new Date().toISOString(),
    })
    return this.nextResult
  }

  setNextResult(result: { success: boolean; error?: string }): void {
    this.nextResult = result
  }

  reset(): void {
    this.calls = []
    this.nextResult = { success: true }
  }
}

export const sendPulseStub = new SendPulseStub()
```

Vi-mock pattern:

```ts
import { sendPulseStub } from '@/test/sendpulse-stub'
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
    setContactTags: vi.fn().mockResolvedValue({ success: true }),
    removeContactTag: vi.fn().mockResolvedValue({ success: true }),
    pauseAutomation: vi.fn().mockResolvedValue({ success: true }),
  }
})
```

---

## 5. Auth helper: `src/test/auth.ts`

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Sign in as a marketer user. Creates the user if not present.
 * Returns an authenticated Supabase client usable for Server Action tests.
 */
export async function signInAsMarketer(
  email = 'marketer@test.local',
  password = 'test-password-123'
) {
  const url = process.env.SUPABASE_LOCAL_URL!
  const anonKey = process.env.SUPABASE_LOCAL_ANON_KEY!
  const serviceKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!

  // Ensure user exists via admin API
  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })
  await admin.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
    })
    .catch(() => {}) // ok if already exists

  // Sign in as the user
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return { client, userId: data.user!.id, email }
}
```

---

## 6. Time control convention

Use `vi.useFakeTimers()` for anything time-dependent. Wrap with a helper when tests need to advance past a DB `now()`:

```ts
// src/test/time.ts
import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Set Postgres session time to a specific instant for integration tests.
 * Uses SET LOCAL — scoped to the current transaction.
 * Requires tests to wrap their body in an explicit BEGIN/ROLLBACK if they need
 * stable `now()` across multiple queries.
 */
export async function setDbNow(
  db: SupabaseClient<Database>,
  iso: string
): Promise<void> {
  await db.rpc('set_test_now', { instant: iso })
}

/**
 * Vitest-level clock control for pure unit tests.
 *   beforeEach(() => vi.useFakeTimers({ now: new Date('2026-04-17T10:00:00Z') }))
 *   afterEach(() => vi.useRealTimers())
 *   it('X', () => { vi.advanceTimersByTime(60_000) })
 */
```

Add `set_test_now` as a test-only SQL function:

```sql
-- supabase/migrations/99999999999999_test_helpers.sql (continued)
create or replace function public.set_test_now(instant timestamptz)
returns void as $$
begin
  perform set_config('test.now', instant::text, true);
end;
$$ language plpgsql;
```

For most tests, **prefer passing `now` as a function argument** to the code under test rather than relying on DB/system time. Example: `fireDueTriggers(now: Date = new Date())`.

---

## 7. Playwright e2e setup

Install:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // flow builder state is shared across tabs
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

### E2E fixture: `tests/e2e/fixtures.ts`

```ts
import { test as base } from '@playwright/test'
import { createServiceClient, resetFlowBuilderTables } from '@/test/supabase'
import { insertTestFlow, insertTestFlowVersion } from '@/test/fixtures'

export const test = base.extend<{ flowId: string }>({
  flowId: async ({}, use) => {
    const db = createServiceClient()
    await resetFlowBuilderTables(db)
    const flow = await insertTestFlow(db, { slug: 'e2e-test-flow' })
    await insertTestFlowVersion(db, flow.id)
    await use(flow.id)
  },
})

export { expect } from '@playwright/test'
```

---

## 8. CI wiring

`.github/workflows/test.yml`:

```yaml
name: test
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npx vitest run --coverage

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - uses: supabase/setup-cli@v1
      - run: npm ci
      - run: supabase start
      - run: npx vitest run --project=integration
        env:
          SUPABASE_LOCAL_URL: http://127.0.0.1:54321
          SUPABASE_LOCAL_SERVICE_ROLE_KEY: ${{ env.SUPABASE_SERVICE_ROLE_KEY }}
          SUPABASE_LOCAL_ANON_KEY: ${{ env.SUPABASE_ANON_KEY }}

  contract:
    runs-on: ubuntu-latest
    needs: [unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - name: Run contract test (BLOCKING)
        run: npx vitest run src/lib/prompts/__tests__/compile-block.contract.test.ts

  e2e:
    runs-on: ubuntu-latest
    needs: [integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - uses: supabase/setup-cli@v1
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: supabase start
      - run: npx playwright test

  mutation:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx stryker run
```

Add a cron schedule:

```yaml
on:
  schedule:
    - cron: '0 3 * * 1' # Monday 3am UTC — weekly mutation run
```

### Vitest project config update

`vitest.config.ts` (update):

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
          exclude: ['src/**/__tests__/**/*.integration.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/__tests__/**/*.integration.test.ts'],
        },
      },
    ],
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Naming convention: integration tests end in `.integration.test.ts`, unit tests end in `.test.ts`. Component tests end in `.test.tsx` (jsdom).

---

## 9. Coverage gates

`vitest.config.ts` coverage config:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  thresholds: {
    'src/lib/prompts/**': { lines: 90, branches: 85 },
    'src/lib/services/**': { lines: 85, branches: 75 },
    'src/app/api/**': { lines: 80, branches: 70 },
    'src/app/dashboard/**': { lines: 60, branches: 50 },
  },
  exclude: [
    'src/test/**',
    '**/*.test.{ts,tsx}',
    '**/__tests__/**',
    'src/types/**',
  ],
},
```

PR CI fails if thresholds aren't met.

---

## 10. Commit message conventions

Every TDD commit follows conventional-commits:

- `test(<area>): <behavior>` — red commit (failing test)
- `feat(<area>): <behavior>` — green commit (impl to pass)
- `refactor(<area>): <what>` — refactor step
- `chore(<area>): <what>` — infra/config

Example slice sequence:

```
test(compile-block): returns array of PromptSection
feat(compile-block): stub compileBlock returning empty array
test(compile-block): persona section uses bot.personaText
feat(compile-block): implement persona section
refactor(compile-block): extract section-builder helpers
```

---

## 11. What to check at the start of every slice

Before writing a test:

1. `npx vitest --run <new-test-file>` — confirms it fails with the expected error (file not found, not a typo)
2. No prod code has been touched — only the test file exists
3. Fixtures needed are in `fixtures.ts` (add to `fixtures.ts` if missing, treat that addition as its own commit)

Before writing impl:

1. The failing test message is crystal clear about what's expected
2. The simplest impl that would satisfy the test is < 20 lines
3. If your impl is > 50 lines to satisfy one test, the test is probably too big — split

Before marking slice done:

1. `npx vitest --run` — slice tests pass
2. `npm run type-check` — no TS errors
3. `npm run lint` — no lint errors
4. No new files outside the slice's declared scope
5. Commit message matches `test(...)` or `feat(...)` convention
