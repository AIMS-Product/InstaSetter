# [P4.03] Make locked vs editable rules obvious in the Inspector

**Status:** open
**Phase:** 4 — Flow Builder operator UX
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385025003108
**Owner:** unassigned
**Depends on:** P4.01 (label-simplification — adopts catalog terms for any new lock copy; merges first as `feat/p4-base`)
**Blocks:** P4.04 (warnings + rollback decisions reuse the lock-classification metadata to decide which edits trigger a warning)
**Risk:** medium (touches every block panel and the inspector; one source-of-truth refactor)
**Rough size:** M (1–3 days)

## Problem

From `docs/sofia-feedback-priorities.md`, Priority 3, third row:

> **Make editable versus locked rules obvious** — "Some global rules are locked and some may become editable." → "Operators know which rules they can change and which require developer/admin changes."

And from Sofia's feedback prompts:

> - Did anything feel risky to edit?

Today the Flow Builder has _fragmented_ lock signaling:

1. **Block-config panels** use a `<PanelCard locked>` prop + `<LockPill />` to hint that a section is fixed (`block-panels/shared.tsx` lines 7-84). Tooltip: `Fixed by InstaSetter for safety and compliance`.
2. **Guardrails panel** at the bottom of `Runtime Details` shows `Lock` icons + the source file path (`guardrails-panel.tsx`). Header reads `Fixed safety rules · N` and `set by InstaSetter`.
3. **Qualifier qualifiers** carry a per-entry `locked` boolean (`types.ts` line 81; `qualifier.tsx` line 70 renders `LockPill` when `q.locked`).
4. **Email triggers** carry a per-trigger `mandatory` boolean (`types.ts` line 134; rendered as a `Mandatory` orange pill in `email.tsx`).
5. **Bot page** (`page-bot.tsx`) renders global guardrails with their own lock visualization.

The signals are inconsistent — sometimes a lock icon, sometimes an orange pill, sometimes nothing — and the rules that are "locked-by-design" (e.g. `capture_email` must always fire after an email comes in; the US/Canada market gate; the bot must never claim a name) are spread across the prompt source files (`src/lib/prompts/sections/*.ts`) without any structural way for the UI to know "this rule is locked because of compliance" vs "this rule is locked because we haven't built editing UI yet" vs "this rule is fully editable but feels scary".

Sofia's risk: she edits a field she thinks is editable, and either nothing changes (because the underlying source still controls it) or she introduces a regression in a load-bearing rule. The current `<LockPill />` tooltip is honest but generic — "Fixed by InstaSetter" doesn't explain whether it's a compliance lock or a not-yet-built lock.

## Goal

Every editable surface in the Inspector and Bot page carries one of three glanceable lock states, drawn from a single source of truth:

- **Editable** — the operator can change this. No badge needed (default).
- **Locked (safety)** — InstaSetter enforces this for compliance, legal, or model-safety reasons. Cannot be edited from the dashboard. **Examples:** US/Canada market gate; the never-claim-a-name persona rule; `capture_email` tool firing after the email is received; "never ask for email as the first or second message".
- **Locked (admin)** — currently editable only by an admin/dev (engineering change required). Could become editable in a future build. **Examples:** persona text body, message-constraints word counts, qualifier order, qualifier list itself, objection-handler families.

Both lock states render the same lock icon, but the tooltip and the modal-on-click differ: a "Locked (safety)" lock is permanent; a "Locked (admin)" lock points to "Ask James" or links to a Slack channel for the change request. Operators see both as "I can't change this here", but they understand the _why_ and they know the right escalation.

## Non-goals

- No new RLS policies. Lock metadata is presentation-only (the database doesn't enforce these locks; the UI doesn't expose write paths for locked fields).
- No operator-promotion flow ("unlock this rule for me"). That's a future request-handoff feature, deferred to `docs/flow-builder/FUTURE.md`.
- No automatic detection of lock state from the prompt sections. Lock classification is hand-curated in a TS module, just like `surface-labels.ts` from P1.01. We re-evaluate if the table grows past ~30 entries.
- No removal of the existing `LockPill` API; this task extends it with `kind: 'safety' | 'admin'` (additive).
- No localization.

