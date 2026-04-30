# [P4.04] Warnings + version history with rollback for high-impact rule edits

**Status:** open
**Phase:** 4 — Flow Builder operator UX
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385390017489
**Owner:** unassigned
**Depends on:** P4.03 (lock catalog tells us which fields are "high-impact" for warnings)
**Blocks:** none — but every later draft persistence feature should respect the audit trail this introduces
**Risk:** medium-to-high (introduces new persistence + UI flows that touch publish/rollback semantics)
**Rough size:** L (3+ days)

## Problem

From `docs/sofia-feedback-priorities.md`, Priority 3, fourth row:

> **Add warnings and rollback/version history for rule edits** — "Sofia agreed a warning would help before changing high-impact rules." → "Important rule edits show a warning and can be restored to a previous version."

And from Sofia's feedback prompts:

> - Did anything feel risky to edit?

Today the Flow Builder has draft autosave (`flow-draft-sync.tsx`, `actions.ts` `saveFlowDraftAction`), but:

1. There is **no warning** before a high-impact edit. A marketer can edit the booking-link copy, the persona, the qualifier order, or the post-email confirmation without any "are you sure" or "this changes how the bot replies" affordance.
2. Versions exist client-side only. `store.tsx` lines 247-310, 607-674 model `VersionEntry[]` with `status: 'draft' | 'live' | 'archived'`, but they're held in `FlowState.versions` and never persisted. A page reload loses everything except the latest draft snapshot.
3. The `rollback` reducer (`store.tsx` line 636-674) restores a version locally, but its event is not audit-logged, has no actor or reason, and doesn't touch the database.
4. The Versions tab (`related-pages/page-versions.tsx`) exists but renders status cards — not a true version history. There is no per-row "Restore" action.
5. The recent commit `80d5d98 feat(flow-builder): configure post-email delivery` extended `draft-persistence.ts` with normalization for the new `postEmailBehavior` field; it's the most recent example of how "operator-edited copy that affects bot behaviour" lands in the draft. That edit happens _silently_ — no warning, no version snapshot.

The risk Sofia named is real. Quote from `docs/sofia-feedback-priorities.md` Priority 1:

> Finalize post-email behavior — The bot currently asks for email and implies something may be sent, but the asset may not exist yet.

If Sofia edits the post-email confirmation message to over-promise delivery, today there is **no warning** and **no easy undo**. We need:

- A warning before the edit lands (configurable per-field, driven by the lock-catalog metadata + a new "high-impact" flag).
- A persistent version history with explicit `Restore` buttons.
- An audit trail with actor, timestamp, and (optional) reason for every save and restore.

## Goal

A non-technical marketer who tries to change a high-impact rule (post-email confirmation, persona override on a block, booking link script, qualifier order — only via the lock-promotion flow if landed) sees, in this order:

1. **Inline warning chip** that appears as soon as the field becomes dirty: `"This change affects what prospects see."` with a link to the field's relevance.
2. **Save-confirmation modal** the first time a high-impact field changes since the last published version, asking the operator to add a one-line reason ("Why did you change this?"). Confirms that the change goes into the draft (not live IG DMs).
3. **Version-history panel** (rebuilt `page-versions.tsx`) listing every persisted version with timestamp, actor email, optional reason, and a `Restore` button per row. Clicking restore opens a confirmation modal that explains "This will replace the current draft with the contents of vN. The current draft will become a separate version automatically. No live IG DMs change yet."
4. **Restore action** is a Server Action that:
   - Snapshots the current draft as a new version row before overwriting state with the target version's snapshot.
   - Writes a row to a new `ins_flow_draft_versions` table with actor, target_version, action='restore', reason.
   - Refreshes the local store via the existing hydrate path.

## Non-goals

