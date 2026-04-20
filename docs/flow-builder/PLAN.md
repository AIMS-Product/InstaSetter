# Flow Builder — Core Primitives Plan (TDD)

Test-driven build plan for the three non-negotiable v1 primitives. Each slice is: **write failing test → minimal impl to pass → refactor → commit**.

## Fully expanded per-slice specs

Every slice below is expanded in its own SPEC file with actual test bodies, impl skeletons, fixture usage, migration SQL, and per-commit messages. Read these in order when you build:

1. [SPEC-TEST-INFRA.md](SPEC-TEST-INFRA.md) — shared fixtures, stubs, Supabase harness, Playwright, CI, time control. Build day 1 before any feature slice.
2. [SPEC-WEEK-1.md](SPEC-WEEK-1.md) — foundation: schemas, `compileBlock`, contract test, seed setter-v2.
3. [SPEC-WEEK-2.md](SPEC-WEEK-2.md) — editor UI: pages, canvas, right pane, block editor, save + publish Server Actions.
4. [SPEC-PRIMITIVE-1.md](SPEC-PRIMITIVE-1.md) — live reply preview: cache + rate limit + `/api/preview` + panel UI.
5. [SPEC-PRIMITIVE-2.md](SPEC-PRIMITIVE-2.md) — ambient triggers: scheduler + cron + engine hooks + Meta window UX.
6. [SPEC-PRIMITIVE-3.md](SPEC-PRIMITIVE-3.md) — compiled prompt debugger: source labels, drawer UI, clipboard copy, deep-links.

The overview below stays short — the SPECs are authoritative.

## Locked decisions

|                                     |                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Preview rate limit                  | **500/day/user/bot**                                                       |
| HUMAN_AGENT trigger approval        | **No in-app queue.** Routes to email/Slack for eng review; out of v1 scope |
| Compiled prompt debugger visibility | **Always available** — no dev-mode gate                                    |

## Effort (TDD-inclusive)

| Primitive                                            | Effort                     |
| ---------------------------------------------------- | -------------------------- |
| Week 1 — Foundation (schema + `compileBlock` + seed) | 5 days                     |
| Week 2 — Editor UI                                   | 5 days                     |
| #1 Live reply preview                                | 3.5 days                   |
| #2 Ambient triggers                                  | 6.5 days                   |
| #3 Compiled prompt debugger                          | 3 days                     |
| Week 5-7 — Shadow + polish + cutover                 | 15 days                    |
| **Total v1**                                         | **~42-48 days (~9 weeks)** |

TDD adds ~15% versus the previous estimates. Worth it — contract drift between `compileBlock` and the engine is the single worst failure mode we can have, and only a contract test prevents it.

---

## Testing stack

- **Vitest 4** — unit + component tests (already installed)
- **Real local Supabase** for integration tests — no DB mocks. We hit a fresh local Supabase per suite and run the real migrations.
- **Playwright** — e2e (install Week 1 day 1)
- **MSW** or a local Claude stub — `src/test/claude-stub.ts` returns deterministic canned responses by input hash
- **SendPulse stub** — `src/test/sendpulse-stub.ts` records `sendInstagramMessage` calls without hitting the network

Server Actions get route tests. API routes get route tests. No exceptions. Test behavior, not implementation.

## Shared test infrastructure (Week 1 Day 1)

Before any production code:

- `src/test/supabase.ts` — starts local Supabase, runs migrations, provides per-test isolation via transactions
- `src/test/fixtures.ts` — `createTestBot()`, `createTestFlow()`, `createTestContact()`, `createTestConversation()`
- `src/test/claude-stub.ts` — canned replies, asserts on calls, returns realistic tool_use shapes
- `src/test/sendpulse-stub.ts` — records outbound calls, lets us assert message tag + content
- `src/test/auth.ts` — `signInAsMarketer(botId)` — issues a real Supabase session

Tests for the test infrastructure themselves: ~0.5 day. Worth it — flaky fixtures poison every downstream test.

---

## Week 1 — Foundation

### Schema test plan

`supabase/migrations/__tests__/schema.test.ts` (integration, real Supabase):

- `all migrations apply to a fresh DB without error`
- `every flow-builder table has RLS enabled`
- `service_role can CRUD; anon role is denied`
- `FK cascades: deleting an ins_flow removes its versions and channels`
- `unique constraint on (ins_flow_versions.flow_id, version_number)`
- `ins_scheduled_triggers.fires_at partial index exists and is used` (via EXPLAIN)

### `compileBlock` test plan

`src/lib/prompts/__tests__/compile-block.test.ts` (unit):