## Functional requirements

1. A typed catalog (`src/lib/dashboard/flow-builder-locks.ts`) enumerates every lock semantic in the workspace. Each entry has:
   - `id` — stable key (e.g. `'qualifier.location.locked'`, `'email.captureEmailTool'`, `'opening.usCanadaGate'`).
   - `kind` — `'safety' | 'admin'`.
   - `surface` — short human-readable scope ("Qualifier order", "Email capture tool", "US/Canada market gate").
   - `tooltip` — one-sentence explanation of why it's locked.
   - `escalation` — `null` for safety locks; `'Ask James in #dm-setter Slack'` (or similar) for admin locks.
   - `sourceHint` — optional file path or doc reference (e.g. `src/lib/prompts/sections/location-gate.ts`).
2. The existing `<LockPill />` accepts `kind?: 'safety' | 'admin'` and renders accordingly:
   - `safety` (default for backwards compat): grey pill, lock icon, label `Locked`.
   - `admin`: amber pill, lock icon with a small dotted underline, label `Locked (admin)`.
3. Every existing `<LockPill />` and `<PanelCard locked>` callsite is reviewed and re-classified using the catalog. Re-classification is a code-only change; visual treatment differentiates `safety` (default grey) from `admin` (amber).
4. Clicking a lock pill opens a small popover (or expands an inline detail row) showing:
   - The catalog entry's `tooltip`.
   - The `escalation` text (if `admin`).
   - A "View source" link (if `sourceHint` is present) — opens the existing `PromptReader` at the right anchor.