- **Live publish path is NOT in scope.** The current build does not push drafts to live IG DMs (`docs/sofia-feedback-priorities.md` Priority 1, "Live Publish Follow-Up" notes; `plans/post-email-behavior-config-tdd/plan.md` lines 458-471). This task adds version history + rollback for **drafts**, not for the live engine.
- No "production rollback" affordance. When publish lands later, that flow gets its own warning UX in a follow-up task.
- No diff-view between versions beyond "summary of changed fields" (a simple bulleted list). Full prose diff is a v2.
- No multi-user collaboration / lock-the-draft behaviour. Last-write-wins still holds.
- No automatic recovery from data corruption — we don't validate the historical snapshots beyond Zod parsing.
- No email-notification pipeline on restores. Audit row is enough for v0.

## Functional requirements

### Warnings

1. The lock-catalog from P4.03 is extended with a `highImpact: boolean` flag per entry. Editable fields whose `id` matches a high-impact catalog entry trigger the warning chip.
2. The warning chip appears within 100ms of the field becoming dirty (compared against the last-saved snapshot in `flow-draft-sync.tsx`).
3. **The Flow Builder workspace has no explicit save button — autosave is the only path drafts persist.** When a high-impact field is dirty, the autosave timer (currently 400ms in `flow-draft-sync.tsx:184`) is held: on the next autosave tick the workspace shows the warning modal **instead of** dispatching `saveFlowDraftAction`. The operator must Confirm to release the save, or Discard to revert. Leave-page intent (route change, tab close, browser refresh) triggers the same modal if any high-impact field is dirty.
4. The modal collects a free-text `reason` (max 240 chars). Confirming the modal:
   - Triggers `saveFlowDraftAction` with the reason attached.
   - Creates a new version row in `ins_flow_draft_versions` with the prior snapshot, actor email, and reason.
5. Discarding the modal restores the last-saved field values for the held high-impact fields only — other in-flight low-impact edits remain.

### Partial-save state when both low-impact and high-impact fields are dirty simultaneously

This is the realistic case: an operator edits a low-impact label and a high-impact post-email confirmation in the same session.

- **Low-impact fields continue to autosave on the 400ms tick** (existing behavior). They are not held by the modal.
- **The held high-impact field has its own pending-save state**, separate from the generic dirty flag. `flow-draft-sync.tsx` tracks it as `pendingHighImpactDirtyFieldIds: string[]` so the autosave loop can split the snapshot into "save now" vs "hold pending modal".
- **On Confirm:** the held field is included in the next autosave; the version row captures the full snapshot at that point.
- **On Discard:** the held field reverts to last-saved values; other low-impact saves that already ran remain. No version row is written.
- **Tab-close during this asymmetric state** triggers the modal via `beforeunload`. If the operator closes the tab anyway, that is treated the same as Discard: the held high-impact field reverts on next session load (the last persisted snapshot does not include the unconfirmed change), low-impact saves are already persisted.

This split keeps the user productive on routine copy edits while still gating the high-stakes ones.

### Version history

6. Versions are persisted in a new table `ins_flow_draft_versions` (additive migration). Schema in "Schema / migration changes" below.
7. The Versions page (`related-pages/page-versions.tsx`) is rebuilt to list every persisted version row (latest first), with: version number, timestamp, actor email, optional reason, summary line ("3 fields changed"), and a `Restore` button.
8. Restore opens a confirmation modal with the same warning copy as the save modal: "This will overwrite the current draft. No live IG DMs change. Continue?". Confirming triggers `restoreFlowDraftVersionAction`.
9. The hydration sequence post-restore preserves draft-sync invariants: `lastSavedJsonRef` (`flow-draft-sync.tsx`) is updated to the restored snapshot so the next autosave comparison is correct.

### Audit trail

10. Every save (autosave, manual save, restore) writes an `audit_event` row with: id, brand, flow_id, version_number, actor_email, action ('autosave' | 'manual_save' | 'restore' | 'discard_modal'), reason (nullable), changed_field_ids (string[]), created_at.
11. The audit trail is read-only via the dashboard's Versions page; an admin SQL endpoint is fine for deep dives.
12. Audit rows are append-only (no UPDATE policy, only INSERT + SELECT).

## Acceptance criteria

