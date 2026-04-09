# TDD Plan: Core Domain Foundation

## Overview

This plan decomposes the InstaSetter core domain — everything buildable without external credentials — into 22 TDD-ready micro-issues. The scope covers: database schema migration, domain types and Zod validation schemas, service layer (contact, conversation, message, lead), Claude integration (system prompt, API request/response), and the orchestration layer (webhook handler, conversation engine, lead event routing).

Each issue is a vertical slice scoped to one testable behavior. Issues are ordered by dependency: scaffold types first, then data + Claude services in parallel, then orchestration on top. The plan targets Vitest for all tests with mocked Supabase clients for the data layer.

**Post-grill changes:** Added Issue 21 (close conversation), Issue 22 (middleware exclusion). Modified Issues 4, 6, 7, 8, 11, 16, 18, 20. See `grill-review.md` for full rationale.

## Issue Count

22 issues across 5 dependency waves

## Dependency Graph

```
Wave 1 (parallel):  Issue 1, 2, 3, 4, 5, 6, 7, 22   — Scaffold: test infra, migration, types, schemas, config, middleware
Wave 2a (parallel): Issue 8, 9, 11, 13, 15, 16       — Data services + Claude (first layer)
Wave 2b (parallel): Issue 10, 12, 14, 17, 21         — Data services + Claude (second layer, depends on 2a)
Wave 3a:            Issue 19                           — Conversation engine (orchestrates everything)
Wave 3b (parallel): Issue 18, 20                      — Webhook handler + lead event routing
```

---

## Issue 1: Test infrastructure setup

### Context

No test framework exists in the project. Every subsequent issue needs Vitest to validate behavior. This must land first (or in parallel with non-test issues) so that all other issues can write and run tests.

### Behavior to test

When `npm test` is run, Vitest executes with correct TypeScript compilation, path alias resolution (`@/*` → `./src/*`), jsdom environment, and the setup file is loaded automatically.

### Acceptance criteria

- [ ] `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` are installed as devDependencies
- [ ] `vitest.config.ts` configures jsdom environment, `@/*` path alias, and setup file
- [ ] `src/test/setup.ts` imports `@testing-library/jest-dom/vitest`
- [ ] `npm test` script runs `vitest` and exits cleanly with zero tests

### Test sketch

```typescript
// src/test/vitest-smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves @/ path aliases', async () => {
    const { config } = await import('@/lib/config')
    expect(config).toBeDefined()
  })
})
```

### Files

- CREATE: `vitest.config.ts` — Vitest config with jsdom, path aliases, setup file
- CREATE: `src/test/setup.ts` — Testing library jest-dom matchers
- MODIFY: `package.json` — Add `"test": "vitest run"` script and devDependencies

### Dependencies

- Blocked by: none
- Blocks: Issues 2–20

### Type

feature

---

## Issue 2: Database migration — core domain tables

### Context

The database currently only has ManyChat (`mc_*`) tables. The core domain — contacts, conversations, messages, leads, integration_events — doesn't exist yet. Every service layer issue depends on these tables existing and having generated TypeScript types.

### Behavior to test

When the migration runs, the database contains all five core domain tables with correct columns, types, constraints, indexes, and RLS policies. The regenerated `database.ts` types include the new tables.

### Acceptance criteria

- [ ] Migration creates `contacts`, `conversations`, `messages`, `leads`, and `integration_events` tables matching the schema in `docs/scope-plan.md` § 2
- [ ] RLS is enabled on all five tables with a service role bypass policy on each
- [ ] Unique constraints exist on: `contacts.inro_contact_id`, `contacts.instagram_handle`, `messages.inro_message_id`, `messages.dedup_hash`
- [ ] Indexes exist on: `contacts.inro_contact_id`, `contacts.instagram_handle`, `messages.conversation_id`, `messages.inro_message_id`, `messages.dedup_hash`, `leads.contact_id`, `leads.conversation_id`
- [ ] Regenerated `src/types/database.ts` includes Row/Insert/Update types for all five tables

### Test sketch

```typescript
// src/types/__tests__/domain-tables.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

describe('core domain tables exist in generated types', () => {
  it('has contacts table', () => {
    expectTypeOf<Tables['contacts']['Row']>().toHaveProperty('inro_contact_id')
    expectTypeOf<Tables['contacts']['Row']>().toHaveProperty('instagram_handle')
    expectTypeOf<Tables['contacts']['Row']>().toHaveProperty('opted_out')
  })

  it('has conversations table', () => {
    expectTypeOf<Tables['conversations']['Row']>().toHaveProperty('contact_id')
    expectTypeOf<Tables['conversations']['Row']>().toHaveProperty('status')
    expectTypeOf<Tables['conversations']['Row']>().toHaveProperty(
      'prompt_version'
    )
  })

  it('has messages table', () => {
    expectTypeOf<Tables['messages']['Row']>().toHaveProperty('conversation_id')
    expectTypeOf<Tables['messages']['Row']>().toHaveProperty('role')
    expectTypeOf<Tables['messages']['Row']>().toHaveProperty('dedup_hash')
  })

  it('has leads table', () => {
    expectTypeOf<Tables['leads']['Row']>().toHaveProperty(
      'qualification_status'
    )
    expectTypeOf<Tables['leads']['Row']>().toHaveProperty('call_booked')
    expectTypeOf<Tables['leads']['Row']>().toHaveProperty('call_outcome')
  })

  it('has integration_events table', () => {
    expectTypeOf<Tables['integration_events']['Row']>().toHaveProperty(
      'integration'
    )
    expectTypeOf<Tables['integration_events']['Row']>().toHaveProperty('status')
    expectTypeOf<Tables['integration_events']['Row']>().toHaveProperty('action')
  })
})
```

### Files

- CREATE: `supabase/migrations/{timestamp}_core_domain_tables.sql` — DDL for all 5 tables, indexes, constraints, RLS
- MODIFY: `src/types/database.ts` — Regenerated via `supabase gen types typescript`

### Dependencies

- Blocked by: none
- Blocks: Issues 8–14

### Type

feature

---

## Issue 3: Domain enums and constants

### Context

Multiple tables and Zod schemas reference the same set of status values. Centralizing these as TypeScript union types and constants prevents drift between the database schema, Zod validation, and application logic.

### Behavior to test

When domain enums are imported, they provide exhaustive union types and constant arrays for all domain status fields. TypeScript rejects values not in the union.

### Acceptance criteria

- [ ] `ConversationStatus` union type: `'active' | 'completed' | 'stalled' | 'escalated'`
- [ ] `MessageRole` union type: `'user' | 'assistant'`
- [ ] `QualificationStatus` union type: `'hot' | 'warm' | 'cold'`
- [ ] `ContactSource` union type: `'keyword' | 'broadcast' | 'organic_dm' | 'comment'`
- [ ] `IntegrationName` union type: `'close_crm' | 'customerio' | 'slack' | 'calendly' | 'inro'`
- [ ] `IntegrationEventStatus` union type: `'pending' | 'success' | 'failed'`
- [ ] `CallOutcome` union type: `'showed_up' | 'no_show' | 'closed' | 'not_qualified' | 'needs_follow_up'`
- [ ] Constants: `PROMPT_VERSION = 'setter-v1'`, `FIRST_MESSAGE_LIMIT = 300`, `MESSAGE_LIMIT = 2000`
- [ ] Companion `const` arrays exported for each enum for runtime iteration and Zod schema building

