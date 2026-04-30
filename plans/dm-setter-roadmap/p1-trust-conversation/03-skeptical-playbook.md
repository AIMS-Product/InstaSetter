# [P1.03] Skeptical / adversarial conversation playbook + escalation tag

**Status:** open
**Phase:** 1 — Trust + conversation foundations
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385010166660
**Owner:** unassigned
**Depends on:** none
**Blocks:** none directly. Operationally, P3 (Close handoff) consumes the escalation event but does not need this to ship first.
**Risk:** medium — touches the live prompt and the live SendPulse webhook
**Rough size:** M (1–3 days)

## Decision Record

**The escalation signal is a new tool named `request_human_review`, NOT an `escalate: true` field added to `generate_summary`.**

Rationale:

1. **Detectable without parsing free text.** `request_human_review` shows up as a distinct `tool_use` block in the Claude response — the engine matches on `call.name === 'request_human_review'` exactly, the same way it matches `capture_email` / `qualify_lead` / `book_call`. An `escalate: true` field on `generate_summary` would force the engine to peek inside `call.input` and dispatch on a sub-field, which is fragile and out of pattern.
2. **Schema-validated severity / category.** A dedicated tool gives us a typed `input_schema` (with `severity: 'concern' | 'hostile' | 'compliance'`) that Claude is forced to fill correctly. Overloading `generate_summary`'s `key_notes` or metadata to carry severity is unstructured and requires regex parsing.
3. **Backwards-compatible.** `generate_summary`'s contract (`leadSummarySchema` in `src/types/lead.ts`) does not change. Every existing summary path keeps working byte-for-byte. The skeptical playbook is purely additive: a new section in the prompt, a new tool definition, a new `case` branch.

**This decision supersedes README.md "Open Question #3" ("Confirm the new `request_human_review` tool vs. extending `generate_summary` with an `escalate: true` field").** README.md will be updated by the README-owner agent to reflect this resolution; the implementing agent for P1.03 does NOT need to wait for that update — this spec is the source of truth.

## Problem

Sofia flagged one live conversation in the Apr 29 walkthrough where a prospect challenged the bot directly. The bot held up surprisingly well, but Sofia identified a structural gap. From `docs/sofia-feedback-priorities.md`, P1 row "Review skeptical/adversarial conversations":

> One live conversation showed a prospect asking direct questions and challenging the bot. → Define how the bot should answer detailed questions, when to keep qualifying, and when to escalate.

Today the prompt has no explicit playbook for this register. The closest behaviour lives in:

- `src/lib/prompts/sections/persona.ts` — `<example>I've been scammed before by online courses. Why should I trust you?</example>` (good vs. bad reply pattern, but only one example).
- `src/lib/prompts/sections/objections.ts` — `TRUST` handler (68 occurrences, 15% resolved — the lowest resolution rate of any objection family). One opener: `"Fair. What would make you feel more comfortable? I'm an open book."`
- `src/lib/prompts/sections/persona.ts` — Continuity rule: "Maintain the peer-mentor persona during ALL friction moments. Identity verification, objection handling, post-booking follow-up. Never drop into robotic or defensive tone."

There is **no rule for when to stop trying and route the conversation to a human**. Today, the only escalation paths are:

1. Off-topic inbound pitches → `HUMAN_REVIEW_NEEDED:` prefix in `key_notes` of `generate_summary` (`persona.ts` Off-Topic section).
2. Post-call price objections → handed off in-message but not routed (`decision-routing.ts` GATE 3, `objections.ts` PRICE handler).
3. Manual operator pause via `flow_runtime_controls.bot_paused` (commit `228b3f4`, `src/lib/services/flow-runtime.ts`).

The webhook (`src/app/api/webhooks/sendpulse/route.ts` lines 138-144) checks `getFlowRuntimeControl()` per-event and short-circuits if the flow is paused. There is **no per-conversation escalation pause** — only a per-flow global pause. Skeptical conversations need a finer-grained signal.

## Goal