- [ ] Migration `supabase/migrations/YYYYMMDDHHMMSS_flow_draft_versions.sql` creates `ins_flow_draft_versions` and `ins_flow_draft_audit` tables (schemas below). Additive only.
- [ ] `src/types/database.ts` regenerated; new tables typed.
- [ ] `src/lib/services/flow-draft-versions.ts` exports `listVersions`, `createVersion`, `restoreVersion` services with Zod-validated args.
- [ ] `src/app/dashboard/flows/[flowId]/actions.ts` exports `listFlowDraftVersionsAction`, `createFlowDraftVersionAction`, `restoreFlowDraftVersionAction`. Each returns `{ success, data?, error? }`.
- [ ] `src/app/dashboard/flows/[flowId]/related-pages/page-versions.tsx` is rebuilt to render the persisted history with per-row `Restore` buttons. The four existing status cards become a small header strip; the body becomes the table.
- [ ] `src/lib/dashboard/flow-builder-locks.ts` (from P4.03) adds `highImpact: boolean` per entry. The catalog test asserts every `highImpact: true` entry has a `kind` of `admin` OR is on the explicit "operator-tunable but high-stakes" allowlist (post-email confirmation, persona override-per-block, booking-link copy, qualifier order if it ever becomes editable).
- [ ] A new `WarningChip` component (`src/components/ui/warning-chip.tsx`) renders inline next to a high-impact field while it's dirty. Light theme amber styling, ARIA `role="status"`.
- [ ] A new `ConfirmHighImpactModal` component prompts for a reason on save. The reason is required if at least one high-impact field changed; optional otherwise (modal skipped).
- [ ] `flow-draft-sync.tsx` is updated to:
  - Detect any dirty field whose `id` is a high-impact catalog entry.
  - Hold autosave for those fields and surface the modal on the next autosave tick (every other tick still proceeds for low-impact fields).
  - Track `pendingHighImpactDirtyFieldIds` separately so split-state save behavior is testable.
  - Bind a `beforeunload` listener so leave-page intent triggers the same modal.
- [ ] **Testable AC matrix for autosave split state:**
  - [ ] Low-impact-only edit → autosaves silently on the 400ms tick. No modal. No version row.
  - [ ] High-impact-only edit → on the next 400ms tick, autosave is held; modal fires. Confirm → save runs + version row. Discard → revert; no save, no version row.
  - [ ] Both dirty (low + high simultaneously) → low-impact autosaves run on schedule; high-impact autosave is held until the modal resolves; on Confirm the held high-impact field is included in the next save and a version row captures the full snapshot.
  - [ ] Tab-close with high-impact dirty → `beforeunload` surfaces the modal; if the operator closes anyway, the held field is dropped (treated as Discard).
- [ ] Restore flow:
  - Calls `restoreFlowDraftVersionAction({ brand, flowId, versionNumber, reason })`.
  - Server: snapshot current draft as new version (action='restore-pre'), overwrite draft state with target snapshot, write audit row.
  - Client: hydrate store with restored state, toast `Restored draft to vN`.
- [ ] A unit test asserts the `restoreVersion` service is idempotent if the same restore is dispatched twice (same `versionNumber` + reason → no double-row in audit; the second call no-ops).
- [ ] An integration test (Vitest + Supabase test harness from `docs/flow-builder/SPEC-TEST-INFRA.md`) covers: save → save → restore → save and asserts the `ins_flow_draft_audit` chain.
- [ ] All existing tests stay green. `compile-block.contract.test.ts` is not affected.

## Affected files

**New files:**

- `supabase/migrations/YYYYMMDDHHMMSS_flow_draft_versions.sql` — additive migration, both tables.
- `src/lib/services/flow-draft-versions.ts` — service layer.
- `src/lib/services/__tests__/flow-draft-versions.test.ts` — service tests (Vitest + Supabase harness).
- `src/components/ui/warning-chip.tsx` — inline amber chip.
- `src/components/ui/__tests__/warning-chip.test.tsx`.
- `src/components/ui/confirm-high-impact-modal.tsx` — modal.
- `src/components/ui/__tests__/confirm-high-impact-modal.test.tsx`.