### Test sketch

```typescript
import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  CONVERSATION_STATUSES,
  MESSAGE_ROLES,
  QUALIFICATION_STATUSES,
  PROMPT_VERSION,
  FIRST_MESSAGE_LIMIT,
  MESSAGE_LIMIT,
  type ConversationStatus,
  type MessageRole,
  type QualificationStatus,
} from '@/types/enums'

describe('domain enums', () => {
  it('exports all conversation statuses', () => {
    expect(CONVERSATION_STATUSES).toEqual([
      'active',
      'completed',
      'stalled',
      'escalated',
    ])
  })

  it('exports all message roles', () => {
    expect(MESSAGE_ROLES).toEqual(['user', 'assistant'])
  })

  it('provides type-safe union types', () => {
    expectTypeOf<ConversationStatus>().toEqualTypeOf<
      'active' | 'completed' | 'stalled' | 'escalated'
    >()
    expectTypeOf<MessageRole>().toEqualTypeOf<'user' | 'assistant'>()
    expectTypeOf<QualificationStatus>().toEqualTypeOf<'hot' | 'warm' | 'cold'>()
  })

  it('exports IG message constants', () => {
    expect(FIRST_MESSAGE_LIMIT).toBe(300)
    expect(MESSAGE_LIMIT).toBe(2000)
    expect(PROMPT_VERSION).toBe('setter-v1')
  })
})
```

### Files

- CREATE: `src/types/enums.ts` — All domain union types, const arrays, and constants

### Dependencies

- Blocked by: none
- Blocks: Issues 4, 5, 8–14, 15

### Type

feature

---

## Issue 4: Inro webhook payload Zod schema

### Context

The `/api/webhooks/inro` endpoint receives HTTP POST requests from Inro scenario actions. We need strict Zod validation at the system boundary before any processing occurs.

### Behavior to test

When an Inro webhook payload is validated against the schema, valid payloads produce a typed object and invalid payloads produce descriptive Zod errors with field-level detail.

### Acceptance criteria

- [ ] `inroWebhookSchema` validates: `contact_id` (string, required), `username` (string, required), `name` (string, optional), `email` (string email format, optional), `message` (string, required), `timestamp` (string ISO datetime, required), `source` (ContactSource enum, optional, defaults to `'organic_dm'`)
- [ ] Inferred TypeScript type `InroWebhookPayload` is exported alongside the schema
- [ ] Invalid payloads (missing required fields, bad email format) produce descriptive errors
- [ ] Extra fields are stripped
- [ ] Missing `source` defaults to `'organic_dm'`

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import { inroWebhookSchema } from '@/types/inro'

const validPayload = {
  contact_id: 'inro_abc123',
  username: 'johndoe',
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Hey, interested in vending machines',
  timestamp: '2026-04-09T10:30:00Z',
}