The bot has an explicit playbook for skeptical/adversarial registers covering: (a) when to answer in depth, (b) when to keep qualifying, (c) when to escalate to a human. Escalation produces a structured signal the webhook can detect and act on by pausing replies for that specific conversation, not the whole flow.

The signal is a new tool call — `request_human_review` — distinct from `generate_summary`'s `HUMAN_REVIEW_NEEDED:` convention so it can be detected and acted on without parsing a free-text field. The webhook detects the tool call and stamps a per-conversation pause; future bot replies on that conversation are skipped until an operator clears the pause.

The dashboard exposes the per-conversation pause as a chip on the conversation detail view + a Slack-style "Needs human" filter on the inbox. Operators can clear the pause manually.

## Non-goals

- No deterministic adversarial-detection ML — Claude judges the register through prompt rules.
- No automated reassignment to specific human agents (Cody, Jeffrey). Just "paused for human review", with a freeform reason.
- No outbound notification (Slack/email) in v0 — escalations are visible on the dashboard only. Adding Slack DM notification is a tiny follow-up but out of charter here.
- No trust-score numerical metric per conversation. Sofia did not ask for one.
- No automatic resumption when the prospect goes quiet for N hours. Pauses stay until cleared.

## Functional requirements

1. New section in `src/lib/prompts/sections/objections.ts` (or a new dedicated `skeptical-playbook.ts`) titled "Skeptical / Adversarial Conversations" describing three sub-modes: **answer-in-depth**, **keep-qualifying**, **escalate**. Each sub-mode lists triggers, a tone guideline, and an exit condition.
2. New tool `request_human_review` registered in `src/lib/services/claude.ts`. Tool definition:
   - `name: 'request_human_review'`
   - `description`: "Use when the prospect's tone, pattern of questioning, or content escalates beyond what a peer-mentor reply can address. Triggers a human-only pause on this conversation."
   - `input_schema`: required `reason: string` (1–3 sentences from the bot's POV) + optional `severity: 'concern' | 'hostile' | 'compliance'`.
3. The prompt instructs the bot: when escalating, call `request_human_review` in the same response as a brief warm reply ("Let me get someone from the team to come back to you on this"). The bot does not stop replying mid-conversation; it sends one bridge message + the tool call.
4. `routeLeadEvents` in `src/lib/services/engine.ts` recognises `request_human_review` as a `KNOWN_TOOLS` member and executes a side effect:
   - Inserts a row into `conversation_human_review_pauses` (new table — see schema) with `conversation_id`, `reason`, `severity`, `requested_at`, `requested_by: 'bot'`.
   - Updates `conversations.status` to `flagged` (already a supported status — `chip` tone in `dashboard/page.tsx` maps `flagged` → danger).
5. The SendPulse webhook (`src/app/api/webhooks/sendpulse/route.ts`) checks for an active per-conversation pause **after** finding/creating the conversation in `processMessage`. If paused, the webhook short-circuits with `{ ok: true, skipped: 'human_review_paused' }`. The webhook still stores the inbound message so the human has full context, but skips Claude entirely.
6. New helper `getConversationHumanReviewPause(conversationId)` in `src/lib/services/conversation.ts` (or sibling) returns `{ paused: boolean, reason?: string, requestedAt?: string }`. Used by the webhook + dashboard.
7. Dashboard surfacing:
   - The conversation detail page (`src/app/dashboard/conversations/[id]/page.tsx`) shows a banner near the top: "Paused for human review · {reason}" with a "Resume bot" action that calls a new Server Action.
   - The inbox view (`/dashboard/conversations`) shows a `Needs human` chip on rows with an active pause and supports filtering to those rows.
8. Server Action `resumeConversation(conversationId)` clears the active pause (sets `cleared_at`) and resets the conversation status from `flagged` to `active` if no other flags remain.
9. The webhook's per-flow global pause (existing `flow_runtime_controls.bot_paused`) keeps wrapping per-conversation pauses — global pause overrides everything.

## Acceptance criteria

- [ ] **Tool name is exactly `request_human_review`** (snake_case, no variants). Verified by an explicit `expect(TOOLS.find(t => t.name === 'request_human_review')).toBeDefined()` assertion. The name is reserved because it does NOT collide with any existing tool in `src/lib/services/engine.ts` lines 255–260 (`KNOWN_TOOLS` set: `capture_email`, `generate_summary`, `qualify_lead`, `book_call`).
- [ ] **Engine handles `request_human_review` via the same fire-and-forget side-effect pattern as `setContactTags`.** The new `case 'request_human_review'` branch in `routeLeadEvents` performs its DB writes inside the per-tool `try/catch` block (matching the existing `case 'capture_email'` shape, `engine.ts:280-289`), and the orchestrator at `engine.ts:243-249` keeps wrapping the whole `routeLeadEvents` call in `.catch(() => {})`. A failed pause-write therefore never breaks the bot reply path.
- [ ] New prompt section "Skeptical / Adversarial Playbook" present in the assembled `setter-v2` prompt. Verified by `setter-v2.test.ts`.
- [ ] `request_human_review` tool registered in `TOOLS` array in `src/lib/services/claude.ts`. Verified by a test that asserts `TOOLS.find(t => t.name === 'request_human_review')` exists with the correct schema (required `reason: string`, optional `severity: 'concern' | 'hostile' | 'compliance'`).
- [ ] New migration `supabase/migrations/<ts>_conversation_human_review_pauses.sql` creates the `conversation_human_review_pauses` table with RLS enabled (service-role insert/select; no anon access).
- [ ] `routeLeadEvents` adds a `case 'request_human_review'` branch that inserts a row into `conversation_human_review_pauses` and updates `conversations.status = 'flagged'`. New unit test in `engine.test.ts`.
- [ ] `processMessage` (or the webhook) checks for an active pause **before** calling Claude; if active, returns `{ skipped: 'human_review_paused' }`. The inbound message is still stored to preserve context. New test in `engine.test.ts`.
- [ ] Webhook integration test asserts: (a) a Claude response containing `request_human_review` tool call results in a `conversation_human_review_pauses` row + a `conversations.status='flagged'` row; (b) a follow-up inbound on the same conversation is short-circuited with `skipped: 'human_review_paused'`.
- [ ] Conversation detail page shows the pause banner when a pause is active. Component test or e2e Playwright covers this.
- [ ] `Resume bot` button calls `resumeConversation(id)` and clears the pause; subsequent inbounds run Claude again. Server Action test covers this.
- [ ] Inbox view displays a `Needs human` chip and supports a filter that shows only paused conversations. Light test coverage (server-side query test).
- [ ] `scripts/test-prompt.ts` adds two new scenarios: `skeptical-answer-in-depth` (deep question, no escalation, bot answers + redirects to call) and `skeptical-escalate` (hostile pattern, bot calls `request_human_review`).
- [ ] All existing tests stay green, including `compile-block.contract.test.ts`. The new section adds bytes; the contract baseline is regenerated and reviewed.

## Affected files

**New files:**

- `src/lib/prompts/sections/skeptical-playbook.ts` — new section.
- `src/lib/prompts/__tests__/skeptical-playbook.test.ts` — covers section structure.
- `src/lib/services/conversation-pauses.ts` — `getConversationHumanReviewPause`, `pauseConversationForHumanReview`, `resumeConversationFromHumanReview`.
- `src/lib/services/__tests__/conversation-pauses.test.ts`
- `src/app/dashboard/conversations/[id]/actions.ts` — Server Action `resumeConversationAction(conversationId)`. (Or extend an existing actions file if one exists in this directory; check before creating.)
- `src/app/dashboard/conversations/[id]/__tests__/actions.test.ts`
- `supabase/migrations/<ts>_conversation_human_review_pauses.sql`

**Modify:**

- `src/lib/prompts/setter-v2.ts` — assemble the new section after `buildObjectionHandling` and before `buildEmailCapture`. Update sections array (lines 43-53).
- `src/lib/prompts/sections/persona.ts` — small cross-reference: under "Continuity" or a new "Adversarial register" sub-bullet, point to the new playbook. Keep it short.
- `src/lib/services/claude.ts` — register `request_human_review` in `TOOLS`. Update `KNOWN_TOOLS` set in `engine.ts`.
- `src/lib/services/engine.ts`:
  - Add `case 'request_human_review'` to `routeLeadEvents` switch (around line 275).
  - Pre-call pause check in `processMessage` after `findOrCreateActiveConversation` (after line 76).
- `src/app/api/webhooks/sendpulse/route.ts` — no changes needed if the pause check lives in `processMessage`. If it lives in the webhook, add the check between lines 39 and 47.
- `src/app/dashboard/conversations/[id]/page.tsx` — banner + Resume button.
- `src/app/dashboard/conversations/page.tsx` (the inbox) — surface `Needs human` chip, add filter. The inbox is `<PageRuns>` from `src/app/dashboard/flows/[flowId]/related-pages/page-runs.tsx`. Inspect that file before deciding where the chip lives.
- `src/lib/services/conversation-viewer.ts` — extend list/detail to include pause info via a join.
- `src/lib/prompts/__tests__/setter-v2.test.ts` — add assertions.
- `src/lib/services/__tests__/engine.test.ts` — extend.
- `src/app/api/webhooks/sendpulse/__tests__/route.test.ts` — extend.
- `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — regenerate baseline.
- `scripts/test-prompt.ts` — add scenarios.

**Tests to add / update:** see above.

## Schema / migration changes

```sql
-- supabase/migrations/<TS>_conversation_human_review_pauses.sql
create table public.conversation_human_review_pauses (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text not null,
  severity text not null default 'concern' check (severity in ('concern', 'hostile', 'compliance')),
  requested_by text not null default 'bot' check (requested_by in ('bot', 'operator')),
  requested_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by text -- email or operator id; null while active
);

create index idx_human_review_pauses_active
  on public.conversation_human_review_pauses (conversation_id)
  where cleared_at is null;

alter table public.conversation_human_review_pauses enable row level security;

-- service-role only; no anon access.
create policy "service_role manages human review pauses"
  on public.conversation_human_review_pauses
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

After applying, regenerate types:

```bash
supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts
```

## API / contract changes

```typescript
// src/lib/services/claude.ts — TOOLS array additions
{
  name: 'request_human_review',
  description:
    "Use when the prospect's tone, pattern of questioning, or content escalates beyond what a peer-mentor reply can address. Pauses bot replies on this conversation until a human clears it.",
  input_schema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description:
          'One to three sentences explaining why this needs a human, in your own words. The operator will read this verbatim.',
      },
      severity: {
        type: 'string',
        enum: ['concern', 'hostile', 'compliance'],
        description:
          "concern: prospect is skeptical and has asked a hard question. hostile: tone has turned aggressive. compliance: prospect raised legal, fraud, or regulatory issues that need human handling.",
      },
    },
    required: ['reason'],
  },
}
```

```typescript
// src/lib/services/conversation-pauses.ts (NEW)
import 'server-only'

export interface ConversationHumanReviewPause {
  conversationId: string
  reason: string
  severity: 'concern' | 'hostile' | 'compliance'
  requestedAt: string
  requestedBy: 'bot' | 'operator'
}

export async function getActiveConversationPause(
  conversationId: string
): Promise<ConversationHumanReviewPause | null>

export async function pauseConversationForHumanReview(input: {
  conversationId: string
  reason: string
  severity: 'concern' | 'hostile' | 'compliance'
  requestedBy: 'bot' | 'operator'
}): Promise<{ success: boolean; error?: string }>

export async function resumeConversationFromHumanReview(input: {
  conversationId: string
  clearedBy: string
}): Promise<{ success: boolean; error?: string }>
```

```typescript
// src/app/dashboard/conversations/[id]/actions.ts (NEW)
'use server'

export async function resumeConversationAction(
  conversationId: string,
  formData?: FormData
): Promise<{ success: boolean; error?: string }>
```

The new prompt section structure (rough shape — implementing agent should refine wording):

```
## Skeptical / Adversarial Playbook

Some prospects open in a skeptical or adversarial register. They ask
direct, sometimes pointed questions ("how is this not a scam?",
"prove you actually run a vending business"). The default failure mode
is to either bail or to over-explain. Neither works.

### Three modes

**Answer in depth** when:
- The prospect has asked a substantive, fact-shaped question.
- They are still treating you as a possibly-credible source.
- One concrete sentence + one redirect to the call usually closes it.

**Keep qualifying** when:
- The skepticism is generic ("I've been burned before") rather than
  pointed at you specifically.
- They have not yet shared location or motivation.
- Acknowledge the skepticism, ask one rapport question, return to
  qualification.

**Escalate** when:
- The prospect is hostile, threatening, or accusing in a way no peer
  reply can defuse.
- Compliance / legal concerns are raised (fraud allegation, refund
  demand, threat of regulatory complaint).
- They explicitly ask to talk to a human / manager / owner and won't
  accept the call as the human channel.

### When you escalate, call `request_human_review` in the same response.
- One short, warm reply: "Let me get someone from the team to come
  back to you on this directly. We'll be in touch."
- Then call the tool with a clear `reason` and chosen `severity`.
- Do NOT keep replying after the tool call — the human takes over from
  here. The system pauses the bot for this conversation automatically.
```

## Third-party prerequisites

None directly. The Anthropic API already supports custom tools via the existing `Tool[]` schema.

If the implementing agent wants to add a Slack notification on escalate, that's a follow-up — it would need a Slack webhook URL env var and the integration-boundary rule from `conventions.md` applies. **Do not block this task on Slack wiring.**

## Implementation plan (TDD)

1. **RED — pause services test.** Write `conversation-pauses.test.ts` covering: pause insert + active lookup + clear → no-active. Run; fail because services don't exist.
2. **GREEN — migration + services.** Write the migration. Apply locally with `supabase db reset`. Regenerate types. Implement `conversation-pauses.ts`. Tests green.
3. **RED — claude.ts test.** Add a test (or extend existing) that asserts `TOOLS` contains `request_human_review` with correct schema. Run; fail.
4. **GREEN — claude.ts.** Add the tool definition. Tests green.
5. **RED — engine routing test.** Extend `engine.test.ts` to assert `routeLeadEvents` handles `request_human_review`. Run; fail.
6. **GREEN — engine.** Add the `case 'request_human_review'` branch. Insert pause + update conversation status. Tests green.
7. **RED — pre-call pause test.** Add a test asserting `processMessage` short-circuits when an active pause exists, while still storing the inbound message. Run; fail.
8. **GREEN — pre-call check.** Insert the pause check after `findOrCreateActiveConversation`. Use the new helper.
9. **RED — prompt section test.** Write `skeptical-playbook.test.ts` and extend `setter-v2.test.ts`. Assert section is present, the three modes are described, and `request_human_review` is referenced.
10. **GREEN — prompt section.** Author `skeptical-playbook.ts`. Plug into `buildSystemPrompt`'s sections array.
11. **REGENERATE — contract test.** Run `compile-block.contract.test.ts`. Inspect snapshot diff. Confirm only the new section was added.
12. **WIRE — dashboard banner.** Add the banner + Resume button to the conversation detail page. Component test.
13. **WIRE — inbox chip + filter.** Extend `conversation-viewer.ts` join + the inbox component. Light tests.
14. **LIVE VERIFICATION.** Two new scenarios in `scripts/test-prompt.ts`. Run against live Sonnet 4.6.
15. **DOCS.** Add a one-liner under the P1 row in `docs/sofia-feedback-priorities.md` at PR-merge time.

## Test plan

- **Unit (Vitest):**
  - `conversation-pauses.test.ts` — pause/lookup/clear.
  - `claude.test.ts` (or inline in `engine.test.ts`) — tool registration.
  - `skeptical-playbook.test.ts` — section structure.
  - `setter-v2.test.ts` — section presence in assembled prompt.
- **Integration (Vitest + Supabase):**
  - `engine.test.ts` — `routeLeadEvents` writes pause; `processMessage` short-circuits on active pause.
  - `route.test.ts` — webhook end-to-end smoke for the `request_human_review` path and the pause-blocks-next-inbound path.
- **E2E (Playwright):** optional. If covered: navigate to a conversation with an active pause, see the banner, click Resume, send a new inbound (mocked), assert bot replies again.
- **Live verification:**
  ```bash
  npx tsx scripts/test-prompt.ts --scenario skeptical-answer-in-depth
  npx tsx scripts/test-prompt.ts --scenario skeptical-escalate
  ```
  Confirm: in `answer-in-depth`, bot answers + redirects without calling the tool. In `escalate`, bot replies once warmly and calls `request_human_review`.

## Rollout

- **Feature flag:** `LIVE_HUMAN_REVIEW_TOOL_ENABLED` env var, default `true`. When `false`, the tool is omitted from the `TOOLS` array (the engine still handles the case gracefully if Claude tries to call something not in the tools list — but with the flag off Claude won't see the tool definition).
- **Migration order:** schema first (Supabase migration), then app code in a single PR. The schema is purely additive; no risk to existing routes.
- **Production safety:**
  - Pause-on-tool-call is a one-way action: a paused conversation skips Claude entirely. If the bot mis-fires, the human resume button is one click. No data loss — inbound messages are still stored.
  - The new prompt section adds rules; it does not remove any. Worst-case prompt regression is the bot getting more willing to defer to humans. The kill switch flips the flag off, removing the tool definition.
  - In-flight conversations are not migrated — pre-existing conversations have no pause row, so they continue normally.
- **Rollback:**
  - Tool flip-off: `vercel env rm LIVE_HUMAN_REVIEW_TOOL_ENABLED && vercel env add LIVE_HUMAN_REVIEW_TOOL_ENABLED false production && vercel redeploy`.
  - Schema rollback: `supabase migration repair` to undo the migration if absolutely necessary; in practice the table is harmless and can stay even if the feature is off.

## Dependencies

- None upstream. Existing `flow_runtime_controls` (commit `228b3f4`) provides the global kill switch this feature complements but does not depend on.
- Downstream: P3 Close handoff will want to know whether a conversation was escalated (it should treat `flagged` differently). P5 attribution will want escalation rate as a metric. Neither blocks this task.

## Risks + mitigations

- **Risk: Bot escalates too eagerly.** Triggers human-review on prospects who could have been recovered. **Mitigation:** prompt rules emphasise that "answer in depth" and "keep qualifying" are the defaults; escalation has explicit triggers. Live-verify with a deliberately-spicy-but-recoverable scenario (`skeptical-answer-in-depth`) and confirm the bot does NOT escalate.
- **Risk: Bot under-escalates.** Mitigation: the prompt explicitly lists hostile and compliance triggers. Operators can also pause manually from the dashboard. Add a Server Action `pauseConversationAction` that lets operators escalate ahead of the bot. (Out of scope for v0 unless a 1-line addition.)
- **Risk: Schema migration breaks prod writes.** **Mitigation:** additive only, RLS service-role-only. Test migration with `supabase db reset` locally before push.
- **Risk: A paused conversation receives a message that the operator never sees.** **Mitigation:** the inbound is still stored in `messages` and surfaced in the conversation detail. Pause skips Claude only. Add a clear visual cue: a banner saying "New message arrived while paused" if `last_message_at > pause.requested_at`.
- **Risk: Pause check adds latency to the webhook.** **Mitigation:** the lookup is a single SELECT on an indexed column. Negligible. Same DB roundtrip cost as the existing per-flow pause check.
- **Risk: Tool name collision.** **Mitigation:** `request_human_review` is the only `request_*` tool. Add to `KNOWN_TOOLS` set.

## Out of scope / explicit deferrals

- Slack / email notification on escalate — follow-up.
- Per-operator assignment ("send to Cody specifically") — follow-up.
- Numerical trust score — not asked for.
- Auto-resume after silence — explicitly out: pauses are operator-clear-only.
- Reflection on past conversations to retrofit escalation tags — out of charter.

## PR strategy

Stack of two PRs is acceptable:

1. `feat/p1-03a-human-review-schema-tool` — migration + tool registration + engine handling. No UI.
2. `feat/p1-03b-human-review-ui` — banner + inbox chip + Server Action.

Or single PR `feat/p1-03-skeptical-playbook` if review burden is manageable. Default = single PR; split only if review scope explodes.

## Observability

- **Logs:** structured field `escalation.requested` on every `request_human_review` call: `{ conversation_id, severity, reason_length, contact_id }`. Don't log the reason verbatim (could include PII).
- **Sentry breadcrumbs:** add a breadcrumb in `routeLeadEvents` `case 'request_human_review'` — useful for tracing if the pause write fails.
- **Metrics:** count of active pauses surfaced on the dashboard (a chip on the home page metrics row, e.g. "3 paused for human review"). This is a small extension; do it in this PR.
- **Operator-visible status:**
  - Inbox chip "Needs human" + filter.
  - Conversation detail banner with reason + severity.
  - Dashboard home metric.

## Notes for the implementing agent

- The existing `Off-Topic` handler in `persona.ts` (lines 88-101) uses `HUMAN_REVIEW_NEEDED:` prefix in `key_notes`. **Do not remove or merge that** — they're orthogonal: off-topic is a one-shot summary marker; the new tool is an active per-conversation pause. Keep both. The skeptical playbook prompt should explicitly say: "Do not use the off-topic handler for skeptical-but-on-topic prospects. Only use `request_human_review`."
- The webhook is **the right place for the global flow pause check** (currently lines 138-144 in `route.ts`). Per-conversation pause sits later — after we know which conversation we're in. Implement the pause check inside `processMessage` (right after `findOrCreateActiveConversation`) so the inbound gets stored even when paused. The webhook itself stays simple.
- Match the existing `routeLeadEvents` pattern for `case 'capture_email'` etc. — it's idempotent via insert + retries are safe (use `upsert` if you need to dedupe by `conversation_id` for the active pause).
- The `severity` enum lets us colour the dashboard chip later (concern → warn, hostile → danger, compliance → danger). Keep the column flexible by storing the raw string + checking with a CHECK constraint.
- `request_human_review` is not the same as Anthropic's "human in the loop" pattern; it is a tool the bot calls when it judges the conversation needs human handling. Don't confuse with API-level human-in-the-loop.
- For live verification, design `skeptical-escalate` so it's clearly an escalation (e.g. "you scammed my brother last year, refund him now"). Sonnet 4.6 should call the tool. If it doesn't, tighten the prompt; don't pad escalation triggers with edge-case heuristics.
- Reference commits: `228b3f4` (flow_runtime_controls — same idea at flow scope, copy the patterns), `4dc60fc` (BOT_ENABLED kill switch — same env-flag pattern), `7af70f9` (`integration_events` table — pattern for logging tool-call side effects).
- Do not ship without the contract-test snapshot regen. The skeptical playbook is a sizable section; reviewers must see the diff.
- Keep all UI in the light theme. The pause banner should feel calm, not alarmist — Linear / Stripe aesthetic. Use the `warn` Chip tone for "concern" severity, `danger` for "hostile" / "compliance".
- A11y: the Resume button is a Server Action submit button. Make sure it's keyboard-accessible and the banner has `role="status"` with `aria-live="polite"`.
- If `src/app/dashboard/conversations/[id]` doesn't yet have an `actions.ts`, create it. Match the structure used in `src/app/dashboard/marketing-sources/actions.ts`.
- The `flagged` status is already used by the dashboard home (`page.tsx` line 154) and inbox. Verify both surfaces correctly render `flagged` once the new code path writes it. No extra work likely needed, but check.
