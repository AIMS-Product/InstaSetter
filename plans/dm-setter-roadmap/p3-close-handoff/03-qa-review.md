# QA review: P3.03 — Close handoff dashboard metric

This QA pass is unit/integration-test driven. The tile renders against
data populated by P3.01's `syncLeadToClose` orchestrator; no live Close
calls happen anywhere. The per-brand `close_sync.enabled` flag stays
OFF on merge (default), so production traffic is untouched and the tile
shows zeros + the "Close sync disabled" footnote until cutover.

For live verification, see "Manual smoke" at the bottom.

---

## 1. `resolveWindowBounds` helper

**Commit**: `26795eb` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/dashboard-metrics.test.ts`.
2. Confirm 6 tests under `resolveWindowBounds` pass.

### Expected result

- `this_week` returns Monday 00:00 UTC of the current ISO week through
  `now`.
- `last_week` returns the prior Monday through this Monday (no overlap).
- `this_month` returns 1st 00:00 UTC of the current month through `now`.
- Sunday and Monday edge cases compute correctly.
- `from < to` always holds.

### Edge cases

- `this_week` on a Monday: same-day start, `now` may be only minutes
  into the week.
- `this_week` on a Sunday: previous Monday, ~7 days ago.
- Pure function, deterministic with injected `now`.

---

## 2. `getCloseHandoffMetric` aggregate

**Commit**: `26795eb` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/dashboard-metrics.test.ts`.
2. Confirm 9 tests under `getCloseHandoffMetric` pass.

### Expected result

- Returns `{ syncedCount, relevantCount, syncedPct, windowFrom,
windowTo, windowLabel, flagEnabled }`.
- `syncedPct` is rounded to the nearest integer.
- `relevantCount === 0` → `syncedPct === 0` (no division by zero).
- `synced === 0` with `relevant > 0` → `syncedPct === 0` (operator
  sees the gap, not an empty state).
- Two parallel `from('leads')` calls — one for synced, one for
  relevant. No N+1, no third query.
- `flagEnabled` reflects `flagOn('close_sync.enabled', { brand })`.

### Edge cases

- Brand override via `options.brand` reaches `flagOn` correctly.
- `now` injection is honoured (deterministic tests).

---

## 3. `<CloseHandoffTile>` component

**Commit**: `dd5a4f8` | **Type**: feature | **Status**: Verified

### Steps to test

1. Run `npx vitest run src/app/dashboard/components/__tests__/close-handoff-tile.test.tsx`.
2. Confirm 8 tests under `CloseHandoffTile` pass.

### Expected result

- Default state: shows `12` + `of 14` + `86%` Chip.
- Empty state (relevant=0): shows "No leads sent yet" instead of the
  ratio. No percentage badge.
- Zero-synced-with-relevant state: `0 of 14 (0%)` — the operator sees
  the gap explicitly.
- Flag-off state: shows the "Close sync disabled" footnote with the
  `close_sync.enabled` flag name in a code block so the operator
  knows the exact toggle.
- Click target: `<a href>` to
  `/dashboard/conversations?closeSyncStatus=sent&from=<iso>&to=<iso>`.

### Edge cases

- `windowLabel` renders below the count even when the dropdown shows
  the same label.
- Empty state still renders the link so the operator can poke around
  the drill-down with no synced data.

### Preserved behaviors

- Existing 4 KPI cards unchanged.
- `Chip` is reused — no new colour tokens.

---

## 4. `<CloseHandoffWindowSelect>` client island

**Commit**: `dd5a4f8` | **Type**: feature | **Status**: Verified

### Steps to test

1. Same vitest run as #3.
2. Confirm 2 tests under `CloseHandoffWindowSelect` pass.

### Expected result

- Selecting a non-default window pushes `?window=<value>` into the URL
  via `router.replace` inside a `useTransition`.
- Selecting `this_week` (the default) strips the `window` param so the
  URL stays clean.
- The `<select>` is keyboard-accessible (label visible to screen
  readers via `sr-only` span + `aria-label`).

### Edge cases

- `disabled` while `useTransition` is pending — operator can't
  double-tap and trigger two replacements in flight.

### Preserved behaviors

- Existing inbox URL-state pattern at `page-runs.tsx` uses
  `window.history.replaceState` (no server re-render). This component
  uses `router.replace` because it's driving a server-rendered tile.
  Distinct patterns for distinct goals.

---

## 5. `/dashboard` page wiring

**Commit**: `dd5a4f8` | **Type**: feature | **Status**: Verified

### Steps to test

1. `npm run build` — confirm `/dashboard` compiles.
2. Visit `/dashboard` in dev (after symlinking `.env.local` and
   `node_modules` into the worktree).
3. Confirm five KPI tiles render in the lg-breakpoint 5-up grid.
4. Pick "Last week" from the dropdown — URL becomes
   `/dashboard?window=last_week` and the count refreshes (server
   re-render).
5. Pick "This week" again — URL strips back to `/dashboard`.
6. Click the "Sent to Close" tile — navigation goes to
   `/dashboard/conversations?closeSyncStatus=sent&from=…&to=…`. P3.04
   will then handle the filter UI; until then, the unrecognised param
   is harmless (the inbox still renders, just unfiltered).

### Expected result

- `searchParams.window` is parsed via `parseWindow` and falls back to
  `this_week` for unknown values.
- The new tile appears alongside Active / Today / 7d / 30d.
- Suspense isolates the tile from the activity list — a slow Close
  metric query won't block the recent-conversations rendering.

### Edge cases

- An unknown URL param like `?window=garbage` resolves to `this_week`.
- An empty database (no leads at all) shows the empty-state copy and
  the operator still sees the dropdown + the click-through link.

### Preserved behaviors

- Existing `<Metrics>` and `<Activity>` Suspense boundaries unchanged.
- `revalidate = 0` on the dashboard route — every load is fresh.
- `getDashboardMetrics()` still runs in parallel with the new
  `getCloseHandoffMetric()` (one `Promise.all`).

---

## 6. Top-level checks

| Check                            | Status                                 |
| -------------------------------- | -------------------------------------- |
| `npm run type-check`             | clean                                  |
| `npm run test`                   | 488 / 488 passing                      |
| `npm run lint`                   | clean                                  |
| `npm run build`                  | success — `/dashboard` route SSR-ready |
| `compile-block.contract.test.ts` | 33 / 33 passing (sacred guard)         |

---

## 7. Manual smoke (gated on populated `leads` data)

To be performed once the predecessor PR (P3.01) merges and at least
one brand has `close_sync.enabled=true` in `ins_feature_flags` on a
preview deploy.

1. Seed (or run) at least 3 conversations through the bot in a test
   brand: at least one with `close_sync_status='sent'`, at least one
   with email captured but `close_sync_status='pending'` (no email →
   not "relevant").
2. Open `/dashboard` — confirm the "Sent to Close" tile renders
   non-zero.
3. Switch the dropdown to "Last week" — confirm the URL becomes
   `?window=last_week` and the count refreshes (likely zeros if you
   just seeded today).
4. Switch back to "This week" — confirm the URL drops the param.
5. Click the tile — confirm navigation to
   `/dashboard/conversations?closeSyncStatus=sent&from=<iso>&to=<iso>`.
   With P3.04 not yet merged, the inbox shows all conversations (the
   param is silently ignored) — that's expected.
6. Run `UPDATE ins_feature_flags SET enabled=false WHERE
key='close_sync.enabled' AND scope_id='<brand>'` — within ≤ 60s
   the tile renders the "Close sync disabled" footnote on the next
   reload.