describe('inroWebhookSchema', () => {
  it('validates a complete valid payload', () => {
    const result = inroWebhookSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('validates payload with only required fields', () => {
    const minimal = {
      contact_id: 'inro_abc123',
      username: 'johndoe',
      message: 'Hello',
      timestamp: '2026-04-09T10:30:00Z',
    }
    expect(inroWebhookSchema.safeParse(minimal).success).toBe(true)
  })

  it('rejects payload missing required contact_id', () => {
    const { contact_id, ...missing } = validPayload
    expect(inroWebhookSchema.safeParse(missing).success).toBe(false)
  })

  it('rejects payload with invalid email', () => {
    expect(
      inroWebhookSchema.safeParse({ ...validPayload, email: 'not-an-email' })
        .success
    ).toBe(false)
  })

  it('accepts payload without optional fields', () => {
    const result = inroWebhookSchema.safeParse({
      contact_id: 'x',
      username: 'y',
      message: 'z',
      timestamp: '2026-04-09T10:30:00Z',
    })
    expect(result.success).toBe(true)
  })
})
```

### Files

- CREATE: `src/types/inro.ts` — `inroWebhookSchema` Zod schema + `InroWebhookPayload` inferred type

### Dependencies

- Blocked by: Issue 3 (ContactSource enum for source field)
- Blocks: Issue 18

### Type

feature

---

## Issue 5: Lead summary Zod schema

### Context

When Claude finishes qualifying a lead, it outputs a structured JSON summary. This schema validates that output before we persist it to the `leads` table or route it to downstream integrations.

### Behavior to test

When Claude's lead summary JSON is validated against the schema, valid summaries produce a typed object and invalid data produces descriptive Zod errors.

### Acceptance criteria

- [ ] `leadSummarySchema` validates all fields per spec: `instagram_handle` (required), `qualification_status` (required, enum), `call_booked` (required boolean), plus optional: `name`, `email`, `machine_count` (positive int), `location_type`, `revenue_range`, `calendly_slot`, `key_notes`, `recommended_action`
- [ ] Inferred TypeScript type `LeadSummary` is exported
- [ ] Invalid `qualification_status` values (e.g., `'lukewarm'`) are rejected
- [ ] Negative or fractional `machine_count` is rejected

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import { leadSummarySchema } from '@/types/lead'

const validSummary = {
  instagram_handle: 'johndoe',
  qualification_status: 'hot',
  call_booked: true,
  machine_count: 5,
}

describe('leadSummarySchema', () => {
  it('validates a complete lead summary', () => {
    expect(leadSummarySchema.safeParse(validSummary).success).toBe(true)
  })

  it('validates minimal required fields only', () => {
    expect(
      leadSummarySchema.safeParse({
        instagram_handle: 'x',
        qualification_status: 'cold',
        call_booked: false,
      }).success
    ).toBe(true)
  })

  it('rejects invalid qualification_status', () => {
    expect(
      leadSummarySchema.safeParse({
        ...validSummary,
        qualification_status: 'lukewarm',
      }).success
    ).toBe(false)
  })

  it('rejects negative machine_count', () => {
    expect(
      leadSummarySchema.safeParse({ ...validSummary, machine_count: -3 })
        .success
    ).toBe(false)
  })

  it('rejects fractional machine_count', () => {
    expect(
      leadSummarySchema.safeParse({ ...validSummary, machine_count: 2.5 })
        .success
    ).toBe(false)
  })

  it('validates optional email format', () => {
    expect(
      leadSummarySchema.safeParse({ ...validSummary, email: 'not-email' })
        .success
    ).toBe(false)
    expect(
      leadSummarySchema.safeParse({
        ...validSummary,
        email: 'john@example.com',
      }).success
    ).toBe(true)
  })
})
```

### Files

- CREATE: `src/types/lead.ts` — `leadSummarySchema` Zod schema + `LeadSummary` inferred type

### Dependencies

- Blocked by: Issue 3 (QualificationStatus enum values)
- Blocks: Issues 14, 16, 20

### Type

feature

---

## Issue 6: Message dedup hash utility

### Context

Inro may not provide a stable message ID on every webhook payload. As a fallback, we generate a deterministic SHA-256 hash of `scopeId + content + timestamp` to use as a dedup key in the `messages` table's unique constraint. The `scopeId` is the conversation ID (dedup is per-conversation).

### Behavior to test

When generating a dedup hash, identical inputs always produce identical hashes, and any change to any input produces a different hash.

### Acceptance criteria

- [ ] `generateDedupHash(scopeId, content, timestamp)` returns a lowercase hex SHA-256 string
- [ ] Identical inputs produce identical output (deterministic)
- [ ] Changing any single input produces a different hash
- [ ] Empty string inputs do not throw
- [ ] Unicode and special characters (emojis, newlines) are handled correctly

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import { generateDedupHash } from '@/lib/utils/dedup-hash'

describe('generateDedupHash', () => {
  it('returns a 64-character lowercase hex string', () => {
    expect(generateDedupHash('a', 'b', 'c')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is deterministic', () => {
    const h1 = generateDedupHash('a', 'b', 'c')
    const h2 = generateDedupHash('a', 'b', 'c')
    expect(h1).toBe(h2)
  })

  it('changes when any input differs', () => {
    const base = generateDedupHash('a', 'b', 'c')
    expect(generateDedupHash('x', 'b', 'c')).not.toBe(base)
    expect(generateDedupHash('a', 'x', 'c')).not.toBe(base)
    expect(generateDedupHash('a', 'b', 'x')).not.toBe(base)
  })

  it('handles empty strings', () => {
    expect(() => generateDedupHash('', '', '')).not.toThrow()
  })

  it('handles unicode and emojis', () => {
    expect(generateDedupHash('id', '👋 Hey!\nLine 2', 'ts')).toMatch(
      /^[a-f0-9]{64}$/
    )
  })
})
```

### Files

- CREATE: `src/lib/utils/dedup-hash.ts` — `generateDedupHash` using Node.js `crypto.createHash('sha256')`

### Dependencies

- Blocked by: none
- Blocks: Issue 11

### Type

feature

---

## Issue 7: Config expansion + service role client

### Context

Three small additions sharing `config.ts`. The Claude engine needs `ANTHROPIC_API_KEY` validated at startup. The system prompt needs `BRAND_NAME` for interpolation (Phase 1: VendingPreneurs). Webhook handlers need a Supabase client using the service role key (bypasses RLS, no cookie context).

### Behavior to test

When server config is loaded, `ANTHROPIC_API_KEY` and `BRAND_NAME` are validated as present and non-empty. When `createServiceRoleClient()` is called, it returns a typed Supabase client using the service role key without cookie handling.

### Acceptance criteria

- [ ] `serverEnvSchema` in `config.ts` includes `ANTHROPIC_API_KEY: z.string().min(1)` and `BRAND_NAME: z.string().min(1)`
- [ ] `getServerConfig()` returns an object including `ANTHROPIC_API_KEY` and `BRAND_NAME`
- [ ] `createServiceRoleClient()` returns a `SupabaseClient<Database>` using the service role key
- [ ] The service role client does not depend on `cookies()` from `next/headers`
- [ ] The service role client uses `createClient` from `@supabase/supabase-js` (not `createServerClient` from `@supabase/ssr`)

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('serverEnvSchema includes ANTHROPIC_API_KEY', () => {
  it('validates when present', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const { getServerConfig } = await import('@/lib/config')
    expect(getServerConfig().ANTHROPIC_API_KEY).toBe('sk-ant-test')
  })

  it('throws when missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const { getServerConfig } = await import('@/lib/config')
    expect(() => getServerConfig()).toThrow()
  })
})

describe('createServiceRoleClient', () => {
  it('returns a Supabase client', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const { createServiceRoleClient } =
      await import('@/lib/supabase/service-role')
    const client = createServiceRoleClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })
})
```

### Files

- MODIFY: `src/lib/config.ts` — Add `ANTHROPIC_API_KEY` to `serverEnvSchema`
- CREATE: `src/lib/supabase/service-role.ts` — `createServiceRoleClient()` factory

### Dependencies

- Blocked by: none
- Blocks: Issues 8, 9, 11, 15, 18

### Type

feature

---

## Issue 8: Contact service — upsert from webhook

### Context

Every incoming DM must resolve to a canonical contact before any conversation or message logic runs. The service uses the service role client because webhooks have no user auth context.

### Behavior to test

When Inro webhook data is received, the contact record is created or updated in Supabase. If the contact exists (matched by `inro_contact_id`), only `last_message_at` and `updated_at` are updated. If new, all fields are set including `first_seen_at` and `source`.

### Acceptance criteria

- [ ] Creates a new contact when `inro_contact_id` does not exist
- [ ] Sets `first_seen_at`, `last_message_at`, `source` on create (source from webhook payload, defaults to `'organic_dm'`)
- [ ] Updates `last_message_at` and `updated_at` when contact already exists
- [ ] Does NOT overwrite `first_seen_at` or `source` on update
- [ ] Returns `{ success: true, data: Contact }` on success
- [ ] Returns `{ success: false, error: string }` on database error
- [ ] Handles missing optional fields gracefully

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { upsertContact } from '@/lib/services/contact'

describe('upsertContact', () => {
  it('creates a new contact when not found', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.single.mockResolvedValueOnce({
      data: { id: 'uuid-1', inro_contact_id: 'inro_123' },
      error: null,
    })
    const result = await upsertContact(client, {
      contact_id: 'inro_123',
      username: 'test',
      message: 'hi',
      timestamp: '2026-04-09T10:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('updates last_message_at when contact exists', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({
      data: { id: 'uuid-1' },
      error: null,
    })
    client.single.mockResolvedValueOnce({
      data: { id: 'uuid-1', last_message_at: '2026-04-09T10:00:00Z' },
      error: null,
    })
    const result = await upsertContact(client, {
      contact_id: 'inro_123',
      username: 'test',
      message: 'hi',
      timestamp: '2026-04-09T10:00:00Z',
    })
    expect(result.success).toBe(true)
    expect(client.update).toHaveBeenCalled()
  })

  it('returns error on database failure', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection failed' },
    })
    const result = await upsertContact(client, {
      contact_id: 'x',
      username: 'y',
      message: 'z',
      timestamp: 't',
    })
    expect(result.success).toBe(false)
  })
})
```

### Files

- CREATE: `src/lib/services/contact.ts` — Contact upsert service [boundary: DB]

### Dependencies

- Blocked by: Issue 3 (enums), Issue 4 (Inro schema), Issue 7 (service role client)
- Blocks: Issue 18

### Type

feature

---

## Issue 9: Conversation service — find or create active

### Context

Each incoming message must be associated with an active conversation. If the contact already has one, reuse it. If not, create a new one with `prompt_version` stamped for later A/B analysis.

### Behavior to test

When processing a message for a contact, an active conversation is returned or a new one is created.

### Acceptance criteria

- [ ] Returns existing active conversation when one exists
- [ ] Creates a new conversation when no active exists (sets status='active', prompt_version, started_at)
- [ ] Does NOT create a duplicate when active already exists
- [ ] Returns `{ success: true, data: Conversation }` on success
- [ ] Returns `{ success: false, error: string }` on database error

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { findOrCreateActiveConversation } from '@/lib/services/conversation'

describe('findOrCreateActiveConversation', () => {
  it('returns existing active conversation', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({
      data: { id: 'conv-1', status: 'active' },
      error: null,
    })
    const result = await findOrCreateActiveConversation(
      client,
      'contact-1',
      'setter-v1'
    )
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('conv-1')
    expect(client.insert).not.toHaveBeenCalled()
  })

  it('creates new when no active exists', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.single.mockResolvedValueOnce({
      data: { id: 'conv-2', status: 'active', prompt_version: 'setter-v1' },
      error: null,
    })
    const result = await findOrCreateActiveConversation(
      client,
      'contact-1',
      'setter-v1'
    )
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('active')
  })

  it('returns error on database failure', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    })
    const result = await findOrCreateActiveConversation(
      client,
      'contact-1',
      'setter-v1'
    )
    expect(result.success).toBe(false)
  })
})
```

