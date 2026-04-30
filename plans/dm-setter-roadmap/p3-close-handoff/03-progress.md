# P3.03 — Close handoff dashboard metric: progress

| Wave | Title                                          | Status | RED | GREEN | REFACTOR | Commit  |
| ---- | ---------------------------------------------- | ------ | --- | ----- | -------- | ------- |
| 1    | `resolveWindowBounds` helper + tests           | DONE   | yes | yes   | n/a      | 26795eb |
| 2    | `getCloseHandoffMetric` aggregate + tests      | DONE   | yes | yes   | n/a      | 26795eb |
| 3    | `<CloseHandoffTile>` + window selector + tests | DONE   | yes | yes   | n/a      | dd5a4f8 |
| 4    | Wire tile into `/dashboard` page (5-up grid)   | DONE   | n/a | yes   | n/a      | dd5a4f8 |

## Test totals

- 488 vitest tests pass across the full suite (was 478 before; 10 new
  tests in `__tests__/close-handoff-tile.test.tsx` plus 15 new tests in
  `__tests__/dashboard-metrics.test.ts`).
- `compile-block.contract.test.ts` (33 tests) remains green — sacred guard.
- `npm run type-check` clean.
- `npm run lint` clean.
- `npm run build` produces a Vercel-ready `.next/` (5 routes including
  `/dashboard`).

## Architecture decisions

1. **Server component for the tile, client island for the selector.**
   `<CloseHandoffTile>` is a server component — receives the metric +
   window prop from the parent page. The window-selector dropdown is a
   tiny `<CloseHandoffWindowSelect>` client island that calls
   `router.replace` inside a `useTransition`. The parent server
   component automatically re-renders with fresh metrics because the
   URL search param changed. No useEffect / no client fetch.
2. **URL state via `next/navigation` `useRouter().replace`.** The spec's
   "URL state pattern" reference (`page-runs.tsx`) uses
   `window.history.replaceState` directly, but that does NOT trigger a
   server re-render — only the local component state updates. For a
   tile whose data is server-rendered, `router.replace` is the correct
   tool. Default value (`this_week`) is stripped from the URL to keep
   it clean.
3. **Single Postgres round-trip per branch.** The aggregate runs two
   `count` queries (`close_sync_status='sent'` and `email is not null`)
   in parallel via `Promise.all` plus a `flagOn` read. No JS post-
   filtering. The partial index from P3.01
   (`idx_leads_close_sync_status_attempts`) covers the synced branch;
   the `email is not null` filter scans the leads table heap with the
   created_at range as the leading predicate.
4. **`flagEnabled` is read alongside the counts** so the operator sees
   the "Close sync disabled" footnote without a second round-trip from
   the tile component. The flag value comes from `flagOn` which has a
   60s in-process cache, so this is effectively free after the first
   request.
5. **ISO-week alignment (Monday 00:00 UTC).** "Week" starts Monday in
   ISO 8601 — matches the spec's FR-2 and the closer-team weekly cycle.
   `resolveWindowBounds` is pure and accepts an injected `now`, so
   tests are deterministic.
6. **Empty-state copy: "No leads sent yet".** Spec called for graceful,
   not loud. The empty state appears only when `relevantCount === 0`
   (no emails captured at all in the window). When `relevantCount > 0`
   but `syncedCount === 0`, the operator sees `0 of 14 (0%)` so the
   gap is explicit.
7. **Click-through is the entire tile body** (not just the count).
   `<Link>` wraps the count + ratio + window label. Empty state still
   renders the link so the operator can reach the drill-down even when
   there's nothing to see in the window.
8. **5-up at `lg`, 2-up below.** Existing tiles use `grid-cols-2 sm:grid-cols-4`.
   This PR moves the breakpoint to `lg:grid-cols-5` so the 5th tile
   only joins the row when there's enough horizontal space; smaller
   screens get a clean 2-up wrap with the new tile flowing onto its
   own row.

## Worktree-specific quirks

The worktree had no `node_modules/` and no `.env.local` on a clean
checkout. Both were addressed by symlinking from the parent repo:

```bash
ln -s ../../../node_modules node_modules
ln -s ../../../.env.local .env.local
```

`vitest` was unable to resolve `server-only` imports (the package isn't
installed — it's a Next.js runtime guard). Added an alias in
`vitest.config.ts` mapping `server-only` to a tiny empty stub at
`src/test/server-only-stub.ts`. This is precedent-setting for any
future spec test that imports a service module that uses the guard
(currently `dashboard-metrics.ts`, `conversation-viewer.ts`,
`marketing-sources.ts`, `flow-drafts.ts`, `flow-runtime.ts`).

## Coordination notes

### URL contract for P3.04

The tile's drill-down link emits:

```
/dashboard/conversations?closeSyncStatus=sent&from=<iso>&to=<iso>
```

P3.04 receives this contract. Spec confirmed in
`plans/dm-setter-roadmap/p3-close-handoff/04-drill-down.md` (FR-1, FR-2).
The `from` / `to` are URL-encoded ISO timestamps; P3.04's `<select>`
will need to handle them as the seed value for the date-range filter.

### `windowLabel` field

The metric returns a `windowLabel` so the tile can render the active
window without re-resolving it client-side. P3.04 may want this too,
but its date inputs render the bounds directly — so we don't expose
`windowLabel` on the URL.

### Locale / timezone

The aggregation is UTC. The tile's `windowLabel` ("This week", "Last
week", "This month") is locale-neutral. Operators in non-UTC timezones
see UTC bounds — the spec notes this is acceptable for v1, and that a
future tooltip with the operator-local-time can land later.

## Open follow-ups (not blockers)

1. Sparkline / trend visualisation. P3.03 spec deferred to P5
   attribution. No code changes here.
2. Per-closer attribution. Deferred — depends on P3.01 setting
   `assigned_to_user_id`.
3. "Today" window option. Spec lists three; if Sofia asks for a
   fourth, add it via the `WINDOW_LABELS` map and the URL parser.
4. Tooltip showing UTC bounds explicitly (spec risks table). Cheap to
   add; deferred until Sofia complains about timezone confusion.

## Decisions deferred to Sofia

(Spec ambiguities — defaults shipped per spec; revisit if she asks.)

1. "This month" = month-to-date (1st 00:00 UTC → now). Confirmed.
2. Default window = `this_week` even on Mondays when it's empty.
   Confirmed.
3. Percentage divisor = "email captured" (not "qualified-and-warm").
   Slight under-statement of sync rate in cold-with-email cases is
   acceptable; documented in tile tooltip when one is added.
