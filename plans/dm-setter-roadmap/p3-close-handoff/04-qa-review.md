# P3.04 — QA review

Manual smoke checklist for the close-sync drill-down filter. Run these
after the stacked PRs (P3.01 + P3.02 + P3.03 + P3.04) all merge to
preview, with at least 5 leads in the database covering the four sync
states (`sent`, `failed`, `failed_permanent`, `pending`, `skipped`,
plus a few conversations with no lead row).

## Direct URL navigation

- [ ] Visit `/dashboard/conversations?closeSyncStatus=sent`. The list
      shows only conversations whose lead is `close_sync_status='sent'`.
      The dropdown reads "Sent to Close". The chip "Close: Sent to
      Close" is visible next to the count.
- [ ] Visit `/dashboard/conversations?closeSyncStatus=failed`. The list
      shows conversations with `failed` OR `failed_permanent` leads.
- [ ] Visit `/dashboard/conversations?closeSyncStatus=pending`. The list
      shows ONLY pending leads with `close_sync_attempts > 0`. (Drop a
      lead with `pending` + 0 attempts into the seed data; verify it is
      excluded from this view but appears in `not_synced`.)
- [ ] Visit `/dashboard/conversations?closeSyncStatus=not_synced`. The
      list shows conversations with no lead row, with `skipped`, or with
      `pending` + 0 attempts.
- [ ] Visit `/dashboard/conversations?closeSyncStatus=any`. Identical to
      `/dashboard/conversations` (no filter) — full inbox.
- [ ] Visit `/dashboard/conversations?closeSyncStatus=garbage`. Param
      ignored (Zod safety net). Inbox renders normally; URL still has
      `closeSyncStatus=garbage` until the operator interacts.

## Click-through from the dashboard tile (P3.03 → P3.04)

- [ ] On `/dashboard`, click the "Sent to Close" tile body.
      Lands on `/dashboard/conversations?closeSyncStatus=sent&from=<iso>&to=<iso>`.
- [ ] The chip shows "Close: Sent to Close".
- [ ] The date-range inputs show YYYY-MM-DD values matching the tile's
      ISO timestamps (e.g. `from=2026-04-27T00:00:00.000Z` becomes
      `2026-04-27` in the date input).
- [ ] The conversation list is filtered to synced rows in that window.

## Dropdown interactions

- [ ] Open the new dropdown. Five options visible: "All sync states",
      "Sent to Close", "Failed", "Pending retry", "Not synced".
- [ ] Select "Failed". The URL updates to `?closeSyncStatus=failed`.
      List refreshes. Chip appears.
- [ ] Select "All sync states". Chip disappears. URL drops the
      `closeSyncStatus` param. List repopulates.

## Chip clear (`×`)

- [ ] Click the chip's `×` button. URL drops the `closeSyncStatus`
      param. Dropdown resets to "All sync states". List repopulates.
- [ ] Tab to the chip's `×` button (keyboard reachable). Press Enter or
      Space — same behaviour as click.
- [ ] Screen reader announces "Clear Close sync filter" on the `×`
      button (verify with VoiceOver or NVDA).

## Filter composition

- [ ] Combine `closeSyncStatus=sent` with `status=completed`. Both
      filters apply server-side. The list narrows correctly.
- [ ] Combine `closeSyncStatus=sent` with the date-range from the tile.
      Both filters apply.
- [ ] Combine `closeSyncStatus=sent` with `q=<search-term>`. Search +
      filter compose correctly.

## Accessibility

- [ ] Dropdown is reachable via Tab.
- [ ] Dropdown has visible focus ring.
- [ ] Chip's `×` is reachable via Tab and shows a focus ring.
- [ ] Light theme; no dark mode tokens introduced.
- [ ] No reflow / layout shift on filter change (the inbox enters a
      "Loading…" state, then re-renders the list).

## Edge cases

- [ ] No leads at all in the database — `closeSyncStatus=sent` returns
      an empty list with the existing "No conversations match those
      filters." copy. No 500.
- [ ] All leads are `pending` with 0 attempts —
      `closeSyncStatus=pending` returns empty (correct);
      `closeSyncStatus=not_synced` returns the full set (correct).
- [ ] Operator pastes a malformed timestamp like `?from=NaN`. The date
      input renders empty; the action's Zod schema rejects the value
      and the inbox renders empty. No console errors.

## Pagination correctness gate

This is the spec's hardest acceptance criterion. Already covered by the
unit test `pagination correctness — '$filter' returns the EXACT count
even when paginated` in `conversation-viewer.test.ts`, but worth
spot-checking on real data:

- [ ] Seed 30 conversations split 60/40 between `sent` and `failed`.
      Open `/dashboard/conversations?closeSyncStatus=sent`. The list
      contains exactly the synced subset; count matches the dashboard
      tile's "Sent to Close" number for the active window.

## Regression checks

- [ ] Existing search filter still works (no regression).
- [ ] Existing `from`/`to` date filter still works.
- [ ] Existing status filter (`active`/`stalled`/`completed`) still works.
- [ ] Existing scope filter (`flow`/`all`) still works.
- [ ] Visiting `/dashboard/flows/[flowId]` (the embedded inbox surface)
      shows the new dropdown too — same component.