### Files

- CREATE: `src/lib/services/conversation.ts` — Conversation find-or-create service [boundary: DB]

### Dependencies

- Blocked by: Issue 3 (enums), Issue 7 (service role client)
- Blocks: Issue 10, Issue 19

### Type

feature

---

## Issue 10: Conversation service — load prior summaries

### Context

When a returning contact starts a new conversation, Claude needs context from previous interactions. We load `summary` fields from completed conversations rather than full message history to keep the context window lean.

### Behavior to test

When a returning contact starts a conversation, prior conversation summaries are loaded for context. Only completed conversations with non-null summaries are returned, ordered by most recent first.

### Acceptance criteria

- [ ] Returns summaries from completed conversations for the given contact
- [ ] Orders by `ended_at` DESC (most recent first)
- [ ] Defaults to limit of 3
- [ ] Respects custom limit parameter
- [ ] Returns empty array for first-time contacts
- [ ] Skips conversations with null summaries
- [ ] Returns `{ success: true, data: string[] }` on success

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { loadPriorSummaries } from '@/lib/services/conversation'

describe('loadPriorSummaries', () => {
  it('returns summaries ordered by ended_at DESC', async () => {
    const client = createMockClient()
    client.limit.mockResolvedValueOnce({
      data: [{ summary: 'Summary 1' }, { summary: 'Summary 2' }],
      error: null,
    })
    const result = await loadPriorSummaries(client, 'contact-1')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('returns empty array for first-time contacts', async () => {
    const client = createMockClient()
    client.limit.mockResolvedValueOnce({ data: [], error: null })
    const result = await loadPriorSummaries(client, 'contact-new')
    expect(result.data).toEqual([])
  })

  it('defaults to limit of 3', async () => {
    const client = createMockClient()
    client.limit.mockResolvedValueOnce({ data: [], error: null })
    await loadPriorSummaries(client, 'contact-1')
    expect(client.limit).toHaveBeenCalledWith(3)
  })

  it('respects custom limit', async () => {
    const client = createMockClient()
    client.limit.mockResolvedValueOnce({ data: [], error: null })
    await loadPriorSummaries(client, 'contact-1', 5)
    expect(client.limit).toHaveBeenCalledWith(5)
  })
})
```

### Files

- MODIFY: `src/lib/services/conversation.ts` — Add `loadPriorSummaries` function [boundary: DB]

### Dependencies

- Blocked by: Issue 9 (file created there)
- Blocks: Issue 19

### Type

feature

---

## Issue 11: Message service — store with dedup check

### Context

Every incoming DM and every Claude reply must be stored in the `messages` table. Inro may retry webhook deliveries, so we need deduplication via `inro_message_id` or content-based `dedup_hash`.

### Behavior to test

When a message is stored, duplicates are detected by `inro_message_id` or content hash and skipped. New messages are inserted normally.

### Acceptance criteria

- [ ] Inserts a new message when no duplicate exists
- [ ] Generates `dedup_hash` using `generateDedupHash` from Issue 6
- [ ] Detects duplicate by `inro_message_id` and returns `{ success: true, isDuplicate: true }`
- [ ] Detects duplicate by `dedup_hash` and returns `{ success: true, isDuplicate: true }`
- [ ] Stores assistant messages without `inro_message_id`
- [ ] Returns `{ success: true, data: Message }` on successful insert
- [ ] Handles Postgres unique violation (code `23505`) gracefully as duplicate

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { storeMessage } from '@/lib/services/message'

vi.mock('@/lib/utils/dedup-hash', () => ({
  generateDedupHash: vi.fn().mockReturnValue('hash_abc123'),
}))

describe('storeMessage', () => {
  it('inserts new message when no duplicate', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.single.mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null })
    const result = await storeMessage(client, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
    })
    expect(result.success).toBe(true)
    expect(result.isDuplicate).toBeFalsy()
  })

  it('detects duplicate by inro_message_id', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing' },
      error: null,
    })
    const result = await storeMessage(client, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
      inroMessageId: 'inro_1',
    })
    expect(result.success).toBe(true)
    expect(result.isDuplicate).toBe(true)
  })

  it('handles 23505 unique violation as duplicate', async () => {
    const client = createMockClient()
    client.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    client.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23505' },
    })
    const result = await storeMessage(client, {
      conversationId: 'c1',
      role: 'user',
      content: 'Hi',
    })
    expect(result.success).toBe(true)
    expect(result.isDuplicate).toBe(true)
  })
})
```

### Files

- CREATE: `src/lib/services/message.ts` — Message store service with dedup [boundary: DB]

### Dependencies

- Blocked by: Issue 3 (enums), Issue 6 (dedup hash), Issue 7 (service role client)
- Blocks: Issue 12, Issue 18, Issue 19

### Type

feature

---

## Issue 12: Message service — build Claude messages array

### Context

The Anthropic Messages API is stateless — every call requires the full `messages[]` array. This function loads all messages for a conversation and maps them to `{ role, content }` format ordered by `created_at ASC`.

### Behavior to test

When preparing a Claude API call, the full conversation history is loaded and formatted as a messages array.

### Acceptance criteria

- [ ] Loads all messages for the given conversation ordered by `created_at ASC`
- [ ] Maps each message to `{ role: 'user' | 'assistant', content: string }`
- [ ] Returns empty array for new conversations
- [ ] Selects only `role` and `content` columns
- [ ] Returns `{ success: true, data: Array<{ role, content }> }` on success

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { buildClaudeMessages } from '@/lib/services/message'

describe('buildClaudeMessages', () => {
  it('loads and formats messages chronologically', async () => {
    const client = createMockClient()
    client.order.mockResolvedValueOnce({
      data: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Welcome!' },
      ],
      error: null,
    })
    const result = await buildClaudeMessages(client, 'conv-1')
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0]).toEqual({ role: 'user', content: 'Hi' })
  })

  it('returns empty array for new conversation', async () => {
    const client = createMockClient()
    client.order.mockResolvedValueOnce({ data: [], error: null })
    const result = await buildClaudeMessages(client, 'conv-new')
    expect(result.data).toEqual([])
  })
})
```

### Files

- MODIFY: `src/lib/services/message.ts` — Add `buildClaudeMessages` function [boundary: DB]

### Dependencies

- Blocked by: Issue 11 (file created there)
- Blocks: Issue 19

### Type

feature

---

## Issue 13: Lead service — determine qualification

### Context

Pure logic function — no database. Classifies leads as hot/warm/cold based on qualification signals. Thresholds are placeholders pending sales team input. Drives downstream routing: hot→Calendly+CRM, warm→email nurture, cold→archive.

### Behavior to test

When qualification data is provided, the correct hot/warm/cold status is determined based on thresholds.

### Acceptance criteria

- [ ] Returns `'hot'` when `callBooked` is `true` (override — always hot)
- [ ] Returns `'hot'` when `machineCount >= HOT_MACHINE_THRESHOLD` AND `emailCaptured` is `true`
- [ ] Returns `'warm'` when `emailCaptured` is `true` but hot criteria not met
- [ ] Returns `'cold'` when no email captured and no hot signals
- [ ] Handles all fields missing/undefined (defaults to cold)
- [ ] Uses exported placeholder constants for thresholds (e.g., `HOT_MACHINE_THRESHOLD = 5`)

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import {
  determineQualification,
  HOT_MACHINE_THRESHOLD,
} from '@/lib/services/lead'

describe('determineQualification', () => {
  it('returns hot when callBooked is true', () => {
    expect(
      determineQualification({ callBooked: true, emailCaptured: false })
    ).toBe('hot')
  })

  it('returns hot when machine threshold met + email captured', () => {
    expect(
      determineQualification({
        machineCount: HOT_MACHINE_THRESHOLD,
        emailCaptured: true,
        callBooked: false,
      })
    ).toBe('hot')
  })

  it('returns warm when email captured but below threshold', () => {
    expect(
      determineQualification({
        machineCount: 1,
        emailCaptured: true,
        callBooked: false,
      })
    ).toBe('warm')
  })

  it('returns cold when no email and no call', () => {
    expect(
      determineQualification({ emailCaptured: false, callBooked: false })
    ).toBe('cold')
  })

  it('returns cold when all fields missing', () => {
    expect(
      determineQualification({ emailCaptured: false, callBooked: false })
    ).toBe('cold')
  })
})
```

