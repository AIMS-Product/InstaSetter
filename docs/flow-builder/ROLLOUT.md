# Flow Builder — Rollout & Safety

Non-negotiable goal: **zero risk to the live VendingPreneurs setter** until we explicitly decide to flip traffic to the flow engine. Every change is feature-flagged. Every behavior is observable. Every flip is reversible in one SQL UPDATE.

## Safety invariants (hold throughout the build)

Violate any of these = stop, fix, or roll back. Codified as CI checks where possible.

1. **Additive-only schema.** New tables allowed. New nullable columns on existing tables allowed. No renames, no drops, no type changes, no NOT NULL additions on existing columns while the rollout is in flight.
2. **Every new code path is feature-flagged, default off in prod.** Flags: `flow_engine.use_compile_block`, `flow_engine.preview`, `flow_engine.ambient_triggers`, `flow_engine.shadow`, `flow_engine.live`. Per-brand scope where relevant.
3. **The `compile-block.contract.test.ts` must pass on every PR.** If it fails, PR cannot merge. This guarantees `compileBlock` output is byte-identical to what the engine produces today.
4. **No prod traffic touches the new flow engine until `flow_engine.live` is explicitly flipped per brand.** Weeks 1-6 are observe-only for prod runtime.
5. **All new engine integration points are wrapped in try/catch.** New-code errors log to Sentry but never throw into a prod reply.
6. **Shadow calls are fire-and-forget.** Shadow never awaits in the prod path. Shadow uses a separate rate-limit bucket and daily cost cap that auto-pauses on exceedance.
7. **In-flight conversation pinning is never bypassed.** `conversations.flow_version_id` + `flow_engine_used` flag stamp at conversation creation and don't migrate mid-stream.
8. **Every feature-flag flip is logged** with actor email + timestamp in `ins_feature_flags_audit`, append-only.
9. **The kill switch is one SQL UPDATE** — `UPDATE ins_feature_flags SET enabled = false WHERE key = 'flow_engine.live' AND scope_id = ?`. Tested weekly in a staging drill.
10. **Rollback plan exists for every migration.** Migration files include a `-- DOWN` stub or a tested `supabase migration repair` path.

## Per-week prod impact matrix

| Week | Ships to prod                                                                                                               | Prod runtime changes?                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1    | New tables (empty). `conversations.flow_version_id` nullable col. `compileBlock` merged behind flag. Contract test passing. | No                                         |
| 2    | Dashboard UI at `/dashboard/*`. Auth-gated.                                                                                 | No                                         |
| 3    | `/api/preview` deployed. Preview cache populates from dashboard users only.                                                 | No                                         |
| 4    | `/api/cron/fire-triggers` deployed, cron registered. Trigger table empty, cron is a no-op.                                  | No                                         |
| 5    | `flow_engine.shadow` on for VP. Shadow calls logged, nothing sent.                                                          | No                                         |
| 6    | Parity gate evaluated. Conversation replay ships.                                                                           | No                                         |
| 7    | `flow_engine.live` on for VP. First real cutover, kill switch on standby.                                                   | **Yes — VP only.** Other brands unchanged. |

Weeks 1-6 are invisible to prospects. Only Week 7 could change what any DM recipient experiences, and by then we have 7 days of sub-1% tool-call parity.

## Phases

### Phase 0 — Seed (safe, no traffic impact)

**Goal**: get the hardcoded setter-v2 sections into the flow-editor data model so marketers can see them, clone them, and start drafting — without changing what prod does.

- Port each section in `src/lib/prompts/sections/` into a Block definition (same text, wrapped in the Block schema).
- Compose them into a flow: `Opening → Qualifier → {Objection Handler, Email Capture, Booking Handoff} → Summary`.
- Publish as `ins_flow_versions.source = 'code'`, `status = 'published'`, `version_number = 1`.
- Dashboard shows the seed flow as **read-only**. A "Fork to edit" button creates a new draft.
- Runtime (`engine.ts`) **unchanged**. Still uses the hardcoded `buildSystemPrompt()`.

Exit criteria: seed flow visible in dashboard. Marketer can fork. No runtime impact.

### Phase 1 — Shadow mode (observe only, no traffic impact)

**Goal**: for every live inbound message, the flow engine computes what the response WOULD be and stores it alongside the real response. Nothing is sent to Instagram from the flow engine. We log diffs and fix them.

**Implementation sketch** (in `engine.ts`):

```typescript
// EXISTING path — untouched
const realResponse = await runClaudeLoop(setterV2Prompt, tools, messages)
await sendToInstagram(realResponse)

// NEW shadow path — only if feature flag enabled
if (await flagOn('flow_engine.shadow', { brand_id })) {
  // Don't await — fire and forget so shadow never blocks prod
  runShadowComparison({
    conversation_id,
    realResponse,
    flow_version_id: activeFlowVersionId,
    inbound_message,
  }).catch(logShadowError)
}
```

`runShadowComparison`:

1. Reads `ins_flow_versions.compiled` for the active version.
2. Computes system prompt + tools from the compiled graph.
3. Calls Claude with the same messages (isolated rate-limit bucket).
4. Writes a row to `ins_shadow_events`:
   - `conversation_id`, `brand_id`, `inbound_message_id`
   - `real_response_text`, `shadow_response_text`
   - `real_tools_called jsonb`, `shadow_tools_called jsonb`
   - `diff_summary` (auto-computed: text-diff score, tool-set diff, active-block trace)
   - `prompt_version_real`, `flow_version_id_shadow`
   - `created_at`

