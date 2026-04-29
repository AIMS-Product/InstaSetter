# QA review: P3.01 — Close CRM handoff

This QA pass is unit/integration-test driven. No live Close calls
happen anywhere — the spec explicitly forbids hitting live Close from
test paths, and the per-brand `close_sync.enabled` flag stays OFF on
merge so production traffic remains unchanged.

For the live smoke verification (real Close sandbox), see the
"Manual / live tasks gated on the user" section in `progress.md`.

---

## 1. Schema migration (additive only)

**Commit**: `d664a4d` | **Type**: schema | **Status**: Verified

### Steps to test

1. With Supabase CLI running locally, run `supabase db reset`.
2. Confirm migration `20260503000000_close_sync_columns.sql` applies
   without error.
3. `psql` and verify:

   ```sql
   SELECT column_name FROM information_schema.columns
    WHERE table_name='leads' AND column_name LIKE 'close_sync_%';
   -- expect 4 rows: close_sync_status, close_sync_attempted_at,
   -- close_sync_error_message, close_sync_attempts.

   SELECT * FROM public.ins_feature_flags
    WHERE key='close_sync.enabled';
   -- expect 1 row: scope=brand, scope_id=VendingPreneurs, enabled=false.

   SELECT * FROM pg_indexes
    WHERE indexname='idx_leads_close_sync_status_attempts';
   -- expect 1 row.
   ```

### Expected result

All four columns are present. The seeded flag row is OFF. The partial
index exists.

### Edge cases

- Migration is idempotent — re-running `supabase db reset` succeeds.
- `if not exists` on `ins_feature_flags` means P2.02's migration is
  forward-compatible.

### Preserved behaviors

- `leads.close_crm_id` is unchanged (it already existed).
- All other columns and indexes on `leads` are unchanged.

---

## 2. Close env config (`getCloseConfig`)

**Commit**: `b7ac528` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/__tests__/config.test.ts`.
2. Confirm 13 tests pass (was 7 before; 6 new for getCloseConfig).

### Expected result

- `getCloseConfig()` parses all keys when set.
- `CLOSE_API_KEY` is OPTIONAL (the live-send switch is the per-brand
  ins_feature_flags row, not the env var).
- Trailing `\n` from `vercel env pull` is stripped from `CLOSE_API_KEY`.
- Malformed JSON in `CLOSE_CUSTOM_FIELD_IDS` throws (Zod refinement).
- Non-string values in `CLOSE_CUSTOM_FIELD_IDS` throw.
- An array in `CLOSE_CUSTOM_FIELD_IDS` throws.

### Edge cases

- `CLOSE_BASE_URL` defaults to `https://api.close.com/api/v1` when
  unset.
- Empty `CLOSE_CUSTOM_FIELD_IDS` resolves to `{}`.

### Preserved behaviors

- Existing `getServerConfig`, `getBrandConfig`, `getSendPulseConfig`,
  `getAnthropicConfig`, `getSupabaseServerConfig` are unchanged.

---

## 3. flagOn helper

**Commit**: `4d1a7ad` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/feature-flags.test.ts`.
2. Confirm 7 tests pass.

### Expected result

- Returns `false` when no row exists for the (key, scope, scopeId).
- Returns `true` only when row exists with `enabled=true`.
- Treats query errors as OFF (production safety).
- Caches per (key, scope, scopeId) for 60s.
- Defaults scope to global when no brand provided.

### Edge cases

- A second call within TTL skips Supabase and returns the cached
  result. Different (key, scope, scopeId) re-queries.

### Preserved behaviors

- No previous flag system was in place; this is the only persistent flag
  reader. P2.02 + P2.04 will reuse it.

---

## 4. Pure payload builder

**Commit**: `2a68eaf` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/close-crm-payload.test.ts`.
2. Confirm 11 tests pass.

### Expected result

- Returns the documented Close lead body shape.
- All 10 logical custom fields render under `custom.{lcf_xxx}` keys
  when their IDs are configured.
- Skips logical fields whose IDs are not configured (operator wires
  one field at a time).
- Falls back to tag-derived qualification when the leads columns are
  null.
- Builds the conversation URL as
  `https://insta-setter.vercel.app/dashboard/conversations/{id}`.
- Truncates field values to ≤ 500 chars (Close limit).

### Edge cases

- Missing contact name → `@instagram_handle` becomes the lead name.
- Missing both contact and lead emails → no emails in the payload.
- `attribution: null` omits all three lead*source*\* custom fields.

### Preserved behaviors

- Pure function — no Supabase, no fetch, no env access. Trivially
  reusable from cron + engine + future entrypoints.

---

## 5. HTTP client (search + push)