### Files

- CREATE: `src/lib/services/lead.ts` — Lead qualification logic (pure function + constants)

### Dependencies

- Blocked by: Issue 3 (QualificationStatus enum)
- Blocks: Issue 14, Issue 20

### Type

feature

---

## Issue 14: Lead service — create from summary

### Context

At conversation end, Claude generates a structured lead summary. This function validates it with Zod, determines qualification, and inserts a lead record into Supabase.

### Behavior to test

When Claude generates a lead summary, a validated lead record is created in Supabase with the correct qualification status.

### Acceptance criteria

- [ ] Validates summary input against `leadSummarySchema` from Issue 5
- [ ] Returns `{ success: false, error }` if validation fails
- [ ] Calls `determineQualification` from Issue 13 to set `qualification_status`
- [ ] Inserts a complete lead record
- [ ] Returns `{ success: true, data: Lead }` on success
- [ ] Handles missing optional fields in the summary

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createLead } from '@/lib/services/lead'

describe('createLead', () => {
  it('creates lead with correct qualification', async () => {
    const client = createMockClient()
    client.single.mockResolvedValueOnce({
      data: { id: 'lead-1', qualification_status: 'hot' },
      error: null,
    })
    const result = await createLead(client, 'contact-1', 'conv-1', {
      machineCount: 8,
      email: 'x@y.com',
      callBooked: true,
    })
    expect(result.success).toBe(true)
  })

  it('returns error when validation fails', async () => {
    const client = createMockClient()
    const result = await createLead(client, 'c1', 'cv1', {
      machineCount: 'bad',
    } as any)
    expect(result.success).toBe(false)
    expect(client.insert).not.toHaveBeenCalled()
  })

  it('returns error on database failure', async () => {
    const client = createMockClient()
    client.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert failed' },
    })
    const result = await createLead(client, 'c1', 'cv1', {
      callBooked: false,
      email: 'x@y.com',
    })
    expect(result.success).toBe(false)
  })
})
```

### Files

- MODIFY: `src/lib/services/lead.ts` — Add `createLead` function [boundary: DB]

### Dependencies

- Blocked by: Issue 5 (lead summary schema), Issue 13 (determineQualification)
- Blocks: Issue 20

### Type

feature

---

## Issue 15: System prompt v1 builder

### Context

The system prompt is the most critical build artifact. It defines Claude's persona, product knowledge, qualification criteria, objection handling, email capture flow, decision routing, and summary generation. Qualification thresholds are placeholders pending sales team input.

### Behavior to test

When building the system prompt, all 7 components are assembled with brand interpolation and version tagging. When prior summaries are provided for a returning contact, a returning-contact section is appended.

### Acceptance criteria

- [ ] Returns string containing all 7 sections: persona, company context, qualification criteria, objection handling, email capture, decision routing, summary generation
- [ ] Brand name interpolated throughout (not hardcoded)
- [ ] Version tag includes PROMPT_VERSION constant
- [ ] Returning contact section appended when `isReturningContact: true` with `priorSummaries`
- [ ] Returning contact section omitted when not provided
- [ ] Includes Instagram constraints (2,000 chars, 1-3 paragraphs)
- [ ] All 5 objection types from strategy doc present
- [ ] Placeholder qualification thresholds included (machine_count >= 5)

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompts/setter-v1'
import { PROMPT_VERSION } from '@/types/enums'

describe('buildSystemPrompt', () => {
  it('includes all 7 sections', () => {
    const prompt = buildSystemPrompt({ brandName: 'VendingPreneurs' })
    expect(prompt).toContain('VendingPreneurs')
    expect(prompt).toContain('email')
    expect(prompt).toContain('Calendly')
    expect(prompt).toContain('summary')
  })

  it('interpolates brand name', () => {
    const prompt = buildSystemPrompt({ brandName: 'MedPro' })
    expect(prompt).toContain('MedPro')
    expect(prompt).not.toContain('VendingPreneurs')
  })

  it('includes version tag', () => {
    const prompt = buildSystemPrompt({ brandName: 'VendingPreneurs' })
    expect(prompt).toContain(PROMPT_VERSION)
  })

  it('appends returning contact section with summaries', () => {
    const prompt = buildSystemPrompt({
      brandName: 'VP',
      isReturningContact: true,
      priorSummaries: ['Had 10 machines'],
    })
    expect(prompt).toContain('Had 10 machines')
  })

  it('omits returning contact section by default', () => {
    const prompt = buildSystemPrompt({ brandName: 'VP' })
    expect(prompt).not.toMatch(/returning contact/i)
  })
})
```

