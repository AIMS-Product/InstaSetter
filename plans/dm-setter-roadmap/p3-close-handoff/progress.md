# P3.01 — Close CRM handoff: progress

| Wave | Title                                       | Status | RED | GREEN | REFACTOR | Commit  |
| ---- | ------------------------------------------- | ------ | --- | ----- | -------- | ------- |
| 1    | Schema migration + database.ts type updates | DONE   | n/a | yes   | n/a      | d664a4d |
| 2    | Close env schema + getCloseConfig + tests   | DONE   | yes | yes   | yes      | b7ac528 |
| 3    | flagOn helper + ins_feature_flags reader    | DONE   | yes | yes   | yes      | 4d1a7ad |
| 4    | Pure buildCloseLeadPayload + tests          | DONE   | yes | yes   | yes      | 2a68eaf |
| 5    | Close HTTP client (search + push) + tests   | DONE   | yes | yes   | yes      | aeec571 |
| 6    | syncLeadToClose orchestrator + tests        | DONE   | yes | yes   | yes      | b5cb8c2 |
| 7    | engine.ts routeLeadEvents wiring + tests    | DONE   | yes | yes   | yes      | 5a649e0 |
| 8    | hourly retry cron + vercel.json + tests     | DONE   | yes | yes   | yes      | a418a2e |
| 9    | tsc clean-up                                | DONE   | n/a | yes   | yes      | 38309db |

## Test totals

- 463 vitest tests pass across the full suite (was 416 before; 47 new tests
  added in this PR distributed across 5 new test files plus extension to
  existing engine-route tests).
- `compile-block.contract.test.ts` (33 tests) remains green — sacred guard.
- `npm run type-check` clean.
- `npm run build` produces a Vercel-ready `.next/` with the cron route
  registered.
- `npm run lint` clean (15 pre-existing warnings, none from this PR).

## Coordination notes for the user

### `ins_feature_flags` table overlap with P2.02

The migration `supabase/migrations/20260503000000_close_sync_columns.sql`
creates `public.ins_feature_flags` using `create table if not exists`. The
P2.02 spec also creates this table. Both migrations carry the same shape
(key, scope, scope_id, enabled, updated_by, updated_at, created_at) so
whichever lands first wins; the second is a no-op.

If P2.02 lands FIRST: this migration's `if not exists` skips the table
create. The seeded `close_sync.enabled` row still inserts (separate
statement). Done.

If P3.01 lands FIRST: this migration creates the table. P2.02's migration
should also be `create table if not exists` so it skips on second run. If
P2.02's migration is hard-create (no `if not exists`) the user will need
to coordinate the order, OR the second-to-land migration should be edited
to use `if not exists` before merge.

### FR-2(a) capture_email + qualify trigger path

FR-2 in the spec contemplates pushing to Close on capture_email when
qualify_lead has fired earlier in the same conversation. v1 anchors only
on `generate_summary` because that is the only tool call where a
`leads` row exists — `capture_email` and `qualify_lead` only update the
`contacts` row.

The capture-on-email path needs a separate spec that either:

1. Upserts a partial `leads` row at `qualify_lead` time (and again at
   `capture_email`), then syncs to Close on each.
2. Decouples Close-sync from the `leads` table and writes to Close
   directly when both signals are seen on the contact, persisting the
   `close_crm_id` on the contact instead.

Today's implementation honours FR-2(c) only ("`generate_summary` fires
with `qualification_status` ∈ {`hot`, `warm`}" — cold is skipped inside
the orchestrator).

### Worktree-specific quirks

The `.husky/pre-commit` hook in the worktree was not executable — the
hook auto-skipped on the first commit and installed itself on the second
commit (lint-staged + prettier ran). All later commits ran the full
hook chain (eslint + prettier).

`.env.local` was not present in the worktree on a clean checkout — it
lives in the parent repo. `npm run build` succeeded once `.env.local`
was symlinked / copied. Tests do not require it (vitest uses
`vi.stubEnv` and module mocks).

## Manual / live tasks gated on the user

These are not blockers for merging. They block flipping
`close_sync.enabled` to `true` for VendingPreneurs in production.

1. Confirm Sofia's Close plan tier supports the Advanced Filtering API
   (`POST /api/v1/data/search/`). The plan-tier requirement is **not
   documented** at https://developer.close.com/api/resources/advanced-filtering
   (verified 2026-04-29). If the plan does not support it, fall back to
   `GET /api/v1/lead/?query=email_address:{email}` (would need a
   follow-up code change).
2. Provision the Close API key (`CLOSE_API_KEY`) on Vercel for prod (and
   ideally a separate dev-org key for `preview` + `.env.local`).
3. Create the 10 custom fields in Close UI (per spec), capture the
   `lcf_xxx` IDs, and JSON-encode them into `CLOSE_CUSTOM_FIELD_IDS`.
4. Get the new-lead status ID from Close (`stat_xxx`) and set
   `CLOSE_LEAD_STATUS_NEW_ID`.
5. Provision a 32-byte hex `CLOSE_CRON_SECRET` and set on Vercel prod
   (the route returns 401 without it — including against Vercel Cron's
   own pings).
6. Once 1-5 are confirmed, run the cutover SQL on prod Supabase:
   ```sql
   UPDATE public.ins_feature_flags
      SET enabled = true,
          updated_by = '<operator-email>',
          updated_at = now()
    WHERE key = 'close_sync.enabled'
      AND scope = 'brand'
      AND scope_id = 'VendingPreneurs';
   ```
   Effect lands within 60s (the flagOn cache TTL).

## Decisions made during implementation

1. **Trigger anchor: generate_summary only.** See "FR-2(a)" note above.
2. **flagOn lives in `src/lib/services/feature-flags.ts`.** P2.02 / P2.04
   were not yet merged, so this PR creates the helper with a 60s TTL
   in-process cache. They will reuse it.
3. **Two service files for Close** — `close-crm.ts` (public surface,
   ~200 LOC) and `close-crm-http.ts` (retry + auth + header parsing,
   141 LOC). Splitting them keeps each under the 300 LOC code-quality
   cap and isolates the retry policy for unit testing.
4. **Cron uses GET, not POST** — per the recently-patched Vercel cron
   convention.
5. **vercel.json is created here.** P2.04 spec calls itself the
   canonical creator; since P2.04 has not yet landed, this PR ships the
   first cron entry. P2.04 will append on its own merge. JSON-with-
   comments was rejected (not valid JSON) in favour of letting P2.04
   append cleanly.
6. **Cold leads are skipped inside the orchestrator,** not at the
   engine call site. The engine just hands the new lead id over; the
   orchestrator owns the full skip policy. Easier to extend later
   without touching engine.ts.
7. **All Close calls are mocked** (`vi.fn` on `fetch` / on
   `pushLeadToClose`). No live Close calls in any test path.
