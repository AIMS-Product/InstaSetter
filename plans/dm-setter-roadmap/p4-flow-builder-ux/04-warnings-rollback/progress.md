# P4.04 — Warnings + version history / rollback

Tracking ledger for the implementation. Append-only.

## 2026-04-29 — Wave 1 (lock-catalog + service layer)

- Started branch `feat/p4-04-warnings-rollback` from `feat/p4-03-locked-vs-editable`.
- Migration `supabase/migrations/20260504000000_flow_draft_versions.sql`
  adds `ins_flow_draft_versions` and `ins_flow_draft_audit` tables. Both
  use `if not exists` (additive-only invariant). Service-role-only RLS.
- Hand-added the two new tables to `src/types/database.ts` mirroring the
  existing `ins_flow_drafts` shape; kept the file otherwise byte-for-byte
  identical so a future `supabase gen types` run produces a clean diff.
- Extended `LockEntry` with `highImpact: boolean`. Every `safety` entry is
  high-impact; admin entries flagged: `qualifier.order`,
  `booking.linkPattern`, `bot.persona.body`, `email.captureTriggers`. The
  catalog test asserts the `safety→highImpact` invariant and that every
  admin+highImpact id is on the explicit allowlist.
- Added `resolveLockIdForFieldPath` + `isFieldPathHighImpact` to the
  catalog so `flow-draft-sync.tsx` can decide which dirty paths gate the
  modal without hand-mapping in app code.
- `src/lib/services/flow-draft-versions.ts` exports `listVersions`,
  `listAuditTrail`, `createVersion`, `restoreVersion`, `recordAudit`. Each
  goes through `createServiceRoleClient`. `restoreVersion` is idempotent
  against duplicate calls with the same `versionNumber + reason`.
- New action signatures in `actions.ts` (Zod-validated):
  `listFlowDraftVersionsAction`, `createFlowDraftVersionAction`,
  `restoreFlowDraftVersionAction`, `recordFlowDraftDiscardAction`. Each
  returns `{ success, data?, error? }`.
- Feature flag `NEXT_PUBLIC_FLOW_VERSIONS` lives in `src/lib/config.ts`
  via `isFlowVersionsEnabled()`. Default off.

## 2026-04-29 — Wave 2 (UI + autosave wiring)

- `src/components/ui/warning-chip.tsx` — amber light-theme inline chip
  (`role="status"`). Reuses the `#FFF7E6 / #7A4B00` tone from the email
  panel's "No automatic delivery" warning.
- `src/components/ui/confirm-high-impact-modal.tsx` — focus-trapped modal
  with two modes (`save` / `restore`). Save mode requires a reason;
  restore mode leaves it optional. Escape triggers Discard. Reason
  textarea autofocused on open. Counter shown under the input.
- `flow-draft-sync.tsx` rewritten as the autosave + warning gate. Keeps
  the existing low-impact 400ms tick alive and adds a parallel
  high-impact hold path. On the hold tick: low-impact saves run from a
  baseline-merged snapshot; the modal opens with the held high-impact
  fields. On Confirm the held save runs and a version row is recorded.
  On Discard the held fields revert to last-saved and a `discard_modal`
  audit row is written. `beforeunload` fires the modal if the operator
  tries to leave with held fields.
- `draft-merge-helpers.ts` extracted from `flow-draft-sync.tsx` so the
  sync component stays focused. Exports
  `mergeDraftHighImpactFromBaseline` + `summariseFieldPath`.
- `page-versions.tsx` rebuilt with the persisted history table when the
  flag is on. Status cards remain. Restore button per row opens the same
  modal in `restore` mode; on Confirm it calls
  `restoreFlowDraftVersionAction`, hydrates the store, refetches the
  table.

## Tests added

- `src/lib/dashboard/__tests__/flow-builder-locks.test.ts` — extended
  with high-impact invariants + path-resolver assertions (5 new it).
- `src/components/ui/__tests__/warning-chip.test.tsx` — render, role,
  classes (3 it).
- `src/components/ui/__tests__/confirm-high-impact-modal.test.tsx` —
  open/close, reason gating, Escape, restore mode (8 it).
- `src/lib/services/__tests__/flow-draft-versions.test.ts` —
  monotonic version numbers, audit trail, restore round-trip,
  idempotency (4 it).
- `src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts` —
  `diffFlowDraft` cases (4 new it).
- `src/components/ui/__tests__/lock-popover.test.tsx` — fixed for the
  new `highImpact` field on `LockEntry`.

## Verification

- `npx tsc --noEmit` clean.
- `npx vitest run` — 47 files / 477 tests pass.
- `npm run lint` — 0 errors, 15 pre-existing warnings.
- Compile-block contract test green (33 / 33).

## Open items / follow-ups

- E2E Playwright spec deferred — the harness isn't part of this PR (no
  Playwright runner is wired locally). Tracked in qa-review.md.
- Actor email is plumbed through but defaulted to `null` until dashboard
  auth lands. The audit row schema permits null actors; the spec
  explicitly allows this.
- Flag is off by default; flipping it on is a separate rollout step.