### Files

- CREATE: `src/lib/prompts/setter-v1.ts` — System prompt builder with all 7 components

### Dependencies

- Blocked by: Issue 3 (PROMPT_VERSION constant), Issue 5 (LeadSummary shape for summary section)
- Blocks: Issue 19

### Type

feature

---

## Issue 16: Claude service — build API request

### Context

Assembles the Claude Messages API request: model selection (claude-sonnet-4-20250514), system prompt, messages array, max_tokens, and the 4 tool definitions that let Claude extract structured data alongside reply text. Uses types from `@anthropic-ai/sdk` for type safety. Does NOT call the API — builds the payload.

### Behavior to test

When building a Claude API request, the request includes system prompt, messages, correct model, max_tokens, and all 4 tool definitions with input schemas.

### Acceptance criteria

- [ ] `@anthropic-ai/sdk` installed as a dependency
- [ ] `model` set to `claude-sonnet-4-20250514`
- [ ] `system` field contains the provided system prompt
- [ ] `messages` array passed through unchanged
- [ ] `max_tokens` set (e.g., 1024)
- [ ] Defines 4 tools: `capture_email`, `qualify_lead`, `generate_summary`, `book_call`
- [ ] `capture_email` input schema: `{ email: string }`
- [ ] `qualify_lead` input schema: `{ machine_count?, location_type?, revenue_range? }`
- [ ] `generate_summary` input schema matches LeadSummary shape
- [ ] `book_call` input schema: `{ calendly_slot?: string }`
- [ ] All tools have `description` fields

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import { buildClaudeRequest } from '@/lib/services/claude'

describe('buildClaudeRequest', () => {
  const prompt = 'You are a setter...'
  const msgs = [{ role: 'user' as const, content: 'Hey' }]

  it('sets correct model', () => {
    expect(buildClaudeRequest(prompt, msgs).model).toBe(
      'claude-sonnet-4-20250514'
    )
  })

  it('includes system prompt', () => {
    expect(buildClaudeRequest(prompt, msgs).system).toBe(prompt)
  })

  it('passes messages through', () => {
    expect(buildClaudeRequest(prompt, msgs).messages).toEqual(msgs)
  })

  it('defines all 4 tools', () => {
    const names = buildClaudeRequest(prompt, msgs).tools.map((t: any) => t.name)
    expect(names).toContain('capture_email')
    expect(names).toContain('qualify_lead')
    expect(names).toContain('book_call')
    expect(names).toContain('generate_summary')
  })

  it('all tools have descriptions', () => {
    for (const tool of buildClaudeRequest(prompt, msgs).tools) {
      expect(tool.description).toBeTruthy()
    }
  })
})
```

### Files

- CREATE: `src/lib/services/claude.ts` — `buildClaudeRequest` using `@anthropic-ai/sdk` types
- MODIFY: `package.json` — Add `@anthropic-ai/sdk` dependency

### Dependencies

- Blocked by: Issue 5 (LeadSummary shape for generate_summary tool)
- Blocks: Issue 17, Issue 19

### Type

feature

---

## Issue 17: Claude service — parse response

### Context

After calling Claude, the response contains `text` blocks (DM reply) and `tool_use` blocks (structured data). This function extracts both and enforces the Instagram 2,000-character limit on reply text.

### Behavior to test

When Claude responds, the reply text and any tool calls are extracted from content blocks, and the reply text respects the Instagram 2,000-character limit.

### Acceptance criteria

- [ ] Extracts text from `text` content blocks into `replyText`
- [ ] Extracts `tool_use` blocks into `toolCalls` array with `{ name, toolUseId, input }`
- [ ] Handles response with no tool calls (empty `toolCalls`)
- [ ] Handles response with no text blocks (empty `replyText`)
- [ ] Concatenates multiple text blocks with space
- [ ] Handles multiple tool_use blocks
- [ ] Truncates `replyText` to 2,000 chars if exceeded, sets `truncated: true`
- [ ] Preserves tool use `id` field

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'
import { parseClaudeResponse } from '@/lib/services/claude'

describe('parseClaudeResponse', () => {
  it('extracts reply text from single text block', () => {
    const result = parseClaudeResponse({
      content: [{ type: 'text', text: 'Hey!' }],
    })
    expect(result.replyText).toBe('Hey!')
    expect(result.toolCalls).toEqual([])
  })

  it('extracts tool calls', () => {
    const result = parseClaudeResponse({
      content: [
        { type: 'text', text: 'Got it.' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'capture_email',
          input: { email: 'a@b.com' },
        },
      ],
    })
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].name).toBe('capture_email')
  })

  it('handles no text blocks', () => {
    const result = parseClaudeResponse({
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'generate_summary',
          input: {},
        },
      ],
    })
    expect(result.replyText).toBe('')
  })

  it('concatenates multiple text blocks', () => {
    const result = parseClaudeResponse({
      content: [
        { type: 'text', text: 'Part 1.' },
        { type: 'text', text: 'Part 2.' },
      ],
    })
    expect(result.replyText).toBe('Part 1. Part 2.')
  })

  it('truncates over 2000 chars', () => {
    const result = parseClaudeResponse({
      content: [{ type: 'text', text: 'A'.repeat(2500) }],
    })
    expect(result.replyText.length).toBeLessThanOrEqual(2000)
    expect(result.truncated).toBe(true)
  })
})
```

### Files

- MODIFY: `src/lib/services/claude.ts` — Add `parseClaudeResponse` + response types

### Dependencies

- Blocked by: Issue 16 (file created there)
- Blocks: Issue 19

### Type

feature

---

## Issue 18: Webhook handler — validate and guard

### Context

The `/api/webhooks/inro` route handler is the entry point for all incoming Instagram DMs forwarded by Inro. It validates, deduplicates, checks opt-out, and delegates to the conversation engine.

### Behavior to test

When POST /api/webhooks/inro receives a request, invalid payloads return 400, duplicates and opted-out contacts return 200 with skip reason, valid new messages are processed and return 200 with the reply, and internal errors return 500 with a generic message.

### Acceptance criteria

- [ ] POST handler exported from route file
- [ ] Validates with `inroWebhookSchema` — 400 on failure
- [ ] Malformed JSON returns 400 without throwing
- [ ] Creates service role Supabase client
- [ ] Upserts contact, checks `opted_out` flag — 200 skip if opted out
- [ ] Dedup via `storeMessage` — checks `result.isDuplicate === true`, returns 200 skip if duplicate
- [ ] Valid new message calls `processMessage` and returns 200 with reply
- [ ] Internal errors return 500 with `{ error: 'Internal server error' }` — never leaks details
- [ ] GET and other methods not exported

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}))
vi.mock('@/lib/services/contact', () => ({ upsertContact: vi.fn() }))
vi.mock('@/lib/services/message', () => ({ storeMessage: vi.fn() }))
vi.mock('@/lib/services/engine', () => ({ processMessage: vi.fn() }))