Dashboard page `/shadow-diffs` shows rolling stats:

- Conversations compared (per day)
- % of turns with semantically equivalent output (cosine over embeddings, threshold configurable)
- % with tool-call mismatches (the scary one — a tool fires in shadow but not real, or vice versa)
- Top N diffs worth reviewing, ranked by tool mismatch severity then length delta

**Safeguards**:

- Shadow Claude calls go through a separate rate-limit bucket so shadow cannot starve prod.
- Shadow Claude calls use Sonnet 4.6 (per memory `feedback_model_preference.md` — no 3.x models).
- Shadow cost has a daily cap per brand (e.g. $20/day) — if exceeded, shadow auto-pauses for that brand until next day.
- Shadow errors never throw into the prod path. Failures are logged, never raised.

Exit criteria: shadow runs for 1–2 weeks. Tool-call mismatches fixed. Text-diff equivalence >90% for the same brand.

### Phase 2 — Per-brand cutover (controlled traffic flip)

**Goal**: flip one brand's live conversations to the flow engine. Other brands unchanged. Kill switch reverts instantly.

**Flag**: `flow_engine.live` with per-brand scope. Default off.

**Runtime branch** in `engine.ts`:

```typescript
if (await flagOn('flow_engine.live', { brand_id })) {
  const flowResponse = await runFlowEngine(conversation, activeFlowVersionId)
  await sendToInstagram(flowResponse)
} else {
  const realResponse = await runClaudeLoop(setterV2Prompt, tools, messages)
  await sendToInstagram(realResponse)
}
```

**Conversation pinning**: each `conversations` row stamps `flow_version_id` and `flow_engine_used: boolean` at creation time. In-flight conversations do NOT migrate mid-stream.

**Cutover procedure** (VendingPreneurs when ready):

1. Confirm shadow diffs <1% tool-call mismatch for 7 consecutive days.
2. Flip `flow_engine.live` for VendingPreneurs to `true`.
3. Monitor for 1 hour:
   - Booking rate (real-time proxy: `book_call` tool firings)
   - Email capture rate
   - Silence rate (conversations going quiet after bot reply)
   - Error rate (engine exceptions)
4. If any metric degrades beyond threshold, flip the flag back. All new conversations revert to setter-v2 immediately. In-flight conversations on the flow engine continue to completion.

**Kill switch**: a single `UPDATE ins_feature_flags SET enabled = false WHERE key = 'flow_engine.live' AND brand_id = 'vp'` reverts new traffic in <100ms.

### Phase 3 — Full cutover

When every active brand is stable on the flow engine for 30+ days:

- Remove the shadow-mode path from `engine.ts`.
- Archive `src/lib/prompts/sections/*.ts` files (keep as historical reference).
- Delete the hardcoded `buildSystemPrompt()` code path.
- `ins_feature_flags` retains `flow_engine.live` as permanently-enabled (useful for incident response).

## Shadow-diff review workflow

Dashboard page `/shadow-diffs`:

- Sortable table of shadow events with tool-call mismatch count, text-diff score, brand filter.
- Click a row → side-by-side diff view:
  - Left: real response + tools called
  - Right: shadow response + tools called + which Block of the flow was active
  - Below: the full compiled system prompt for each side (collapsed, click to expand)
- "Mark as known-benign" button (e.g. wording variations that don't matter) attaches a comment and excludes the event from the mismatch rate calc.
- Weekly summary emailed to eng: top 10 unresolved diffs.

## Feature flag plumbing

- New table: `ins_feature_flags`
  - `id, key text, scope text ('global'|'brand'), scope_id uuid nullable, enabled boolean, updated_by text, updated_at timestamptz`
  - Unique on `(key, scope, scope_id)`
- `flagOn(key, context)` is a service in `src/lib/services/flags.ts` with a 60-second in-memory cache per server instance.
- Admin page in dashboard to flip flags manually. All flips go through `ins_feature_flags_audit` (append-only log).
- Flags relevant to this rollout: `flow_engine.shadow`, `flow_engine.live`, `flow_engine.editor_enabled` (gates the dashboard UI itself during dev).

## Rollback matrix

| Scenario                               | Action                                                 | Time-to-recover                |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| Flow engine throws on live traffic     | Flip `flow_engine.live` off                            | <1 min                         |
| Shadow mode costs spike                | Shadow auto-pauses on daily cap; manual flip otherwise | Immediate auto / <1 min manual |
| Published flow has bad copy            | Rollback button → previous version                     | <30 sec                        |
| In-flight conversations on bad version | Emergency cutover toggle (off by default)              | Manual, typed confirm          |
| Schema migration breaks prod writes    | Standard Supabase migration rollback                   | <5 min                         |

## Success criteria for each phase

- **Phase 0**: seed flow visible and forkable. Zero runtime diff.
- **Phase 1**: >90% text-equivalence, <1% tool-call mismatch for 7 days on VP.
- **Phase 2**: booking rate within ±5% of baseline for 14 days post-cutover on VP. Zero critical errors.
- **Phase 3**: all brands stable. Shadow path deletable.
