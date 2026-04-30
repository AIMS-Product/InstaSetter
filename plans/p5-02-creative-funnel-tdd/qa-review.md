# P5.02 — Creative-level downstream funnel · QA review

Manual / browser verification checklist. Run after the migration lands and the deploy is up.

## Pre-flight (CI green)

- [ ] `npm run type-check` exits 0.
- [ ] `npm run lint` exits 0 with no new errors (pre-existing warnings ok).
- [ ] `npm test` — full suite green; `compile-block.contract.test.ts` is byte-identical.
- [ ] `npm run build` — `/dashboard/reports/creatives` shows as `ƒ` (dynamic).

## Migration

- [ ] `supabase db reset` → `supabase migration up` runs cleanly through
      `20260505010000_creative_funnel_view.sql`.
- [ ] `SELECT * FROM v_creative_funnel LIMIT 5;` returns rows whose `started_at` matches
      `conversations.started_at` for the same id.
- [ ] No rows where `conversations.is_test = true` appear in the view.
- [ ] `EXPLAIN SELECT * FROM v_creative_funnel WHERE started_at > '2026-04-01';` shows the
      conversations index in the plan (no full sequential scan over messages or events).

## Page render

- [ ] `/dashboard/reports/creatives` loads. Header renders the date-range label
      ("Last 30 days" by default) + total DM count + "refreshed every minute" stamp.
- [ ] All seven columns render headers: Source, DMs, Qualified, Booked, Sent to Close,
      Q→DM, Book→DM, Close→DM.
- [ ] Each header has a tooltip ("hot or warm only", "share of DMs that booked", etc.).
- [ ] Default sort is DMs descending. The DMs header has `aria-sort="descending"`.
- [ ] Tie-break on count columns is alphabetical by `source_label`.

## Sort + group + window controls

- [ ] Clicking the Booked header swaps to `sort=booked&dir=desc`. URL updates without a
      full page reload.
- [ ] Clicking the active sort header flips direction (asc ↔ desc).
- [ ] Group-by dropdown — pick `utm_source`. Multiple sources roll up into single rows
      keyed on `utm_source` (e.g. `meta`, `tiktok`).
- [ ] Conversations with NULL `utm_source` appear in `(unattributed)` bucket.
- [ ] Date preset toggle: 7d / 30d / 90d / This month / Last month all change the URL
      and the date label updates.
- [ ] Refresh the page with `?preset=7d&sort=booked&dir=asc&group_by=utm_campaign` —
      the controls reflect the URL state.

## Drill-through

- [ ] Click a row labeled with a real source name. Navigates to
      `/dashboard/conversations?from=YYYY-MM-DD&to=YYYY-MM-DD&source_id=<uuid>`.
- [ ] The conversations list shows only conversations matching that source within the
      date range.
- [ ] Group by `utm_campaign`, click a row. URL ends with `&utm_campaign=<value>`. List
      filters correctly.
- [ ] `(unattributed)` rows are NOT clickable (no link wraps the label).

## Empty states

- [ ] When the date range has zero conversations, the table swaps for an empty-state card
      that links back to Lead Sources.
- [ ] When no conversation has `close_crm_id` set (P3.01 not yet shipped), the
      "Close handoff not yet wired" banner renders above the table AND every Sent-to-Close
      and Close→DM cell renders `—`.
- [ ] When P3.01 ships and a row has `close_crm_id`, the banner disappears for that view
      and the cell shows the integer + percent.

## Accessibility

- [ ] Keyboard navigation: Tab cycles through preset buttons → group-by select →
      column header buttons → row links.
- [ ] Each column header button is focus-visible. Pressing Enter sorts.
- [ ] Help tooltips reachable by Tab; their `aria-label` matches the visible text.
- [ ] WCAG-AA contrast: `#161528` on `#FAFAFB` is well above 4.5:1.
- [ ] No focus traps; `Esc` does nothing destructive.

## Performance

- [ ] At 30k+ conversations, page TTFB is < 800ms (server-side aggregation budget).
- [ ] `creative_funnel.query_ms` log appears with the integer ms taken.
- [ ] No per-row N+1 queries — only the view query + page render.

## Regression

- [ ] `/dashboard/conversations` still works without any of the new query params.
- [ ] `/dashboard/marketing-sources` still creates sources with UTM tagging.
- [ ] `/api/webhooks/sendpulse` continues to extract + persist UTM fields per P5.01 tests.
- [ ] Sentry has no new errors after 1h on the live deploy.