1. `returns 6 PromptSection types: persona, constraints, block, capture, routing, context`
2. `each section has source.type in {bot, block, runtime, contact}`
3. `each section has non-empty source.label`
4. `persona body = bot.personaText` — mutating bot flips section body
5. `constraints body includes "MAXIMUM 2 sentences"` — Bot-level defaults propagate
6. `block.goal appears in block section body`
7. `each block.exampleGood entry appears verbatim in block section`
8. `routing section formats "When X → Y" in marketer language` (not raw boolean expressions)
9. `context section splits runtime into Known and Unknown buckets`
10. `same inputs → identical output` (deterministic)
11. `adding unrelated runtime variable doesn't reorder sections`
12. `returns empty block section if block has no goal/guidance/examples` (edge)

### Contract test (zero-drift guarantee)

`src/lib/prompts/__tests__/compile-block.contract.test.ts`:

- **`joined sections === what engine sends to Claude`**
  - for each block type in the VendingPreneurs seed flow
  - `compileBlock(b, bot, ctx).map(s => s.body).join('\n\n')` must equal the actual system prompt the engine builds for the same block + context
  - this is THE test that keeps the debugger honest forever

### Seed setter-v2 test plan

`src/lib/prompts/__tests__/seed-setter-v2.test.ts`:

- `seed flow has 8 blocks matching current section files`
- `each block's rendered prompt is byte-identical to the current hardcoded section output`
- `source is marked code, version is 1, status is published`

### Implementation slices (each = red → green → commit)

| #   | Slice                                     | Test file(s)                   | Impl file(s)                            |
| --- | ----------------------------------------- | ------------------------------ | --------------------------------------- |
| 1   | Test infra + Playwright install           | `src/test/*`                   | —                                       |
| 2   | Schema: ins_flows + ins_flow_versions     | schema.test.ts                 | `supabase/migrations/20260418_core.sql` |
| 3   | Schema: ins_flow_channels + publish_log   | schema.test.ts                 | same migration file                     |
| 4   | Schema: ins_flow_variables                | schema.test.ts                 | same migration                          |
| 5   | `PromptSection` type + empty compileBlock | compile-block.test.ts #1       | `src/lib/prompts/compile-block.ts`      |
| 6   | persona section                           | #2, #3, #4                     | compile-block.ts                        |
| 7   | constraints section                       | #5                             | compile-block.ts                        |
| 8   | block section                             | #6, #7                         | compile-block.ts                        |
| 9   | capture section                           | new test                       | compile-block.ts                        |
| 10  | routing section                           | #8                             | compile-block.ts                        |
| 11  | context section                           | #9, #11                        | compile-block.ts                        |
| 12  | Determinism + edge cases                  | #10, #12                       | compile-block.ts                        |
| 13  | **Contract test vs engine**               | compile-block.contract.test.ts | refactor engine to call compileBlock    |
| 14  | Seed setter-v2 script                     | seed-setter-v2.test.ts         | `scripts/seed-setter-v2.ts`             |

Week 1 deliverable: all tests green; runtime still uses hardcoded prompts via compileBlock under the hood; seed flow visible in DB.

---

## Week 2 — Editor UI (TDD)

Same rhythm. Every component gets a component test before the implementation lands.

| #   | Slice                                            | Test                          | Impl                    |
| --- | ------------------------------------------------ | ----------------------------- | ----------------------- |
| 1   | Flow page loads flow from Supabase               | `page.test.tsx`               | `page.tsx`              |
| 2   | Block palette renders 8 block types              | `block-palette.test.tsx`      | `block-palette.tsx`     |
| 3   | Canvas renders nodes + edges from flow graph     | `flow-canvas.test.tsx`        | `flow-canvas.tsx`       |
| 4   | Block node shows goal + branch pills             | `block-node.test.tsx`         | `nodes/block-node.tsx`  |
| 5   | Right pane tabs switch content                   | `right-pane.test.tsx`         | `right-pane.tsx`        |
| 6   | Block editor saves via Server Action (debounced) | `save-block.action.test.ts`   | Server Action + editor  |
| 7   | Condition builder renders rules from string      | `condition-builder.test.tsx`  | `condition-builder.tsx` |
| 8   | Publish Server Action snapshots a new version    | `publish-flow.action.test.ts` | Server Action           |
| 9   | Multi-user last-write-wins banner                | `editor.test.tsx`             | editor shell            |

Coverage target: 80% on Server Actions, 60% on components.

---

## Primitive #1 — Live reply preview

### Test plan (in order)

#### Rate limit unit tests

`src/lib/services/__tests__/preview-rate-limit.test.ts`:

1. `new user on new day returns { used: 0, limit: 500 }`
2. `incrementUsage bumps count by 1`
3. `at 500/500 returns reason='rate_limited' without calling impl`
4. `counter resets at UTC midnight`
5. `isolated per (user_email, bot_id, date)` — two bots tracked separately

#### Preview cache unit tests

`src/lib/services/__tests__/preview-cache.test.ts`:

1. `get(checksum) returns null when no row`
2. `put(checksum, reply) inserts row`
3. `get(checksum) returns reply after put` + bumps last_used_at
4. `pruneStale removes rows with last_used_at < now - 30 days`

#### `previewBlockReply` orchestrator tests

`src/lib/services/__tests__/preview.test.ts` (Claude stubbed):

1. `cache hit: returns reply, fromCache=true, 0 Claude calls`
2. `cache miss: calls Claude, inserts cache, increments usage, fromCache=false`
3. `at rate limit: returns error:rate_limited, 0 Claude calls, 0 cache writes`
4. `Claude throws: returns error:claude_error, rate limit NOT incremented, no cache write`
5. `checksum differs when block.guidance changes` (regen on edit)
6. `checksum differs when sampleProspectMessage changes`
7. `model locked to claude-sonnet-4-6`

#### API route integration tests

`src/app/api/preview/__tests__/route.test.ts` (real Supabase, auth, Claude stub):

1. `POST without auth → 401`
2. `POST with invalid body → 400 with zod errors`
3. `POST valid → 200 with reply, fromCache, usageUsed, usageLimit`
4. `POST at 500th call → 429`

#### Component tests

`src/app/dashboard/flows/[flowId]/components/__tests__/preview-panel.test.tsx`:

1. `shows "No preview yet" when block has no guidance`
2. `after 1.5s debounce, fires preview call with current guidance`
3. `shows "cached" badge when response.fromCache=true`
4. `shows usage counter "4 of 500"`
5. `shows rate-limit banner at limit with reset time`
6. `switching sample prospect dropdown re-fires preview`
7. `regenerate button re-fires even on identical input`

#### E2E

`tests/e2e/live-preview.spec.ts`:

- marketer opens Qualifier
- edits guidance
- waits 1.5s
- preview text appears within 3s total
- undo edit
- preview reverts (cached path, <500ms)

### Implementation slices

| #   | Slice                                            | Red                        | Green                                      |
| --- | ------------------------------------------------ | -------------------------- | ------------------------------------------ |
| 1   | Migration: ins_preview_cache + ins_preview_usage | schema.test.ts             | `supabase/migrations/20260418_preview.sql` |
| 2   | Rate limit service                               | preview-rate-limit.test.ts | `src/lib/services/preview-rate-limit.ts`   |
| 3   | Cache service                                    | preview-cache.test.ts      | `src/lib/services/preview-cache.ts`        |
| 4   | Prune cron registration                          | cache test #4              | vercel.json + route                        |
| 5   | `previewBlockReply` orchestrator                 | preview.test.ts            | `src/lib/services/preview.ts`              |
| 6   | `/api/preview` route                             | route.test.ts              | `src/app/api/preview/route.ts`             |
| 7   | Seed sample prospects per block type             | new snapshot test          | `src/lib/prompts/preview-seeds.ts`         |
| 8   | Preview panel UI + debounce                      | preview-panel.test.tsx     | `components/preview-panel.tsx`             |
| 9   | E2E happy path                                   | live-preview.spec.ts       | (no new impl)                              |

**3.5 days** with TDD.

---

## Primitive #2 — Ambient triggers

### Test plan (in order)

#### Meta window unit tests

`src/lib/services/__tests__/meta-window.test.ts`:

1. `inWindow(lastInbound, now) true when diff < 24h`
2. `inWindow false at 24h + 1s`
3. `resolveMode('in_window_only', outOfWindow) → {action: 'drop'}`
4. `resolveMode('human_agent_tag', outOfWindow) → {action: 'send', tag: 'HUMAN_AGENT'}`
5. `resolveMode('wait_for_next_window', outOfWindow) → {action: 'defer'}`
6. `resolveMode(*, inWindow) → {action: 'send', tag: null}`

#### Schedule unit tests

`src/lib/services/__tests__/scheduler-schedule.test.ts`:

1. `inserts one row per matching trigger spec`
2. `skips triggers whose triggerOn.blockId != entered block`
3. `honors delay.amount/unit across minute|hour|day`
4. `copies cancel_on and meta_send_mode from spec`
5. `sets fires_at = now + delay`
6. `scheduling is idempotent if called twice for same block entry` (conversation + trigger_id unique)

#### Cancel unit tests