**Modify:**

- `src/types/database.ts` — regenerate with `supabase gen types typescript --project-id grkpgfphwqsawinsdbtc`.
- `src/lib/dashboard/flow-builder-locks.ts` — add `highImpact: boolean` per entry; update tests.
- `src/app/dashboard/flows/[flowId]/draft-persistence.ts` — extract a `diffFlowDraft(prev, next)` helper that returns `string[]` of changed field paths; used by the warning system.
- `src/app/dashboard/flows/[flowId]/flow-draft-sync.tsx` — wire warning detection + modal-gated save.
- `src/app/dashboard/flows/[flowId]/store.tsx` — extend the `rollback` reducer to read from a _server-fetched_ snapshot rather than the in-memory `state.versions` only. Keep the in-memory list as a cache.
- `src/app/dashboard/flows/[flowId]/actions.ts` — three new Server Actions.
- `src/app/dashboard/flows/[flowId]/related-pages/page-versions.tsx` — rebuild as the persisted history view.
- `src/app/dashboard/flows/[flowId]/__tests__/store.test.ts` — extend with rollback tests.
- `src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts` — extend with `diffFlowDraft` tests.

**Tests to add:**

- All `__tests__/` files listed above.

## Coordination with sibling tasks

- **`01-label-simplification.md`** owns warning-chip and modal copy. Add new entries to `FLOW_BUILDER_LABELS.warnings` once P4.01 lands; otherwise hard-code with a TODO.
- **`03-locked-vs-editable.md`** owns the lock catalog this spec extends. **Hard dependency.** P4.03 must land first or be developed in lockstep — the `highImpact` flag goes onto its `LockEntry` type.
- **`02-active-block-highlight.md`** is independent.
- **`05-why-this-exists.md`** is independent.

This spec touches `flow-draft-sync.tsx`, `actions.ts`, `store.tsx`, `draft-persistence.ts`, `page-versions.tsx`. None of these are touched by P4.01, P4.02, P4.03, or P4.05 — **the merge collision risk for P4.04 is low**, except where it shares the lock catalog with P4.03.

## Schema / migration changes

Migration: `supabase/migrations/YYYYMMDDHHMMSS_flow_draft_versions.sql`. Additive.

```sql
-- Persisted draft version history per (brand, flow_id).
create table public.ins_flow_draft_versions (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null,
  flow_id         text not null,
  version_number  integer not null,
  schema_version  integer not null default 4,
  state           jsonb not null,
  reason          text,
  created_by      text,                -- actor email (nullable to allow system actions)
  created_at      timestamptz not null default now(),

  constraint ins_flow_draft_versions_unique
    unique (brand, flow_id, version_number),
  constraint ins_flow_draft_versions_state_object
    check (jsonb_typeof(state) = 'object'),
  constraint ins_flow_draft_versions_reason_length
    check (reason is null or char_length(reason) <= 240)
);

create index idx_ins_flow_draft_versions_brand_flow
  on public.ins_flow_draft_versions (brand, flow_id, version_number desc);

alter table public.ins_flow_draft_versions enable row level security;

create policy "Service role bypass on ins_flow_draft_versions"
  on public.ins_flow_draft_versions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Append-only audit log of saves, restores, discards.
create table public.ins_flow_draft_audit (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null,
  flow_id             text not null,
  version_number      integer,            -- nullable for discard events
  action              text not null check (action in ('autosave','manual_save','restore','discard_modal','restore_pre_snapshot')),
  reason              text,
  changed_field_ids   text[] not null default '{}',
  actor_email         text,
  created_at          timestamptz not null default now(),

  constraint ins_flow_draft_audit_reason_length
    check (reason is null or char_length(reason) <= 240)
);

create index idx_ins_flow_draft_audit_brand_flow_time
  on public.ins_flow_draft_audit (brand, flow_id, created_at desc);

alter table public.ins_flow_draft_audit enable row level security;

create policy "Service role bypass on ins_flow_draft_audit"
  on public.ins_flow_draft_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- DOWN
-- drop policy if exists "Service role bypass on ins_flow_draft_audit" on public.ins_flow_draft_audit;
-- drop table if exists public.ins_flow_draft_audit;
-- drop policy if exists "Service role bypass on ins_flow_draft_versions" on public.ins_flow_draft_versions;
-- drop table if exists public.ins_flow_draft_versions;
```