5. The Guardrails panel (`guardrails-panel.tsx`) is updated to render each guardrail with its catalog-derived lock kind. Today's "Fixed safety rules · N" header becomes "Locked safety rules · N" (inherits the rename from P4.01 if landed; otherwise hard-code).
6. New editable fields landed during this task (e.g. the post-email confirmation message landed in `80d5d98` is editable; document its lock state as `editable` for completeness in the catalog → the entry is `null` because there's nothing to lock).
7. Catalog has a unit test that asserts every entry's `id` is unique, `kind` is one of the two values, and `escalation` is `null` ⟺ `kind === 'safety'`.
8. The catalog substring-bans `Week ` (per `~/.claude/CLAUDE.md`), `compile-block`, `flow_engine.`, `setter-v2`, `prompt source files`. Operator copy stays prospect-safe.

## Acceptance criteria

- [ ] `src/lib/dashboard/flow-builder-locks.ts` exports `FLOW_BUILDER_LOCKS: Record<LockId, LockEntry>` and a `getLock(id): LockEntry` helper.
- [ ] Catalog has at least these entries (the implementing agent may add more; never fewer):
  - `opening.usCanadaGate` — `safety`
  - `opening.outOfAreaScript` — `safety`
  - `qualifier.list` — `admin`
  - `qualifier.order` — `admin`
  - `qualifier.thresholds` — `admin`
  - `objection.handlers` — `admin`
  - `objection.followUps` — `admin`
  - `objection.structure` — `admin`
  - `booking.linkPattern` — `admin`
  - `booking.reengagement` — `admin`
  - `email.captureEmailTool` — `safety`
  - `email.timingFloor` — `safety` (no email ask in first/second message)
  - `email.captureTriggers` — `admin` (the three trigger windows are admin-locked today)
  - `escalation.requiredTriggers` — `admin`
  - `escalation.captureMethod` — `safety` (HUMAN_AGENT tag handoff is compliance-driven)
  - `summary.requiredFields` — `admin`
  - `bot.persona.body` — `admin` (full persona text)
  - `bot.persona.namelessRule` — `safety` (bot must never claim a name)
  - `bot.messageConstraints` — `admin`
  - `guardrails.global` — `safety`
- [ ] `<LockPill kind="admin" />` renders an amber-tinted pill with label `Locked (admin)`. Existing `<LockPill />` (no `kind`) keeps the grey `Locked` rendering. Both have an `aria-label` describing the lock.
- [ ] Clicking either pill opens a popover with the catalog tooltip, escalation note (if admin), and view-source link (if `sourceHint`). Popover dismisses on outside click and on Escape.
- [ ] Every existing `<LockPill />` callsite is updated to pass an `id` (catalog lookup) and the pill auto-derives `kind` + tooltip from the catalog. **Implementation note:** the agent may keep a no-id legacy path during the sweep, then remove it once every callsite is migrated, to make the diff safer.
- [ ] `<PanelCard locked>` is extended with `lockId?: LockId` so the title-row pill is catalog-aware. When `lockId` is provided, the card pulls tooltip + kind from the catalog.
- [ ] Bot page (`page-bot.tsx`) renders persona body + message constraints with the right lock kind (`admin` for body, `safety` for the nameless rule highlighted as a separate locked rule below).
- [ ] Catalog-driven test (`__tests__/flow-builder-locks.test.ts`):
  - Every `id` is unique.
  - Every `kind` is `'safety' | 'admin'`.
  - `escalation` is `null` ⟺ `kind === 'safety'`.
  - No tooltip or escalation contains the banned substrings.
  - Every catalog entry's `id` is referenced in at least one source file under `src/app/dashboard/` (substring scan during test).
- [ ] All existing tests (unit + contract) stay green. `compile-block.contract.test.ts` is unaffected — locks are presentational.

## Affected files

**New files:**

- `src/lib/dashboard/flow-builder-locks.ts` — catalog + helper.
- `src/lib/dashboard/__tests__/flow-builder-locks.test.ts` — catalog tests.
- `src/components/ui/lock-popover.tsx` — popover that replaces the existing static tooltip on `LockPill`. (Or extend `LockPill` in place — see "Notes".)

**Modify:**

- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/shared.tsx` — extend `LockPill` to accept `id?: LockId` and `kind?: 'safety' | 'admin'`. Extend `PanelCard` with `lockId?`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/opening.tsx` — `<PanelCard ... locked>` → pass `lockId='opening.usCanadaGate'`. The out-of-area card → `lockId='opening.outOfAreaScript'`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/qualifier.tsx` — pass `lockId='qualifier.list'` on the main card; per-entry `LockPill` reads `qualifier.order` for entries with `q.locked === true`. Thresholds card → `qualifier.thresholds`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/objection.tsx` — three locked surfaces: handlers list, follow-ups, structure.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/booking.tsx` — `Re-engagement` card → `booking.reengagement`. Reminder script → same.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/email.tsx` — `Capture triggers` panel → `email.captureTriggers`. The `Hesitation response` card has `<LockPill /> tool: capture_email called immediately…` → `email.captureEmailTool`. Reclassify the `Mandatory` orange pill: it stays as a tone signal (this is a turn-level rule, not a global lock), but cross-link the catalog tooltip.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/escalation.tsx` — required triggers card → `escalation.requiredTriggers`. Capture method note → `escalation.captureMethod`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/summary.tsx` — locked sections → `summary.requiredFields`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/followup.tsx` — `Timing` panel is `locked` today; classify as `admin` (delay hours could become editable) → new id `followup.timing`. Add to catalog.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/guardrails-panel.tsx` — header copy update + per-guardrail lock kind derived from the global guardrail entries (`guardrails.global` for entries that are global; per-block guardrails fall under the relevant block).
- `src/app/dashboard/flows/[flowId]/related-pages/page-bot.tsx` — wrap the persona-body card with `lockId='bot.persona.body'`. Surface the nameless rule as a separately-tagged sub-card with `lockId='bot.persona.namelessRule'`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/inspector.tsx` — minor: when the active block has any safety-locked sub-rules, the inspector header could show a tiny "1 locked rule" hint. Keep it small (10px text); this is a polish item, not a hard requirement.

**Tests to add / modify:**

- `src/lib/dashboard/__tests__/flow-builder-locks.test.ts` — new (above).
- `src/components/ui/__tests__/lock-popover.test.tsx` — new component test.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/__tests__/` — add or extend tests for `email.tsx`, `qualifier.tsx`, `objection.tsx`, `booking.tsx` if those test files exist; otherwise create a minimal `lock-pill-integration.test.tsx` that imports each panel and asserts the catalog ids resolve.

## Coordination with sibling tasks

The Inspector and block-config panels are the contested zone:

- **`01-label-simplification.md`** owns display copy. Spec 03 must read all new tooltip/label strings from the catalog produced in P4.01 if it lands first; otherwise it ships its own copy that P4.01 later folds into the catalog.
- **`02-active-block-highlight.md`** adds an "Active" pill in the inspector header. The lock pill in this spec sits inside the block-config-panel cards and inside individual guardrails — different region, no collision.
- **`04-warnings-rollback.md`** uses this catalog: edits to fields without a lock entry can warn or not; edits to fields with `kind === 'admin'` should not be exposed at all in the editor (so warnings never come up for admin-locked fields). Edits to fields with `kind === 'safety'` do not exist (no editor surface). The catalog is the single source for "which edits matter for warnings".
- **`05-why-this-exists.md`** is independent.

If P4.01 lands first, this spec consumes its catalog. If P4.03 lands first, the lock catalog is the source of truth and P4.01 imports labels from here. **Recommended sequence: P4.01 → P4.03 → P4.04 → P4.02 → P4.05.** All five can be developed in parallel branches with rebase overhead.

## Schema / migration changes

**None.** Lock state is presentational; the database is unchanged.

A future task (not this one) might add an `ins_flow_lock_overrides` table when operators get the ability to request promoting an admin lock to editable. Document this in `docs/flow-builder/FUTURE.md`.

## API / contract changes

```typescript
// src/lib/dashboard/flow-builder-locks.ts
export const LOCK_KINDS = ['safety', 'admin'] as const
export type LockKind = (typeof LOCK_KINDS)[number]

export interface LockEntry {
  id: string
  kind: LockKind
  /** Short human-readable scope, e.g. "Qualifier order". */
  surface: string
  /** One-sentence explanation. */
  tooltip: string
  /** Null for safety locks. Non-null for admin locks. */
  escalation: string | null
  /** Optional file path for "View source" deep-link. */
  sourceHint?: string
}

export type LockId = keyof typeof FLOW_BUILDER_LOCKS

export const FLOW_BUILDER_LOCKS: Record<string, LockEntry>
export function getLock(id: string): LockEntry
```

```tsx
// src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/shared.tsx (extension)
interface LockPillProps {
  /** New: catalog id. When set, derives kind/tooltip from catalog. */
  id?: LockId
  /** Override kind if not using catalog. Default: 'safety'. */
  kind?: LockKind
  /** Override tooltip if not using catalog. */
  title?: string
}

interface PanelCardProps {
  // ... existing props
  /** New: catalog id for the title-row lock pill. */
  lockId?: LockId
}
```

The component change is additive; existing callsites without `id` continue to render as today.

## Third-party prerequisites

None — first-party only.

The `escalation` strings reference Slack (`#dm-setter` channel). If that channel doesn't yet exist, the catalog ships with `Ask James to change` as the fallback. Update once the channel is alive.

## Implementation plan (TDD)

1. **RED — catalog test.** Create `__tests__/flow-builder-locks.test.ts`. Assert: unique ids, valid kinds, `escalation` correlates with kind, banned-substring scan, every catalog id is referenced in at least one `src/app/dashboard` file. Run; fails because catalog doesn't exist.
2. **GREEN — catalog.** Create `flow-builder-locks.ts` with the entries listed in Acceptance Criteria. Run tests; the "every id referenced" check fails until step 4.
3. **RED — popover test.** Create `__tests__/lock-popover.test.tsx`. Assert: opens on click, closes on outside click + Escape, renders tooltip + escalation when `kind === 'admin'`, renders no escalation when `kind === 'safety'`, tab order is sane.
4. **GREEN — popover.** Extend `LockPill` (or extract `LockPopover`) per the API above. Tests pass.
5. **WIRE — sweep callsites.** For each `block-panels/*.tsx` file, replace `<PanelCard locked>` with `<PanelCard lockId="...">` and existing `<LockPill />` calls with `<LockPill id="...">`. Verify each maps to a catalog entry. Re-run the catalog "every id referenced" check; should now pass.
6. **WIRE — guardrails.** Update `guardrails-panel.tsx` header copy and per-row kind. Where the guardrail's `source` matches the catalog's `sourceHint`, derive the lock id automatically.
7. **WIRE — Bot page.** Wrap persona body and message constraints in lock-aware containers. Add the nameless rule as an explicit safety-locked sub-card.
8. **REFACTOR.** Extract any shared inline-tooltip styling into the popover component. Confirm `LockPill` without `id` still renders (legacy path) for the test fixtures that don't yet supply ids.
9. **VERIFY.** `npm run lint && npm run type-check && npm run build`. Run focused tests. Manual sweep: open every block in the workspace, click every lock pill, confirm the popover shows the catalog content. Verify the Bot page.

## Test plan

- **Unit (Vitest):**
  - `__tests__/flow-builder-locks.test.ts` — catalog assertions.
  - `__tests__/lock-popover.test.tsx` — interaction tests.
- **Integration (Vitest):** none.
- **Component (Vitest + RTL):**
  - `__tests__/lock-pill-integration.test.tsx` — render each panel with mock `BlockConfig`, assert each `LockPill` resolves a valid catalog entry.
- **E2E (Playwright):** optional. If a flow-builder e2e exists, add `tests/e2e/locked-vs-editable.spec.ts`:
  - Open the qualifier block.
  - Click the locked-list pill.
  - Assert the popover shows "Ask James" (admin lock).
  - Open the email block.
  - Click the `capture_email` lock pill.
  - Assert the popover shows the safety-lock copy and no escalation.
- **Live verification:** open the workspace, walk through every block. For each lock pill, confirm:
  - Tooltip on hover shows the catalog tooltip.
  - Click opens the popover with the right kind treatment.
  - Escape closes the popover; outside click closes it.
- **Compile-block contract:** must stay green.

## Rollout

- **Feature flag:** none. Pure presentational change. Default-on. The catalog is built-in.
- **Migration order:** none.
- **Production safety:** zero risk. No database, no prompt, no engine path is touched. The compile-block contract test guards regressions.
- **Rollback:** revert the PR. All callsites fall back to legacy `LockPill` rendering since the `id` prop is optional.

## Dependencies

- P4.01 — preferred to land first; the catalog tooltips can borrow display labels from `FLOW_BUILDER_LABELS`. If P4.03 lands first, P4.01 imports lock surface names from this catalog.
- P4.04 — depends on this catalog to know which fields warrant a warning. Must merge after P4.03.
- P4.02 — independent.
- P4.05 — independent.

## Risks + mitigations

- **Risk:** the binary `safety | admin` classification is too coarse — a rule is partly safety, partly editable copy. **Mitigation:** the catalog is hand-curated. When in doubt, default to `admin` (more permissive escalation message) but flag any borderline entries in the PR description for Sofia to gut-check.
- **Risk:** Sofia clicks a safety lock and feels stonewalled. **Mitigation:** safety-lock tooltips explain _why_ in plain English ("This rule keeps the bot from claiming a personal name. The IG account is shared between team members."). Operators leave with understanding, not frustration.
- **Risk:** the catalog grows unmanageable. **Mitigation:** target ~25 entries in v0. If it crosses 50, refactor into per-block files (`flow-builder-locks/qualifier.ts`, `.../email.ts`).
- **Risk:** an admin lock is silently editable somewhere we missed. **Mitigation:** the catalog test enforces "every entry referenced by at least one source file". A separate code review checklist verifies no editable input on a field marked `admin`. Manual smoke during step 9.
- **Risk:** the amber pill clashes with the existing orange `Mandatory` pill on email triggers (`email.tsx` line 197-202). **Mitigation:** keep the email `Mandatory` pill as-is — it's a different concept (turn-level mandatory step, not a system lock). Use a distinct amber tone (`#FBE7D9` background → use a slightly different shade like `#FFF7E6` for admin locks, or the catalog can specify the tone token).
- **Risk:** clicking a lock pill confuses operators when they expected hover to give them the answer. **Mitigation:** keep the hover tooltip (existing `title=`) AND add the click popover. Click is for keyboard users + persistent reading; hover is for skimming.

## Out of scope / explicit deferrals

- Operator-promoted unlock requests — defer to backlog. The "Ask James" escalation is the v0 affordance.
- Per-brand lock catalogs — single global catalog for now.
- Auto-syncing the catalog with the prompt source files. The catalog is hand-curated; drift is caught by the "every id referenced" test, not by automatic inference.
- A page that lists all locks across the workspace ("Lock Inventory"). Defer; if Sofia wants it, the catalog already has the data.
- Different tones per safety-lock category (compliance, legal, model-safety). One tone for `safety` for now.

## PR strategy

**Stacked PR against `feat/p4-base` (P4.01).** This spec touches `inspector.tsx`, every file under `block-panels/`, `guardrails-panel.tsx`, and `related-pages/page-bot.tsx` — heavy overlap with the catalog wiring landed in P4.01. Open against `feat/p4-base` and rebase onto `main` once that base merges. See [`plans/dm-setter-roadmap/execution-protocol.md`](../execution-protocol.md) for the file-ownership matrix and stacked-PR protocol.

Branch: `feat/p4-03-locked-vs-editable`. Base: `feat/p4-base`.

Conventional commits:

- `feat(flow-builder): introduce lock catalog with safety vs admin kinds`
- `feat(flow-builder): lock pill click → popover with escalation`
- `refactor(flow-builder): wire every lock callsite through catalog`

## Observability

- **Logs:** none.
- **Sentry breadcrumbs:** optional — log popover-opens for telemetry on which locks operators click most. Not blocking.
- **Metrics:** none in v0.
- **Operator-visible status:** the lock pills and popover are the surface.

## Notes for the implementing agent

- The `LockPill` API today is intentionally minimal. The temptation will be to overload it with kind/tooltip/popover/source — keep it small. If the file `block-panels/shared.tsx` grows past 200 lines, extract `LockPopover` into its own file under `src/components/ui/`.
- `kind = 'safety'` as default keeps every existing `<LockPill />` callsite rendering as before — avoids a big-bang visual change. The amber treatment only appears on entries the agent classifies as `admin`.
- The "View source" link should reuse the existing `PromptReader` modal: when the user clicks "View source" inside the popover, fire the same `setReader({ target: 'persona' })` pattern from `inspector.tsx` line 408. Keep the affordance minimal and consistent with the existing source-jump workflow.
- The `Guardrail.source` strings (`types.ts` line 58) point at file paths. The catalog's `sourceHint` should match those formats so a guardrail can resolve to a catalog entry by source-path lookup. Implement a small `getLockBySourceHint(source)` helper.
- The bot's nameless-persona rule is covered in `~/.claude/projects/-Users-jamesaims-Desktop-Development-InstaSetter/memory/project_bot_persona_nameless.md` — the safety lock for `bot.persona.namelessRule` is non-negotiable. Tooltip should be one sentence ("The bot must never state a name. The IG account is a shared team inbox.").
- Reference commit `b47f464` for prospect-safe copy tone.
- Light theme + Linear/Vercel/Stripe aesthetic. Amber pill should match the warning toast tone used in `email.tsx`'s "No automatic delivery is live" warning at lines 348-362.
- The `Mandatory` orange pill on email triggers (line 192-205) is a turn-level signal, not a system lock. Don't migrate it to the lock catalog. Instead, keep the existing visual; the tooltip can reference the catalog's `email.captureTriggers` lock for cross-reference.
- The "Locked safety rules · N" header rename in `guardrails-panel.tsx` overlaps with P4.01. If P4.01 has landed, import from `FLOW_BUILDER_LABELS.panelSections`; if not, hard-code it now and revert in a follow-up commit.
- A11y: lock pill is a `<button>` (or has `role="button"`) with `aria-haspopup="dialog"` and `aria-expanded` reflecting popover state. The popover is a `<div role="dialog" aria-label="...">` with focus management identical to `floating-panel.tsx`'s pattern.
- Verify the catalog substring-ban test catches every banned token. Use the same regex pattern as `surface-labels.test.ts` from P1.01 if that lands first.
- Don't migrate the test fixtures' `<LockPill />` calls without ids until step 5 — leave them as-is during the catalog build so the test fail/pass cycle is clean.