`src/lib/services/__tests__/scheduler-cancel.test.ts`:

1. `cancels rows where cancel_on includes 'prospect_reply'`
2. `does not touch rows that don't include 'prospect_reply'`
3. `sets cancelled_reason + cancelled_at`
4. `does not mutate rows already status=fired|cancelled`
5. `returns count of cancelled rows`

#### fireDueTriggers unit tests (with real Supabase)

`src/lib/services/__tests__/scheduler-fire.test.ts`:

1. `picks rows where fires_at < now AND status='scheduled'`
2. `ignores rows where fires_at > now`
3. `limit 100 per call`
4. `FOR UPDATE SKIP LOCKED: 2 concurrent callers divide work, no row fired twice`
5. `success path: SendPulse called, row marked fired`
6. `SendPulse error: row marked failed, error persisted`
7. `meta window drop: row marked cancelled, reason='outside_meta_window'`
8. `meta window defer: row status=awaiting_window, fires_at=null`
9. `HUMAN_AGENT mode: SendPulse called with tag='HUMAN_AGENT'`

#### Cron route integration test

`src/app/api/cron/fire-triggers/__tests__/route.test.ts`:

1. `GET without Authorization header → 401`
2. `GET with wrong secret → 401`
3. `GET with CRON_SECRET → 200, returns {fired, failed, skipped, awaiting}`
4. `fires actually send via SendPulse stub with correct target block reply`

#### Engine hook integration tests

`src/lib/services/__tests__/engine-triggers.test.ts`:

1. `on block entry: triggers are scheduled`
2. `on inbound message: pending triggers are cancelled`
3. `on conversation close (summary tool): all pending cancelled`
4. `cancellation fires BEFORE Claude runs for the new reply` (ordering matters)

#### Component tests

`components/__tests__/ambient-triggers-section.test.tsx`:

1. `renders all triggers for the flow`
2. `Add trigger opens modal`
3. `modal requires delay + target block; disables Save otherwise`
4. `shows Meta window warning when delay > 24h AND mode='in_window_only'`
5. `warning includes explicit suggestion ("switch to HUMAN_AGENT tag")`
6. `disable toggle persists via Server Action`

#### E2E

`tests/e2e/ambient-trigger.spec.ts`:

1. **fires after delay**: set 60s trigger → send inbound → wait 70s → reply sent + row=fired
2. **cancels on reply**: set 60s trigger → send inbound within 30s → row=cancelled, reason='prospect_reply'
3. **Meta window warning**: set 30h trigger with in_window_only → UI shows red warning

### Implementation slices

| #   | Slice                                             | Test                           | Impl                               |
| --- | ------------------------------------------------- | ------------------------------ | ---------------------------------- |
| 1   | Schema: ins_scheduled_triggers + indexes + RLS    | schema.test.ts                 | migration                          |
| 2   | `meta-window.ts` pure functions                   | meta-window.test.ts            | service                            |
| 3   | `scheduleAmbientTriggersForBlock`                 | scheduler-schedule.test.ts     | service                            |
| 4   | `cancelTriggersForConversation`                   | scheduler-cancel.test.ts       | service                            |
| 5   | `fireDueTriggers` with SKIP LOCKED                | scheduler-fire.test.ts         | service                            |
| 6   | `/api/cron/fire-triggers` route                   | route.test.ts                  | API route + vercel.json cron entry |
| 7   | Engine integration: schedule hook                 | engine-triggers.test.ts #1     | engine.ts edit                     |
| 8   | Engine integration: cancel on inbound             | engine-triggers.test.ts #2, #4 | engine.ts edit                     |
| 9   | Engine integration: cancel on close               | engine-triggers.test.ts #3     | engine.ts edit                     |
| 10  | SendPulse tag passthrough                         | sendpulse.test.ts new          | sendpulse.ts edit                  |
| 11  | Flow schema: ambientTriggers array in graph jsonb | serialization test             | compile-block.ts                   |
| 12  | UI: Ambient Triggers section + modal              | component test                 | component files                    |
| 13  | E2E                                               | ambient-trigger.spec.ts        | (no new impl)                      |

**6.5 days** with TDD.

---

## Primitive #3 — Compiled prompt debugger

Most of this primitive's correctness is guaranteed by the **contract test from Week 1** (engine == debugger). The primitive-specific work is UI + navigation + live updates.

### Test plan

#### Extended compiler tests

`src/lib/prompts/__tests__/compile-block.test.ts` (add):

1. `section.source.editUrl points to bot-settings for persona/constraints`
2. `section.source.editUrl points to block-editor for block/capture/routing`
3. `section.source.editUrl points to vars-tab for context`
4. `editUrl handles deep-linking with stable ids that survive name changes`