The schema is intentionally narrow:

- `state jsonb` is the same shape `ins_flow_drafts.state` already uses.
- `version_number` keys against `(brand, flow_id)` so each flow has its own monotonic counter.
- Audit table is append-only; no UPDATE policy.
- Reason field length matches the modal's input cap (240 chars).
- Actor email is captured client-side from the existing dashboard auth; nullable to allow service-account writes.

After migration: regenerate types — `supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts`.

## API / contract changes

### Server Actions

```typescript
// src/app/dashboard/flows/[flowId]/actions.ts

export async function listFlowDraftVersionsAction(args: {
  brand: string
  flowId: string
}): Promise<
  | { success: true; data: FlowDraftVersionRow[] }
  | { success: false; error: string }
>

export async function createFlowDraftVersionAction(args: {
  brand: string
  flowId: string
  state: PersistedFlowDraft
  reason?: string
  changedFieldIds: string[]
  actorEmail: string | null
}): Promise<
  | { success: true; data: { versionNumber: number } }
  | { success: false; error: string }
>

export async function restoreFlowDraftVersionAction(args: {
  brand: string
  flowId: string
  versionNumber: number
  reason?: string
  actorEmail: string | null
}): Promise<
  | {
      success: true
      data: { restored: PersistedFlowDraft; newVersionNumber: number }
    }
  | { success: false; error: string }
>
```

### Service layer

```typescript
// src/lib/services/flow-draft-versions.ts

export interface FlowDraftVersionRow {
  versionNumber: number
  state: PersistedFlowDraft
  reason: string | null
  createdBy: string | null
  createdAt: string
}

export async function listVersions(args: {
  brand: string
  flowId: string
}): Promise<FlowDraftVersionRow[]>
export async function createVersion(args: {
  brand: string
  flowId: string
  state: PersistedFlowDraft
  reason?: string
  changedFieldIds: string[]
  actorEmail: string | null
  action: 'autosave' | 'manual_save' | 'restore_pre_snapshot'
}): Promise<{ versionNumber: number }>
export async function restoreVersion(args: {
  brand: string
  flowId: string
  versionNumber: number
  reason?: string
  actorEmail: string | null
}): Promise<{ restored: PersistedFlowDraft; newVersionNumber: number }>
```

### `diffFlowDraft` helper

```typescript
// src/app/dashboard/flows/[flowId]/draft-persistence.ts (extension)

/** Returns the list of changed field paths between two drafts. Paths use dot notation, e.g. "blocks.email.postEmailBehavior.confirmationMessage". */
export function diffFlowDraft(
  prev: PersistedFlowDraft,
  next: PersistedFlowDraft
): string[]
```

The function walks the two drafts and yields paths that map to lock-catalog entries via a path → catalog-id resolver in `src/lib/dashboard/flow-builder-locks.ts`.

## Third-party prerequisites

None new. Uses existing Supabase project (`grkpgfphwqsawinsdbtc`) + service role key.

The actor email comes from the dashboard's existing Supabase Auth session. If auth has not landed yet for the dashboard, fall back to `null` actor and document in the spec — when auth lands, populate retroactively from the auth session.

## Implementation plan (TDD)

