# Codebase Review Remediation Thin Slice Plan

Status: COMPLETE
Last updated: 2026-06-01
Owner: Codex

## Working Brief

- Feature or fix: Fix the confirmed code-review findings and restore full verification health.
- Primary actors: Dashboard operators, webhook/cron system triggers, service-role backed server actions, test runner.
- Core invariant: Service-role paths must not mutate or expose cross-brand/cross-flow data unless the caller is authorized and the request carries the relevant ownership filter.
- Previous intended behaviours: SendPulse webhooks remain token-gated and idempotent; local development can still use the dashboard; existing flow draft schema/version checks remain intact; generated DB types and shipped migrations are not edited.
- Unsafe outcomes: Open production dashboard mutation endpoints, cross-brand email asset archive, dropped lead event rows on partial duplicate batches, optional email config crashing unrelated routes, stale tests hiding regressions.
- Current evidence: Review findings from `src/proxy.ts`, `src/lib/supabase/proxy.ts`, `src/app/dashboard/flows/[flowId]/actions.ts`, `src/lib/services/email-assets.ts`, `src/lib/config.ts`, `src/lib/services/lead-event.ts`; final `npm test` passed with 94 files and 976 tests; final `npm run type-check` passed; final `npm run lint` passed with warnings only; Next.js docs in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` and `01-app/02-guides/data-security.md`.
- Assumptions: Production dashboard should remain protected even if platform-level protection is missing; local development may stay open when dashboard basic auth env vars are absent; no DB migration is needed.
- Out of scope: Replacing dashboard auth with Supabase Auth, changing shipped migrations, regenerating `src/types/database.ts`, deploying, or live data backfills.

## Risk Classification

- Overall tier: Tier 1
- Why: Permissions, service-role RLS bypass, ownership filters, webhook idempotency, and production dashboard mutations.
- Live-data risk: High if auth/ownership fixes are wrong; implementation is code-only and tested with mocks.
- Migration risk: None expected.
- External-contract risk: Medium for Next.js proxy/server action behavior; local Next.js docs were checked.

## Dependency Graph

| Node                            | Depends on  | Parallel? | Shared-state risk                             | Notes                                                 |
| ------------------------------- | ----------- | --------- | --------------------------------------------- | ----------------------------------------------------- |
| S1 Dashboard auth guard         | None        | No        | Shared proxy/actions                          | Establish repo-local auth helpers and tests.          |
| S2 Email asset ownership        | S1 optional | Yes       | Same actions file as S1 if helper is imported | Add brand/flow archive filter.                        |
| S3 Resend blank config          | None        | Yes       | Config only                                   | Normalize blank optional env vars to null.            |
| S4 Lead-event partial duplicate | None        | Yes       | User-modified file already dirty              | Preserve user changes while fixing batch idempotency. |
| S5 Test health                  | S1-S4       | No        | Shared test suite                             | Repair stale mocks/catalog gaps and run full checks.  |

## Audit Triage

Source artifact: Current chat code-review findings
Audit date: 2026-06-01
Findings reviewed: 4 plus verification failures

| Finding                                                 | Verified against current code?                                       | Disposition  | Reason                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| Dashboard service-role mutations lack repo-local auth   | yes - proxy only refreshes claims; actions use service-role services | sliced as S1 | Tier 1 code-only guard can be added.           |
| Email asset archive lacks brand/flow filter             | yes - action and service accept only assetId                         | sliced as S2 | Tier 1 ownership filter.                       |
| Resend optional config rejects empty env strings        | yes - `npm test` config failures                                     | sliced as S3 | Code-only config normalization.                |
| Lead-event batch insert drops new rows on one duplicate | yes - batch insert swallows any 23505                                | sliced as S4 | Idempotency correction.                        |
| Full test suite failing                                 | yes - 30 failures in `npm test`                                      | sliced as S5 | Some are stale mocks/catalog, one overlaps S3. |

## Progress

| Slice | Status | Tier | Owner | Evidence                                                                                                 | Next gate  |
| ----- | ------ | ---- | ----- | -------------------------------------------------------------------------------------------------------- | ---------- |
| S1    | done   | T1   | Codex | `npx vitest run src/__tests__/proxy.test.ts src/lib/__tests__/dashboard-action-auth.test.ts ...` passed  | full suite |
| S2    | done   | T1   | Codex | Email asset targeted action/service tests passed                                                         | full suite |
| S3    | done   | T2   | Codex | `src/lib/__tests__/config.test.ts` passed in targeted run                                                | full suite |
| S4    | done   | T1   | Codex | `src/lib/services/__tests__/lead-event.test.ts` passed with partial duplicate regression                 | full suite |
| S5    | done   | T2   | Codex | `npm test` passed 94 files / 976 tests; `npm run type-check` passed; `npm run lint` passed with warnings | complete   |

## Slices

### S1 - Dashboard Mutation Auth Guard

Status: done
Tier: T1
Type: backend
Actor/trigger: Browser request or Server Action invocation under `/dashboard`.
Action: Enforce repo-local dashboard basic auth in production and expose a shared assertion for Server Actions.
Invariant protected: Service-role mutations are unreachable without configured operator credentials in production.
Intentional behaviour changes: Production `/dashboard` requests without valid basic auth fail; local dev remains open unless credentials are configured.
Previous intended behaviours preserved: `/api/webhooks/**` stays excluded; Supabase session refresh still runs after auth passes.
Unsafe outcomes: Breaking webhooks, allowing production dashboard without auth, relying only on proxy for actions.
Dependencies: None.
Expected files: `src/lib/dashboard-auth.ts`, `src/proxy.ts`, `src/__tests__/proxy.test.ts`, relevant action files.
Write boundaries: Exact files above.
Tests required: Proxy rejects/accepts auth; action helper failure path for at least one server action.
Runtime verification: Not required; no UI layout claims.
Acceptance criteria: Production auth fails closed; local dev fallback documented in tests.
Exit evidence: Targeted tests and full suite.
Parallelization: Single-threaded due shared auth surface.
Blocked on: None.

### S2 - Email Asset Archive Ownership

Status: done
Tier: T1
Type: backend
Actor/trigger: Dashboard operator archives an email asset.
Action: Require `brand` and `flowId` in archive action/service and filter the service-role update by all three identifiers.
Invariant protected: An asset can only be archived through the brand/flow surface it belongs to.
Intentional behaviour changes: Archive calls missing brand/flow are invalid; wrong brand/flow affects no rows.
Previous intended behaviours preserved: Existing UUID validation, soft-delete semantics, list/upload behavior.
Unsafe outcomes: Cross-brand archive; hard-deleting storage; editing migrations/types.
Dependencies: None, but shares actions file with S1.
Expected files: `src/lib/services/email-assets.ts`, `src/lib/services/__tests__/email-assets.test.ts`, `src/app/dashboard/flows/[flowId]/actions.ts`, `src/app/dashboard/flows/[flowId]/__tests__/email-asset-actions.test.ts`, `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/email-asset-uploader.tsx` if caller shape requires it.
Write boundaries: Exact files above.
Tests required: Service update includes id+brand+flow_id; action validates and delegates all fields.
Runtime verification: Not required; backend contract only.
Acceptance criteria: Ownership filters are asserted in tests.
Exit evidence: Email asset targeted tests pass.
Parallelization: Can run after S1 if actions file changed.
Blocked on: None.

### S3 - Optional Email Config Blank Normalization

Status: done
Tier: T2
Type: backend
Actor/trigger: Any route reading Resend config while env vars are unset or blank.
Action: Normalize blank optional `RESEND_*` strings to `null` before Zod parsing.
Invariant protected: Optional integration config cannot crash unrelated routes.
Intentional behaviour changes: Empty strings behave like absent vars; malformed non-empty values still throw.
Previous intended behaviours preserved: Valid config values pass; invalid emails fail when non-empty.
Unsafe outcomes: Silently accepting malformed non-empty email config.
Dependencies: None.
Expected files: `src/lib/config.ts`, `src/lib/__tests__/config.test.ts` if needed.
Write boundaries: Exact files above.
Tests required: Existing config tests.
Runtime verification: Not required.
Acceptance criteria: Config tests pass.
Exit evidence: Targeted config tests pass.
Parallelization: Parallel-safe.
Blocked on: None.

### S4 - Lead Event Partial Duplicate Idempotency

Status: done
Tier: T1
Type: backend
Actor/trigger: SendPulse webhook retry or Claude tool batch persistence.
Action: Persist non-duplicate lead event rows even when one tool_use_id already exists.
Invariant protected: Webhook retries do not create duplicates and do not drop new events.
Intentional behaviour changes: Batch duplicate conflicts become per-row duplicate ignores.
Previous intended behaviours preserved: Empty input no-ops; invalid input no DB call; non-duplicate DB errors are logged and return inserted 0.
Unsafe outcomes: Duplicate analytics rows, dropped lead event rows, masking non-unique DB failures.
Dependencies: None.
Expected files: `src/lib/services/lead-event.ts`, `src/lib/services/__tests__/lead-event.test.ts`.
Write boundaries: Exact files above; preserve user-authored changes.
Tests required: Partial duplicate regression plus existing lead-event tests.
Runtime verification: Not required.
Acceptance criteria: New regression proves ignore-duplicates behavior for mixed batches.
Exit evidence: Lead-event targeted tests pass.
Parallelization: Parallel-safe but file is already dirty; keep single owner.
Blocked on: None.

### S5 - Full Verification Health

Status: done
Tier: T2
Type: verification
Actor/trigger: Developer/CI.
Action: Repair stale failing tests/catalog mocks created by the above changes or already present in current suite.
Invariant protected: Full suite is meaningful and green without weakening assertions.
Intentional behaviour changes: None unless covered by prior slices.
Previous intended behaviours preserved: Existing route coverage and mock behavior remain strict.
Unsafe outcomes: Deleting assertions to pass tests; editing generated files; hiding failures.
Dependencies: S1-S4.
Expected files: Test files and small support helper/catalog files only as failures dictate.
Write boundaries: Bounded by failing test evidence.
Tests required: `npm test`, `npm run type-check`, targeted lint.
Runtime verification: Not required unless UI implementation changes are introduced.
Acceptance criteria: Full automated checks pass or any residual failure is documented as blocked with exact cause.
Exit evidence: Command outputs recorded here.
Parallelization: Single-threaded.
Blocked on: None.

## Verification Gates

- Automated checks: `npm run type-check`, `npm test`, targeted Vitest files for changed domains, targeted ESLint.
- Runtime checks: None planned; no visual/UI layout claims.
- Migration checks: Confirm no migration/type-generation edits.
- Security/auth checks: Production proxy auth tests plus Server Action guard tests.
- Observability/audit checks: Preserve existing console logging; no new secret logging.

## Subagent Plan

No subagents. The work touches shared auth/actions and an already-dirty user file, so a single owner is safer.

## Update Rules

- Move one slice to `in_progress` before editing it.
- Mark `done` only after exit evidence is recorded.
- Add any newly discovered required work as a new slice.
- Do not edit `src/types/database.ts` or shipped migrations.
