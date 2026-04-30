# P5.03 Weekly performance summary card — Progress

**Branch:** `feat/p5-03-weekly-summary` (stacked on `feat/p5-01-utm-tracking`)
**Spec:** `/plans/dm-setter-roadmap/p5-attribution/03-weekly-summary.md` (in companion worktree)
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385055115345

## Plan

Build a server-rendered "This week" summary card on `/dashboard` showing Mon-Sun
funnel (DMs, qualified, booked, sent to Close), the headline `DM → Close %`
rate, week-over-week pp delta, and a 7-bar inline SVG sparkline of daily DM
counts. Brand timezone defaults to `Australia/Adelaide` with a TODO for the
future `getBrandConfig()` knob (open question 18 in the Flow Builder README).

The card surfaces a graceful "Close handoff coming soon" info chip while
Phase 3 is unshipped (no `leads.close_crm_id` populated in the last 14 days).

## Steps

1. RED: tests for `formatPercent`, `formatPpDelta`, `formatDateRange` shared
   helpers in `src/lib/format.ts`.
2. GREEN: implement helpers.
3. RED: tests for `getWeeklyFunnelSummary()` in
   `src/lib/services/weekly-summary.ts` — boundary math (frozen Date), funnel
   counts, WoW deltas, daily DMs vector, `closeHandoffShipped` flag,
   empty-state.
4. GREEN: implement service. Use direct ad-hoc Postgres SELECTs against
   conversations + leads + lead_events. No Postgres function or view (the
   companion `02-creative-funnel.md` view is not assumed shipped).
5. RED: tests for `Sparkline` (inline SVG) — proportional heights, max-zero
   edge, aria-label.
6. GREEN: implement Sparkline.
7. RED: tests for `WeeklySummaryCard` — headline, WoW chip, sparkline,
   empty-state, Close info chip.
8. GREEN: implement card.
9. Wire into dashboard page with Suspense + skeleton.
10. type-check + tests + lint, all green.
11. Commit, push, open PR (base = `feat/p5-01-utm-tracking`).

## Status

Implementation complete. 30 new test cases, all green; full suite (452
tests across 45 files) green; type-check + lint clean (0 new warnings);
build green with stub env vars. PR open at base
`feat/p5-01-utm-tracking`.