1. **RED — migration test.** Add the migration; run `supabase db reset` locally; assert the two tables exist via a sanity query in the integration harness. (`supabase db reset` is part of the harness from `docs/flow-builder/SPEC-TEST-INFRA.md`.)
2. **GREEN — migration.** Apply migration; regenerate types.
3. **RED — service test.** `flow-draft-versions.test.ts`: `createVersion → listVersions → restoreVersion` round-trip. Assert audit row count.
4. **GREEN — service.** Implement `flow-draft-versions.ts`. Tests pass.
5. **RED — `diffFlowDraft` test.** `flow-helpers.test.ts`: assert known field-path mapping for changes to `email.postEmailBehavior.confirmationMessage`, `bot.persona`, etc.
6. **GREEN — `diffFlowDraft`.** Implement helper in `draft-persistence.ts`.
7. **RED — Server Action tests.** Smoke tests for the three new actions in `actions.ts`. Validate Zod schemas.
8. **GREEN — Server Actions.** Wire to service layer.
9. **RED — `WarningChip` test.** Renders amber, ARIA role status.
10. **GREEN — `WarningChip`.**
11. **RED — `ConfirmHighImpactModal` test.** Reason required when high-impact; cancel restores prior values.
12. **GREEN — `ConfirmHighImpactModal`.**
13. **WIRE — `flow-draft-sync.tsx`.** Detect dirty high-impact fields via `diffFlowDraft`. Track them in `pendingHighImpactDirtyFieldIds`. On the next autosave tick, if any high-impact fields are dirty, hold the save and surface `ConfirmHighImpactModal` instead of dispatching `saveFlowDraftAction`. Allow low-impact autosaves to proceed in parallel. Bind a `beforeunload` listener so leave-page intent surfaces the same modal.
14. **WIRE — Versions page.** Rebuild `page-versions.tsx`: data fetch via `listFlowDraftVersionsAction`, render table, wire Restore button → `ConfirmHighImpactModal` re-used with restore copy → `restoreFlowDraftVersionAction`.
15. **WIRE — store.** Adjust the `rollback` reducer to call the Server Action instead of trusting only `state.versions`. Keep in-memory list as a cache for optimistic UI.
16. **VERIFY.**
    - `npm run lint && npm run type-check && npm run build`.
    - Run focused test commands:
      ```
      npx vitest run src/lib/services/__tests__/flow-draft-versions.test.ts
      npx vitest run src/app/dashboard/flows/[flowId]/__tests__/store.test.ts
      npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts
      ```
    - Manual smoke: edit the post-email confirmation, see the warning chip, save → modal → reason → save persists. Open Versions tab → see two rows. Click Restore on v1 → modal → confirm → workspace shows v1 state. Verify a third row is now present.

## Test plan

- **Unit (Vitest):**
  - `__tests__/store.test.ts` — extended `rollback` cases (with snapshot from server).
  - `__tests__/flow-helpers.test.ts` — `diffFlowDraft` cases.
  - `__tests__/warning-chip.test.tsx` — render + ARIA.
  - `__tests__/confirm-high-impact-modal.test.tsx` — reason required, cancel behaviour.
- **Integration (Vitest + Supabase harness):**
  - `__tests__/flow-draft-versions.test.ts` — service-layer round-trip; idempotency on restore; append-only audit.
- **E2E (Playwright):**
  - `tests/e2e/flow-builder-warnings-rollback.spec.ts`:
    - Edit `email.postEmailBehavior.confirmationMessage`.
    - Assert warning chip appears.
    - Press save → assert modal.
    - Type reason, confirm → assert toast + autosaved.
    - Open Versions tab → assert 2 rows (initial + new).
    - Click Restore on v1 → confirm → assert workspace reverts.
- **Live verification:** in dev, walk the flow above against a real Supabase project. Verify rows in `ins_flow_draft_versions` and `ins_flow_draft_audit`.
- **Compile-block contract:** must stay green. Display-only / persistence-only changes don't affect prompt output.

## Rollout

- **Feature flag:** `NEXT_PUBLIC_FLOW_VERSIONS` (default `false` in prod). When `false`:
  - Versions page renders the existing status-card view.
  - Warning chip / modal are inert (autosave behaves as today).