import { POST } from '@/app/api/webhooks/inro/route'
import { upsertContact } from '@/lib/services/contact'
import { processMessage } from '@/lib/services/engine'

describe('POST /api/webhooks/inro', () => {
  it('returns 400 for malformed JSON', async () => {
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid payload', async () => {
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify({ contact_id: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 skip for opted-out contact', async () => {
    vi.mocked(upsertContact).mockResolvedValue({
      success: true,
      data: { opted_out: true },
    })
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: 'x',
        username: 'u',
        message: 'm',
        timestamp: '2026-04-09T10:00:00Z',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ skipped: true, reason: 'opted_out' })
  })

  it('returns 500 with generic message on internal error', async () => {
    vi.mocked(upsertContact).mockRejectedValue(new Error('DB down'))
    const req = new Request('http://localhost/api/webhooks/inro', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: 'x',
        username: 'u',
        message: 'm',
        timestamp: '2026-04-09T10:00:00Z',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
  })
})
```

### Files

- CREATE: `src/app/api/webhooks/inro/route.ts` — POST webhook handler [boundary: API]

### Dependencies

- Blocked by: Issues 4, 7, 8, 11, 19
- Blocks: none

### Type

feature

---

## Issue 19: Conversation engine — process message pipeline

### Context

The core orchestration function that processes an incoming message through the full pipeline: conversation management, context assembly, Claude API call, response parsing, and reply storage. The Claude API call is abstracted behind a callable interface for testability.

### Behavior to test

When a new message arrives, the full conversation pipeline executes: find/create conversation, load prior summaries, build system prompt, assemble message history, call Claude, parse response, store reply, and forward tool calls.

### Acceptance criteria

- [ ] `processMessage` returns `{ success: true, data: { reply, conversationId } }` on success
- [ ] Calls service functions in correct order with each step's output as next step's input
- [ ] Loads prior summaries and passes to system prompt builder
- [ ] If tool calls present, calls `routeLeadEvents` (Issue 20)
- [ ] Lead event routing failure does NOT block reply delivery (non-blocking)
- [ ] Errors from any step caught and returned as `{ success: false, error }` — never throws
- [ ] Claude API call via injected interface (testable without real API)

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/services/conversation')
vi.mock('@/lib/services/message')
vi.mock('@/lib/services/claude')
vi.mock('@/lib/prompts/setter-v1')

import { processMessage } from '@/lib/services/engine'
import {
  findOrCreateActiveConversation,
  loadPriorSummaries,
} from '@/lib/services/conversation'
import { storeMessage, buildClaudeMessages } from '@/lib/services/message'
import { buildClaudeRequest, parseClaudeResponse } from '@/lib/services/claude'
import { buildSystemPrompt } from '@/lib/prompts/setter-v1'

describe('processMessage', () => {
  it('executes full pipeline and returns reply', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: { id: 'conv-1' },
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({ success: true, data: [] })
    vi.mocked(buildSystemPrompt).mockReturnValue('system prompt')
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [{ role: 'user', content: 'Hi' }],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({
      model: 'claude-sonnet-4-20250514',
    })
    const mockClaude = vi
      .fn()
      .mockResolvedValue({ content: [{ type: 'text', text: 'Hey!' }] })
    vi.mocked(parseClaudeResponse).mockReturnValue({
      replyText: 'Hey!',
      toolCalls: [],
      truncated: false,
    })
    vi.mocked(storeMessage).mockResolvedValue({
      success: true,
      data: { id: 'msg-1' },
    })

    const result = await processMessage(
      {},
      { id: 'c1' },
      'msg-id',
      'Hi',
      '2026-04-09T10:00:00Z',
      mockClaude
    )
    expect(result).toEqual({
      success: true,
      data: { reply: 'Hey!', conversationId: 'conv-1' },
    })
  })

  it('returns error when conversation service fails', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: false,
      error: 'DB error',
    })
    const result = await processMessage(
      {},
      { id: 'c1' },
      'msg-id',
      'Hi',
      'ts',
      vi.fn()
    )
    expect(result).toEqual({ success: false, error: 'DB error' })
  })

  it('returns reply even if lead event routing fails', async () => {
    vi.mocked(findOrCreateActiveConversation).mockResolvedValue({
      success: true,
      data: { id: 'conv-1' },
    })
    vi.mocked(loadPriorSummaries).mockResolvedValue({ success: true, data: [] })
    vi.mocked(buildSystemPrompt).mockReturnValue('prompt')
    vi.mocked(buildClaudeMessages).mockResolvedValue({
      success: true,
      data: [],
    })
    vi.mocked(buildClaudeRequest).mockReturnValue({})
    const mockClaude = vi.fn().mockResolvedValue({ content: [] })
    vi.mocked(parseClaudeResponse).mockReturnValue({
      replyText: 'Reply',
      toolCalls: [{ name: 'capture_email', input: {} }],
      truncated: false,
    })
    vi.mocked(storeMessage).mockResolvedValue({ success: true, data: {} })
    // routeLeadEvents will fail but reply should still succeed

    const result = await processMessage(
      {},
      { id: 'c1' },
      'msg-id',
      'msg',
      'ts',
      mockClaude
    )
    expect(result.success).toBe(true)
  })
})
```

### Files

- CREATE: `src/lib/services/engine.ts` — `processMessage` pipeline [boundary: API, DB, third-party]

### Dependencies

- Blocked by: Issues 9, 10, 11, 12, 15, 16, 17
- Blocks: Issues 18, 20

### Type

feature

---

## Issue 20: Conversation engine — route lead events

### Context

When Claude's response includes tool calls, each is routed to the appropriate handler: `capture_email` updates the contact, `generate_summary` creates a lead and closes the conversation, `qualify_lead` is a no-op logged for audit, `book_call` logs to integration_events, and unknown tools are ignored.

### Behavior to test

When Claude's response includes tool calls, each tool call is routed to the appropriate handler and logged to integration_events.

### Acceptance criteria

- [ ] `routeLeadEvents` returns `{ success: true, eventsProcessed: number }`
- [ ] `capture_email`: updates contact's email field in Supabase
- [ ] `generate_summary`: validates with `leadSummarySchema`, calls `createLead`, then calls `closeConversation` (Issue 21)
- [ ] `generate_summary` with invalid data: logs error, does not create lead
- [ ] `qualify_lead`: no-op — logged to `integration_events` for audit only, no action taken (Claude consolidates data in generate_summary)
- [ ] `book_call`: inserts to `integration_events` with status='pending'
- [ ] Unknown tool names: ignored, not counted
- [ ] Empty `toolCalls` array: returns `{ success: true, eventsProcessed: 0 }`
- [ ] Errors in one tool call do not prevent processing subsequent calls
- [ ] Each event logged to `integration_events` table

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/services/lead', () => ({
  createLead: vi.fn(),
  determineQualification: vi.fn(),
}))

