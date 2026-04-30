# P5.02 — Creative-level downstream funnel · Progress

Tracking file for the implementation of `plans/dm-setter-roadmap/p5-attribution/02-creative-funnel.md`.

## Status

Implementation complete. Branch ready for review.

- Branch: `feat/p5-02-creative-funnel`
- Stacks on: `feat/p5-01-utm-tracking`
- Soft-deps: `feat/p3-01-push-emails-close` (graceful empty-state when `leads.close_crm_id` is universally null)
- Migration timestamp: `20260505010000` (Phase 5 reserved block, after P5.01's `20260505000000`).

## Log

### Setup

- Created branch from `feat/p5-01-utm-tracking` (HEAD `206ca5b`).
- Verified P5.01's UTM columns exist on `marketing_sources` + `conversation_attributions`.
- Confirmed soft-dep: `leads.close_crm_id` already exists in the schema (P3.01 will populate it).

### Schema (RED → GREEN)

- Added migration `supabase/migrations/20260505010000_creative_funnel_view.sql` creating
  `public.v_creative_funnel` (per-conversation grain). Columns: `conversation_id`, `started_at`,
  `source_id`, `source_label`, `channel`, `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `utm_term`, `ad_id`, `ad_set_id`, `is_qualified`, `is_booked`,
  `is_sent_to_close`. Strictly additive — no tables/columns altered.
- View uses `LEFT JOIN LATERAL` to pick the most recent `leads` row per conversation so multiple
  rows-per-conversation never explode the count.
- "Qualified" = `qualification_status IN ('hot', 'warm')` per the spec's hot+warm-only rule.
- "Booked" = EXISTS lead_events row with `tool_name = 'book_call'`.
- "Sent to Close" = `leads.close_crm_id IS NOT NULL` — returns false until P3.01 wires the sync.
- `WHERE c.is_test = false` so test fixtures never pollute the report.
- `GRANT SELECT ON public.v_creative_funnel TO service_role;`
- Manually extended `src/types/database.ts` with the view's `Row` shape (no live Supabase
  CLI in this env).

### Service layer

- `src/lib/services/creative-funnel-types.ts` — pure types + `aggregateFunnelRows()`. Lives
  outside the `'server-only'` module so the client funnel-table can import the row shape and
  `UNATTRIBUTED_KEY`/`UNATTRIBUTED_LABEL` constants.
- `src/lib/services/creative-funnel.ts` — `getCreativeFunnelRows({from, to, groupBy, sort, dir})`
  reads the view, then defers to `aggregateFunnelRows()`. Emits a structured
  `creative_funnel.query_ms` log per spec observability section.
- Group-by buckets: `source` (uses `source_id` as key — labels collide-safe), `utm_source`,
  `utm_medium`, `utm_campaign`, `utm_content`, `channel`. Empty/null UTMs roll up into
  `(unattributed)` so legacy traffic is visible.
- Conversion rates use safe-zero arithmetic: zero-denominator returns `null`, rendered as `—`.
  Never returns NaN, never `0%` for "no data".
- Sort respects null/NaN trailing so a 0-DM source never ranks first on a percent column.

### UI

- New route: `src/app/dashboard/reports/creatives/`
  - `page.tsx` — Server Component, `revalidate = 60`. Reads Next.js 16 Promise-shaped
    `searchParams`, resolves the date window/group/sort, calls the service, hands off to the
    client table.
  - `funnel-table.tsx` — `"use client"` table with sortable headers (`aria-sort`),
    group-by dropdown, date-window preset toggle, drill-through links, and the
    "Close handoff not yet wired" empty-state banner. URL state via `useRouter` +
    `useSearchParams` per CLAUDE.md "prefer URL state for shareable UI".
  - `loading.tsx` — Suspense skeleton.
  - `error.tsx` — route-level error boundary that logs `creative_funnel.error` and offers
    a retry.
  - `date-window.ts` — preset → `from`/`to` ISO resolver. Presets: 7d / 30d / 90d /
    this_month / last_month / custom.
- `src/components/help-tooltip.tsx` — promoted the inline `HelpTip` pattern from the Lead
  Sources page into a shared primitive. Reused on every report column header.
- `src/components/dashboard-shell.tsx` — added "Reports" nav entry pointing to
  `/dashboard/reports/creatives`. Updated `buildCrumbs()` for the new route.

### Drill-through wiring

- `src/lib/services/conversation-viewer.ts` — `ListConversationsOptions` gained
  `sourceId`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`. Implementation pre-resolves
  matching `conversation_attributions.conversation_id`s, then narrows the conversations query
  via `.in('id', ...)`. Existing `flowId`/`dateFrom`/`dateTo` filters keep working unchanged.
- `src/app/dashboard/flows/[flowId]/actions.ts` — extended `flowRunsFilterSchema` to accept
  the new optional fields.
- `src/app/dashboard/flows/[flowId]/related-pages/page-runs.tsx` — reads `source_id` /
  `utm_*` from `window.location.search` once at mount and passes them into
  `fetchFlowRunsAction`. The URL-replaceState effect preserves them across other filter changes.

### Tests

- `src/lib/services/__tests__/creative-funnel.test.ts` — 9 cases covering the 5-source /
  25-conversation fixture per the spec acceptance criterion. Verifies counts, conversion rates,
  zero-denominator handling, sort directions (incl. null-trailing), and group-by-source /
  group-by-utm_source / group-by-channel.
- `src/app/dashboard/reports/creatives/__tests__/funnel-table.test.tsx` — 8 RTL cases:
  rendering, `aria-sort`, sort-click pushes URL, sort-flip on active column, group-by change,
  drill-through navigation, Close-empty-state em-dashes, no-rows empty state.
- `next/navigation` mocked at module level via `vi.mock('next/navigation', ...)`.

### Verification

- `npm test` — 439 tests passing (was 431 before; +8 service + 8 RTL).
- `npm run type-check` ✅
- `npm run lint` ✅ (15 pre-existing warnings, none introduced).
- `npm run build` ✅ — `/dashboard/reports/creatives` registered as `ƒ` (dynamic).
- `compile-block.contract.test.ts` byte-identical (33 tests pass; this task does not touch
  prompt assembly).

### Out of scope (kept out per spec)

- CSV export — explicitly removed from spec scope.
- Real-time / streaming updates.
- Cross-channel rollups (TikTok, email).
- A/B variant comparison.
- Custom date input fields — preset row is shipped; the custom preset reads `from`/`to` from
  the URL but the UI only exposes presets in v1. Custom date pickers come in a follow-up.

### Notes for the reviewer

- `src/types/database.ts` was hand-extended to add the `v_creative_funnel` view shape.
  In CI/main this should be regenerated via `supabase gen types typescript --project-id
grkpgfphwqsawinsdbtc > src/types/database.ts` after the migration lands. The shape is
  trivially small so the regen will be additive.
- The mission text mentioned "React Query on the client for cache + revalidation". `react-query`
  is not a dependency of this project. The page uses Next.js's built-in `revalidate = 60` plus
  `useTransition` for non-blocking URL transitions — the `pending` state gives the user the same
  visible cache-during-fetch UX. If RQ is later added, swapping the data source is a
  one-component change.