- **Migration order:**
  1. Apply migration (creates tables; no production read/write yet).
  2. Deploy code with flag `false`.
  3. Internal QA: flip flag for the dev environment, walk the flow.
  4. Flip flag `true` for the brand in prod.
- **Production safety:**
  - Tables are additive; existing `ins_flow_drafts` is untouched.
  - The new Server Actions are the only writers; if they fail, the existing autosave path remains intact.
  - The compile-block contract test is the regression guard.
  - Service-role-only RLS on the new tables means client cannot bypass the Server Actions.
- **Rollback:**
  - Flip `NEXT_PUBLIC_FLOW_VERSIONS=false`. UI reverts to today.
  - The two new tables remain (data is preserved).
  - If schema rollback is required, the `-- DOWN` block in the migration drops both tables.

## Dependencies

- **Hard:** P4.03 — extends `LockEntry` with `highImpact`.
- **Soft:** P4.01 — copy from catalog.
- **Soft:** dashboard auth — when auth lands, populate `actor_email` from session. Until then, `null` is acceptable.

## Risks + mitigations

- **Risk:** the modal becomes annoying — operators see it every save and click through without reading. **Mitigation:** modal only fires when a _high-impact_ field is dirty. Non-high-impact edits autosave silently. The catalog must be tight; review the `highImpact: true` set with Sofia after the first feedback pass.
- **Risk:** restoring a version corrupts the current draft if the schema has drifted. **Mitigation:** the snapshot stores `schema_version`. `restoreVersion` rejects mismatched schema versions with a clear error (`'Cannot restore version from older schema. Contact admin.'`).
- **Risk:** version-number monotonicity races between two operators saving simultaneously. **Mitigation:** the unique `(brand, flow_id, version_number)` constraint forces one to retry. The service uses `select max(version_number) + 1 for update` inside a transaction to avoid the race.
- **Risk:** audit table grows unbounded. **Mitigation:** v0 keeps everything. Schedule a follow-up cleanup task once we have 6+ months of data; partition or archive by quarter.
- **Risk:** the warning chip shows on legacy fields where it's not warranted. **Mitigation:** the catalog drives the list. If a chip shows incorrectly, edit the catalog — single-file fix.
- **Risk:** restore loses in-flight unsaved edits silently. **Mitigation:** if there are unsaved dirty fields when Restore is clicked, the confirmation modal lists them ("3 unsaved fields will be lost: ..."). Operator must confirm.
- **Risk:** the `diffFlowDraft` function diverges from the catalog's path → id mapping over time. **Mitigation:** unit test enumerates every catalog `id` with `highImpact: true` and asserts the resolver returns a non-empty path.

## Out of scope / explicit deferrals

- Live publish path with audit (deferred to live-publish work in `plans/post-email-behavior-config-tdd/plan.md` Live Publish Follow-Up).
- Diff view between versions ("show me what changed between v3 and v5"). v0 ships only the bulleted "3 fields changed" summary; the full diff is FUTURE.
- Multi-user collaboration / draft locking. Last-write-wins still applies.
- Automatic snapshotting on a timer (e.g. one snapshot per day). v0 only snapshots on operator-confirmed saves and on restore-pre.
- Email/Slack notifications on restores. Audit row is enough for v0.
- Cross-flow rollback ("restore Brand X's flow to a snapshot taken from Brand Y's flow"). Out of scope.

## PR strategy

**Stacked against `feat/p4-base` (P4.01) AND must follow P4.03's lock-catalog merge.** This spec touches `flow-draft-sync.tsx`, `actions.ts`, `store.tsx`, `draft-persistence.ts`, `page-versions.tsx`, and extends the lock catalog from P4.03 with `highImpact: boolean`. Because of the lock-catalog dependency, P4.03 must merge into `main` (after coming off `feat/p4-base`) before this work can rebase onto a clean main. Open this work as a stack against `feat/p4-base` if P4.01 is still in flight; otherwise base off `main` after P4.03 lands. See [`plans/dm-setter-roadmap/execution-protocol.md`](../execution-protocol.md).

Three internal stacked PRs:

1. `feat/p4-04a-versions-migration-and-service` — migration + service layer + tests. No UI.
2. `feat/p4-04b-warnings-modal` — `WarningChip`, `ConfirmHighImpactModal`, lock-catalog `highImpact`, `diffFlowDraft`. Wires into `flow-draft-sync.tsx`.
3. `feat/p4-04c-versions-ui` — `page-versions.tsx` rebuild, restore action wiring, e2e tests.

Each stacked PR rebases onto its predecessor when that predecessor lands. Conventional commits inside each PR follow standard scopes. Stack only — don't squash before review.

## Observability

- **Logs:** structured logs in service layer for `createVersion`/`restoreVersion`: `{ brand, flow_id, version_number, action, actor }`.
- **Sentry breadcrumbs:** breadcrumb on every modal open, save confirm, restore confirm. Error path captured if Server Action returns `success: false`.
- **Metrics:** none in v0. Optional follow-up: count restores per week as a "regret" signal.
- **Operator-visible status:** the Versions page is the surface. The toast on save/restore confirms.

## Notes for the implementing agent

- The current `rollback` reducer in `store.tsx` line 636-674 is a useful template — the snapshot/swap logic stays largely the same. The change is _where the snapshot comes from_ (DB instead of in-memory `state.versions`).
- The post-email-behavior plan (`plans/post-email-behavior-config-tdd/plan.md` lines 458-471) explicitly defers live publish path. This task does NOT bridge that gap. It only adds version history for the _draft_ layer — the same layer that today autosaves to `ins_flow_drafts`. That's the pragmatic step Sofia asked for; live publish is a later task.
- `~/.claude/rules/supabase.md`: never `select('*')`; type the client with `Database`. Service role key only on server side. Test migrations with `supabase db reset` before pushing.
- `~/.claude/rules/stripe.md` is irrelevant here. `~/.claude/CLAUDE.md` Git Log Date Filtering applies if any analysis script tags audit rows by date.
- Reference commit `cee4471 Persist flow builder drafts in Supabase` for the existing `ins_flow_drafts` precedent. The new tables follow the same pattern.
- Reference commit `80d5d98 feat(flow-builder): configure post-email delivery` for the most recent example of an editable high-impact field landing in `draft-persistence.ts`. That field — `postEmailBehavior.confirmationMessage` — is the canonical "high-impact" entry for the catalog.
- Light theme. The warning chip uses `#FFF7E6` background with `#7A4B00` text (already used by the email panel's "No automatic delivery" warning at `email.tsx` lines 348-362). Reuse the same tone tokens via the `Chip` palette.
- The `ConfirmHighImpactModal` should re-use the existing `FloatingPanel` pattern (`floating-panel.tsx`) so focus management and Escape behaviour match. Test focus-trap explicitly in the component test.
- The Flow Builder workspace has **no explicit save button** — autosave is the only persistence path. The "save intent" is therefore implicit: the modal fires on the next autosave tick that would include a high-impact dirty field. The held field stays in `pendingHighImpactDirtyFieldIds` until Confirm or Discard. Low-impact fields continue to autosave on schedule. There is no "save button" to add and no need to invent one.
- Audit rows are write-only via Server Actions. Don't expose a client-side write path. The Versions page reads via the `listVersions` action.
- A potential edge case: an operator restores an old version, immediately makes new edits, hits save. Two version rows: one from the restore-pre snapshot, one from the new save. The audit chain reads cleanly: `restore_pre_snapshot` → `restore` → `manual_save`.
- When generating types after the migration: `supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts`. Verify nothing else in the diff changed unexpectedly.
- If the implementation finds the `actor_email` plumbing too heavy without dashboard auth landed, ship with `null` actor and the catalog substring-ban tests still pass. Document in PR.
- Avoid coupling the audit schema to specific event sources. `action` is a small enum; new actions can be added in a follow-up migration if needed (e.g. `'publish'` later).
- The `ins_flow_drafts.state` shape is unchanged. This task only adds new tables that _snapshot_ the same shape.
