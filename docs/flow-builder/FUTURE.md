# Flow Builder — Future Features (Post-v1)

Explicitly scoped out of v1. Ordered roughly by expected value.

## 1. Scenarios & contract validation (strong v2 candidate)

**Why it matters**: without regression tests, marketers won't confidently publish. This is what stops the "I tweaked the objection handler and broke qualification" failure class.

- Recorded test conversations per flow. UI: one-click "record scenario from current simulator session".
- Every scenario has assertions: ends at Block X, fires tool Y, captures variable Z, text matches regex/semantic match.
- Scenarios run in Cached mode on every save (fast, free). Failing scenario blocks publish.
- Typed entry/exit contracts per Block (`requires: ['contact.location']`, `provides: ['contact.email']`). Compiler verifies every path into a Block satisfies its requires.
- Import seed scenarios from the 3,619 classified conversations.

Effort: ~7-10 days.

## 2. A/B testing

- `ins_flow_ab_tests` table holds a set of buckets: `[{version_id, weight, label}]`.
- Traffic slider on the Publish page: 50/50 between A (current Published) and B (candidate). Default 50/50 once enabled.
- Per-version metrics visible in the dashboard: booking rate, email capture rate, silence rate. CIs shown once sample size is meaningful.
- "Declare winner" button promotes B to sole Published.
- Scoped to new conversations only. In-flight conversations finish on their pinned version (same as regular publishing).

Effort: ~5 days.

## 3. Observability — deep

v1 ships conversation replay. Post-v1 adds:

- **Per-block conversion funnel**: aggregated dashboard "of 500 who entered Qualifier, 340 reached Booking Handoff". Drill-down by time range, channel, A/B version.
- **Per-block token/cost/latency**: engineering dashboard. Find the slow or expensive Blocks.
- **Anomaly alerts**: after 30 days of baseline, alert when a Block starts failing (drop in exit rate, spike in silence). Slack integration.
- **Live-traffic heatmap**: real-time node-level pulse on the canvas showing which Blocks are hot right now.

Effort: ~10-15 days all-in.

## 4. AI-assisted authoring

ManyChat-style "Flow Builder Assistant". Scope when schema has stabilized (2-3 months post-v1 minimum).

- **Draft a Block from plain English**: "write an Objection Handler for people who say they need spouse approval" → AI generates the Block with goal, tone, examples. Marketer reviews + edits.
- **Suggest better copy**: inline next to any message guidance. AI proposes 3 alternatives grounded in the 3,619-conversation training data.
- **Flow linter**: AI reviews a draft flow and flags soft issues (tone mismatch, missing an affirmation, overlong message guidance).
- **"Extract this into a module"**: AI suggests when a Block has grown too specific and should become its own reusable Block.

Effort: ~15-20 days.

## 5. Roles & approvals

- Supabase-backed role system: `editor`, `approver`, `viewer` per brand.
- "Requires approval to publish" toggle per Bot. When on, publish creates a pending-approval state. Approver sees the block-level text diff + scenario results + changelog. One-click approve/reject with comments.
- Audit log of who-published-what per version.

Effort: ~5-7 days.

## 6. Per-channel variants

Same flow, different surfaces. Story reply vs. IG DM vs. IG comment reply have different expected tones and message-length norms.

- Bot can have multiple `ins_flow_channels` rows (one per surface).
- Each channel points to a potentially-different `active_version_id`.
- Shared Blocks + channel-specific overrides (override tone, override max message length, override examples).

Effort: ~5-7 days.

## 7. Marketer-defined variables

v1 has a fixed schema. Post-v1:

- Marketers can define new variables with a type picker (string, number, boolean, enum, date).
- Enforced naming (snake_case, no collision with reserved names).
- Readable in conditions and message content immediately.
- Writable via a capture rule the marketer defines (LLM tool call generated under the hood).
- New variables live in `contact_variables` jsonb (no DB column). Promotable to a typed column via engineering migration later.

Effort: ~5-7 days.

## 8. Module pinning / forking (reusable Blocks as first-class)

v1 Blocks are authored per-flow. v2:

- Blocks marked `scope = 'module'` live in a shared library per brand.
- A Flow references a Module. Updates to the Module propagate to all referencing Flows on next publish.
- "Pin to version" locks a reference (future Module edits don't propagate).
- "Fork and detach" converts a reference into a local copy.
- Prevents the "edit the email capture in one flow and forget to do it in the other three" drift.

Effort: ~5-7 days (mostly UI + reference resolution in the compiler).

## 9. Editor collaboration

v1 is last-write-wins with a "someone else is editing" banner.

- Post-v1: CRDT or operational transform for simultaneous editing.
- Presence cursors on the canvas.
- Per-Block locks as a cheaper interim option.

Effort: ~10-15 days (CRDT) or ~3-5 days (per-Block locks).

## 10. Import / export

- Export a Flow as a JSON bundle. Include Block definitions, variable registry, scenarios.
- Import into another brand or account.
- Template marketplace — ship 5-10 battle-tested flows ("Cold DM → Book Call", "Lead Magnet → Nurture", "Abandoned Checkout Recovery").

Effort: ~5 days.

## 11. Anonymized conversation-based seeding

After a Block has run for enough conversations:

- "See real examples that hit this Block" — pull live conversation snippets anonymized.
- "Suggest new exit branches from real behavior" — AI-detects common patterns the flow doesn't handle and proposes new branches.

Effort: ~10 days (depends on observability foundation).

## 12. Dashboard internals

- **Flow diff between versions**: block-level text diff (v1 will have the publish log but not a visual diff).
- **Version labels + notes**: "v13 - tested new objection copy, +3% booking rate".
- **Time-travel**: view the canvas as it was at any prior version. Useful for the "what broke?" question.
- **Starred versions**: pin good versions for easy rollback targets.

Effort: ~3-5 days.

---

## How this doc is maintained

- Each item should either graduate to a planning doc (`docs/flow-builder/PLAN-<feature>.md`) when scoped, or be moved to "Shipped" with a link to the migration/PR.
- Re-prioritize every quarter based on real marketer feedback.
- Items consistently at the bottom of the list for 6 months get archived.
