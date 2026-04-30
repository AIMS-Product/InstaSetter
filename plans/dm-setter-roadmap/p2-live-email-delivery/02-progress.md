# P2.02 — Published Flow snapshot — progress

Spec: `plans/dm-setter-roadmap/p2-live-email-delivery/02-published-snapshot.md`
Branch: `feat/p2-02-published-snapshot`
Asana: https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385025002907

## Landed in this branch

### Schema

- New migration `supabase/migrations/20260502000000_ins_flow_versions.sql` adds five tables, all created with `if not exists` so the parallel P3.01 migration cannot fight this one:
  - `ins_flow_versions` — append-only snapshots (brand/flow/version_number unique, source enum + jsonb shape constraints)
  - `ins_flow_channels` — active version pointer per `(brand, flow_id, channel)`
  - `ins_flow_publish_log` — append-only publish/rollback audit
  - `ins_feature_flags` — per-key/scope/scope_id flag rows
  - `ins_feature_flags_audit` — append-only audit for every flip (P2.05's auto-pause path lands against this)
- `ins_publish_flow(...)` `security definer` function consolidates the multi-step write into a single transaction; granted to `service_role` only.
- `conversations.flow_version_id uuid` (nullable) added with index. Pre-cutover rows stay NULL — engine carve-out preserves byte-identical behaviour for in-flight conversations (ROLLOUT.md safety invariant #7).

### Services

- `src/lib/services/flags.ts` — `flagOn` (60s in-process cache, brand → global → false resolution) and `setFlag` (audit-trail upsert with derived action enum, cache invalidation).
- `src/lib/services/published-flows.ts` — `publishFlow`, `rollbackPublishedFlow`, `getActiveFlowVersion` (cached), `listFlowVersions`. Both publish and rollback go through the Postgres RPC so concurrency is enforced at the DB level.
- `findOrCreateActiveConversation` in `src/lib/services/conversation.ts` accepts `flowVersionId` via the new options object signature; legacy positional signature still works.

### Engine integration

- `processMessage()` in `src/lib/services/engine.ts` resolves the per-brand cutover flag BEFORE creating the conversation row. Fresh rows created during a cutover are stamped with the active version's id. The system-prompt branch only injects the snapshot's `postEmailBehavior` when BOTH the flag is on AND the conversation row carries a non-null `flow_version_id`. Pre-cutover rows fall through to `buildSystemPrompt()` byte-for-byte.
- `BuildSystemPromptOptions.postEmailBehavior` is the single new field on `setter-v2.ts`. When omitted, `buildEmailCapture()` is called with no second arg, preserving the contract test invariant.

### UI

- `src/app/dashboard/flows/[flowId]/publish-controls.tsx` — Publish + History buttons in the b-stage header, confirm dialog with note field, version list dialog with active chip and per-row Rollback button.
- `src/app/dashboard/flows/[flowId]/actions.ts` extends with `publishFlowAction`, `rollbackFlowAction`, `listFlowVersionsAction` (Zod-validated, `{ success, data?, error? }` envelopes).
- Embedded in `directions/b-stage/header.tsx` next to the existing `HeaderHelpMenu`.

### Tests

- `src/lib/services/__tests__/flags.test.ts` — 12 tests covering scoping, caching, audit derivation, scope-id validation.
- `src/lib/services/__tests__/published-flows.test.ts` — 12 tests covering monotonic version_number, channel pointer atomicity, rollback creating a new immutable row, validation rejection (immediate-send copy with `none` mode).
- `src/lib/services/__tests__/engine.test.ts` extended with 4 tests covering: flag-OFF default, flag-ON with `flow_version_id IS NULL` carve-out (the in-flight protection), flag-ON with stamped row, and conversation creation passing `flowVersionId`.
- `src/app/dashboard/flows/[flowId]/__tests__/publish-controls.test.tsx` — 6 RTL tests covering button render, dialog flows, error surfaces, history ordering, rollback wiring.
- `src/app/dashboard/flows/[flowId]/__tests__/publish-flow.integration.test.ts` — 3 tests walking the publish → cutover → fresh-conversation → rollback loop end-to-end.

### Test status

- 440 / 440 vitest specs pass.
- `compile-block.contract.test.ts` stays green (33 / 33).
- `npm run lint` clean (pre-existing warnings only).
- `npx tsc --noEmit` clean.

### Tooling fix

- Added a vitest alias for `server-only` → `src/test/server-only-stub.ts`. Without it, importing any service module that uses `import 'server-only'` (flags / flow-drafts / conversation-viewer / etc.) blew up the test runner; the stub is a no-op so the tests can exercise the real service.

## Decisions worth flagging

- **`note` UI override is local React state, not a ref**. Lint rule `react-hooks/refs` flagged the original ref-based design; switching to `useState` keeps the textarea controlled and avoids the rule violation.
- **Operator email** is not yet wired through the dashboard (no Supabase Auth on `/dashboard/*`). Server Actions accept an explicit `actor` override and fall back to `system:dashboard` so the audit log is never empty. Replace with `supabase.auth.getUser()` once that wiring lands.

## Open follow-ups

- Seed v1 with the code-owned defaults: spec calls for a one-shot insert when this lands. Deferred — the version list shows "No published versions yet" until the first operator clicks Publish, which is acceptable for the initial UX. Worth a follow-up commit if Sofia surfaces empty-state confusion.
- Live-traffic verification with a real Supabase row + the `email_delivery.use_published_snapshot` flag flipped to `true` for VendingPreneurs. Requires manual smoke; not in this PR.