**Commit**: `aeec571` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/close-crm.test.ts`.
2. Confirm 16 tests pass.

### Expected result

- Basic auth header is `Basic base64(apikey:)` —
  `Basic YXBpX3Rlc3RfeHh4Og==` for `api_test_xxx`.
- Search body matches the documented `has_related contact_email`
  pattern.
- POST `/api/v1/lead/` on no-match (create).
- PUT `/api/v1/lead/{id}/` on match (update).
- Retries 5xx and 429 with exponential backoff up to 5 attempts.
- Honours `retry-after` header on 429; falls back to
  `RateLimit: reset=N` when retry-after is absent.
- Surfaces 4xx (other than 429) as permanent failures immediately.
- Surfaces network errors as transient and retries.
- Returns `missing_api_key` permanent error when `CLOSE_API_KEY` is
  unset.

### Edge cases

- Missing `id` on a 200 create response surfaces as
  `close_response_missing_id` permanent.
- 5 consecutive 5xx → returns `transient: true` with the last status
  code.

### Preserved behaviors

- All Close calls go through this module; engine never imports
  `fetch` directly for Close.

---

## 6. syncLeadToClose orchestrator

**Commit**: `b5cb8c2` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/sync-lead-to-close.test.ts`.
2. Confirm 8 tests pass.

### Expected result

- `flagOn` returns false → marks row `skipped` with reason `flag_off`,
  inserts an `integration_events` row with `integration='close_crm'`,
  status='skipped', error_message='flag_off'. **No Close call is
  made**.
- Successful create → updates leads row with `close_crm_id`,
  `close_sync_status='sent'`, increments attempts, inserts
  `integration_events` with status='success'.
- Permanent failure → updates leads row with `close_sync_status='failed'`,
  error message, increments attempts.
- Transient failure → updates leads row with
  `close_sync_status='failed'` (cron picks it up).
- Cold lead → marks `skipped` with reason `cold_lead`. No Close call.
- No email → marks `skipped` with reason `no_email`. No Close call.
- Lead not found → returns `lead_not_found` permanent.

### Edge cases

- Brand parameter passes through to `flagOn` exactly as `{ brand }`.
- Function never throws — engine fire-and-forget callers rely on this.

### Preserved behaviors

- `leads.close_crm_id` was already present; this is the first writer.
- `integration_events` schema is unchanged; we just write new rows
  with `integration='close_crm'`.

---

## 7. Engine wiring (`routeLeadEvents`)

**Commit**: `5a649e0` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/engine-route.test.ts`.
2. Confirm 15 tests pass (was 11; 4 new for Close wiring).

### Expected result

- After `createLead` succeeds inside the `generate_summary` branch,
  `syncLeadToClose({ leadId })` is fired without await.
- When `createLead` fails, no Close sync is fired.
- For `capture_email` and `qualify_lead` alone, no Close sync is fired
  (no lead row exists yet — see FR-2(a) note in progress.md).
- A rejection from `syncLeadToClose` does NOT propagate; the engine
  still returns `{ success: true, eventsProcessed: 1 }`.

### Edge cases

- All four existing `routeLeadEvents` paths (capture_email,
  generate_summary, qualify_lead, book_call) continue to work
  unchanged.

### Preserved behaviors

- Existing `setContactTags` fire-and-forget pattern matched.
- The bot reply path is unchanged.

---

## 8. Hourly retry cron

**Commit**: `a418a2e` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/app/api/cron/retry-close-sync/__tests__/route.test.ts`.
2. Confirm 8 tests pass.

### Expected result

- Returns 401 when authorization header is missing or wrong.
- Returns 401 when `CLOSE_CRON_SECRET` is unset (cron is never open).
- Queries leads with `close_sync_status='failed'` AND
  `close_sync_attempts < 24`, ordered by `close_sync_attempted_at`,
  limited to 50.
- Calls `syncLeadToClose` for each row and reports counts:
  `{ ok, attempted, succeeded, failed, skipped }`.
- A thrown error from `syncLeadToClose` counts as failed without
  breaking the loop.
- Returns 500 when the leads query fails (with the error message in
  the body).

### Edge cases

- Method is GET (per Vercel cron convention) — not POST.
- `vercel.json` registers the schedule `0 * * * *`.

### Preserved behaviors

- Auth middleware excludes `/api/cron/*` (verified via
  `src/lib/supabase/proxy.ts` matcher — no change to existing
  middleware).

---

## 9. Top-level checks

| Check                            | Status                                              |
| -------------------------------- | --------------------------------------------------- |
| `npm run type-check`             | clean                                               |
| `npm run test`                   | 463 / 463 passing                                   |
| `npm run lint`                   | clean (15 pre-existing warnings, none from this PR) |
| `npm run build`                  | success — `/api/cron/retry-close-sync` registered   |
| `compile-block.contract.test.ts` | 33 / 33 passing (sacred guard)                      |

---

## 10. Manual smoke (gated on user-supplied credentials)

To be performed once the user provisions a Close dev org + API key +
custom field IDs + cron secret. Spec describes the procedure:

1. Set env vars on the preview Vercel deployment using a dev Close
   org's credentials (NEVER prod).
2. Add a row in `ins_feature_flags` with
   `key='close_sync.enabled'`, `scope='brand'`,
   `scope_id='<BrandName>'`, `enabled=true`.
3. POST a SendPulse-shaped event through the simulator with a fresh
   handle.
4. Confirm a Lead appears in the dev Close org with all configured
   custom fields populated.
5. Re-run the same conversation (different message) — confirm Close
   issues a PUT not a POST (the lead's `close_crm_id` stays the
   same).
6. Disable internet on Vercel for that deployment, repeat — confirm
   `close_sync_status='failed'` after 5 attempts and the cron picks
   it up an hour later.