#### Component tests

`components/__tests__/compiled-prompt-drawer.test.tsx`:

1. `drawer is collapsed by default`
2. `"Show Compiled Prompt" button toggles drawer`
3. `drawer renders 6 labeled sections in fixed order`
4. `each section header shows [from: <label>] chip`
5. `clicking [from: Bot settings] chip triggers navigation callback with correct url`
6. `copy button puts concatenated body on clipboard, shows "copied" tooltip`
7. `drawer updates when Block editor Goal changes (live binding via compileBlock)`
8. `runtime section falls back to example values when simulator not active`

#### E2E

`tests/e2e/compiled-prompt.spec.ts`:

1. open Qualifier → click Show Compiled Prompt → see 6 sections
2. click [from: Bot settings] → navigated to bot settings with persona focused
3. edit Goal in Block editor → Block section in drawer updates within 200ms
4. click Copy → paste into a scratch input → text matches engine output for same context

### Implementation slices

| #   | Slice                                   | Test                        | Impl                         |
| --- | --------------------------------------- | --------------------------- | ---------------------------- |
| 1   | `source.editUrl` added to PromptSection | compile-block.test.ts added | compile-block.ts edit        |
| 2   | Drawer UI (collapsed/expanded)          | drawer.test.tsx #1, #2      | `compiled-prompt-drawer.tsx` |
| 3   | Section rendering with labels           | #3, #4                      | drawer.tsx                   |
| 4   | Source chip click → navigation          | #5                          | drawer.tsx + `useRouter`     |
| 5   | Copy button                             | #6                          | drawer.tsx                   |
| 6   | Live-update on editor change            | #7                          | wire drawer to block state   |
| 7   | Runtime fallback to example values      | #8                          | drawer.tsx                   |
| 8   | E2E                                     | compiled-prompt.spec.ts     | (none)                       |

**3 days** with TDD.

---

## Cross-cutting tests

Run these beyond the TDD loop:

### Mutation tests (weekly, not per commit)

For each block type: mutate one field at a time, assert `compileBlock` output differs in exactly that section's body and nowhere else. Catches accidental section bleed.

### Snapshot tests

`src/lib/prompts/__tests__/__snapshots__/` — compiled prompts for VendingPreneurs seed flow, per block. Any change to the compiler requires snapshot update in the PR, which forces human review.

### Performance tests

`src/lib/prompts/__tests__/perf.test.ts`:

- `compileBlock < 10ms for typical block`
- `previewBlockReply < 200ms for cache hit`
- `fireDueTriggers < 2s for 100 due rows`

### Shadow-mode parity test (Week 5 gate)

For every real inbound from the last 7 days on VendingPreneurs:

- compute the shadow reply via compileBlock + stubbed Claude
- compare tool calls to the real reply's tool calls
- **block Phase 2 cutover until tool-call mismatch rate < 1%**

---

## Coverage targets

| Surface                          | Target                                                   |
| -------------------------------- | -------------------------------------------------------- |
| `src/lib/services/*`             | ≥ 85% line, ≥ 75% branch                                 |
| `src/lib/prompts/*`              | ≥ 90% line (compiler is load-bearing)                    |
| Server Actions                   | 100% happy path, explicit unhappy path per error variant |
| API routes                       | 100% status codes covered                                |
| Components                       | ≥ 60% (test behavior, not styling)                       |
| `compile-block.contract.test.ts` | Must pass. No exceptions. No skip.                       |

---

## TDD workflow per slice

```
1. Open the test file for the slice (red).
2. Write the test for ONE behavior. Run. Confirm failing for
   the right reason (not a typo, not a missing import).
3. Write the minimum code to pass. Run. Green.
4. Refactor if needed. Run. Still green.
5. Commit: "test(<area>): <behavior>" + "feat(<area>): implement <behavior>"
   as two commits, OR as one commit if the slice is tiny.
6. Move to next behavior in the test file. Repeat.
```

Commit cadence: 5–15 commits per primitive. Each commit should be runnable and tests-green.

## Build order (unchanged, TDD-aware)

1. **Wk 1** — Foundation + test infrastructure + Playwright install
2. **Wk 2** — Editor UI
3. **Wk 3** — Primitives #1 + #3 (share the compiler)
4. **Wk 4** — Primitive #2
5. **Wk 5** — Shadow mode (ROLLOUT.md Phase 1) with parity gate
6. **Wk 6** — Observability v1 + polish + drag-to-add
7. **Wk 7** — First live brand (ROLLOUT.md Phase 2)