import { routeLeadEvents } from '@/lib/services/engine'
import { createLead } from '@/lib/services/lead'

describe('routeLeadEvents', () => {
  it('returns immediately for empty tool calls', async () => {
    const result = await routeLeadEvents({}, 'c1', 'cv1', [])
    expect(result).toEqual({ success: true, eventsProcessed: 0 })
  })

  it('handles capture_email', async () => {
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
        insert: vi.fn(() => ({ error: null })),
      })),
    }
    const result = await routeLeadEvents(client, 'c1', 'cv1', [
      { name: 'capture_email', input: { email: 'a@b.com' } },
    ])
    expect(result.eventsProcessed).toBe(1)
  })

  it('handles generate_summary with valid data', async () => {
    vi.mocked(createLead).mockResolvedValue({
      success: true,
      data: { id: 'lead-1' },
    })
    const client = {
      from: vi.fn(() => ({ insert: vi.fn(() => ({ error: null })) })),
    }
    const result = await routeLeadEvents(client, 'c1', 'cv1', [
      {
        name: 'generate_summary',
        input: {
          qualification_status: 'hot',
          call_booked: true,
          instagram_handle: 'x',
        },
      },
    ])
    expect(createLead).toHaveBeenCalled()
  })

  it('ignores unknown tool names', async () => {
    const result = await routeLeadEvents({}, 'c1', 'cv1', [
      { name: 'unknown', input: {} },
    ])
    expect(result.eventsProcessed).toBe(0)
  })

  it('continues on individual failure', async () => {
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
        insert: vi.fn(() => ({ error: null })),
      })),
    }
    vi.mocked(createLead).mockResolvedValue({
      success: false,
      error: 'validation failed',
    })
    const result = await routeLeadEvents(client, 'c1', 'cv1', [
      { name: 'capture_email', input: { email: 'a@b.com' } },
      { name: 'generate_summary', input: { bad: 'data' } },
      { name: 'book_call', input: {} },
    ])
    expect(result.eventsProcessed).toBeGreaterThanOrEqual(2)
  })
})
```

### Files

- MODIFY: `src/lib/services/engine.ts` — Add `routeLeadEvents` function [boundary: DB]

### Dependencies

- Blocked by: Issues 5, 13, 14, 19, 21 (closeConversation)
- Blocks: none

### Type

feature

---

## Issue 21: Close conversation service

### Context

When Claude generates a lead summary (via the `generate_summary` tool call), the conversation is complete. The conversation record needs to transition to status='completed', store Claude's summary for future returning-contact context, and set `ended_at`. This function is called from `routeLeadEvents` (Issue 20) when processing a `generate_summary` tool call.

### Behavior to test

When a conversation is closed, its status transitions to 'completed', the summary is stored, and `ended_at` is set to the current timestamp.

### Acceptance criteria

- [ ] `closeConversation(client, conversationId, summary)` updates the conversation record
- [ ] Sets `status` to `'completed'`
- [ ] Sets `summary` to the provided summary string
- [ ] Sets `ended_at` to the current timestamp
- [ ] Sets `updated_at` to the current timestamp
- [ ] Returns `{ success: true }` on success
- [ ] Returns `{ success: false, error: string }` on database error
- [ ] No-ops gracefully if conversation is already completed (idempotent)

### Test sketch

```typescript
import { describe, it, expect, vi } from 'vitest'
import { closeConversation } from '@/lib/services/conversation'

describe('closeConversation', () => {
  it('updates conversation to completed with summary', async () => {
    const client = createMockClient()
    client.single.mockResolvedValueOnce({
      data: { id: 'conv-1', status: 'completed', summary: 'Lead summary text' },
      error: null,
    })
    const result = await closeConversation(
      client,
      'conv-1',
      'Lead summary text'
    )
    expect(result.success).toBe(true)
    expect(client.update).toHaveBeenCalled()
    expect(client.eq).toHaveBeenCalledWith('id', 'conv-1')
  })

  it('returns error on database failure', async () => {
    const client = createMockClient()
    client.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    })
    const result = await closeConversation(client, 'conv-1', 'Summary')
    expect(result.success).toBe(false)
  })

  it('handles already-completed conversation gracefully', async () => {
    const client = createMockClient()
    client.single.mockResolvedValueOnce({
      data: { id: 'conv-1', status: 'completed' },
      error: null,
    })
    const result = await closeConversation(client, 'conv-1', 'Summary')
    expect(result.success).toBe(true)
  })
})
```

### Files

- MODIFY: `src/lib/services/conversation.ts` — Add `closeConversation` function [boundary: DB]

### Dependencies

- Blocked by: Issue 9 (conversation service file creation)
- Blocks: Issue 20 (routeLeadEvents calls closeConversation on generate_summary)

### Type

feature

---

## Issue 22: Middleware webhook exclusion

### Context

The existing middleware (`src/lib/supabase/proxy.ts` invoked from `src/proxy.ts`) refreshes auth sessions on every request using `getClaims()`. The webhook endpoint at `/api/webhooks/inro` receives unauthenticated POST requests from Inro — it has no session cookies. The middleware must skip webhook routes to avoid unnecessary auth processing on these requests.

### Behavior to test

When a request arrives at `/api/webhooks/*`, the middleware skips session refresh and passes the request through unchanged.

### Acceptance criteria

- [ ] Middleware matcher in `src/proxy.ts` excludes `/api/webhooks/:path*` routes
- [ ] Requests to `/api/webhooks/inro` are not processed by `updateSession()`
- [ ] Non-webhook routes (e.g., `/dashboard`, `/api/other`) still go through session refresh
- [ ] The exclusion pattern covers all webhook routes (future-proof for additional webhooks)

### Test sketch

```typescript
import { describe, it, expect } from 'vitest'

// Test the matcher pattern directly
const WEBHOOK_PATTERN = /^\/api\/webhooks\//

describe('middleware webhook exclusion', () => {
  it('matches webhook routes', () => {
    expect(WEBHOOK_PATTERN.test('/api/webhooks/inro')).toBe(true)
    expect(WEBHOOK_PATTERN.test('/api/webhooks/stripe')).toBe(true)
  })

  it('does not match non-webhook routes', () => {
    expect(WEBHOOK_PATTERN.test('/dashboard')).toBe(false)
    expect(WEBHOOK_PATTERN.test('/api/other')).toBe(false)
    expect(WEBHOOK_PATTERN.test('/')).toBe(false)
  })
})
```

### Files

- MODIFY: `src/proxy.ts` — Update middleware matcher config to exclude webhook routes

### Dependencies

- Blocked by: none
- Blocks: Issue 18 (webhook handler needs middleware exclusion in place)

### Type

feature
