# P5.03 Weekly performance summary card — QA review

## Manual verification

- [ ] Open `/dashboard` (logged in). The "This week" card renders between
      the existing KPI tiles and the Recent conversations list.
- [ ] Date range label reads "Apr 27 - May 3" (or whichever week today falls
      in, in Adelaide time).
- [ ] Funnel reads `<dms> DMs → <qualified> qualified → <booked> booked → <toClose> to Close`.
- [ ] Headline rate reads `X.X% DM → Close` with one decimal.
- [ ] If last week had any DMs, the WoW chip shows `+/-Xpp`. Tone matches:
      green up arrow, red down arrow, neutral flat.
- [ ] If last week had zero DMs, the WoW chip is hidden.
- [ ] Sparkline shows 7 bars Mon → Sun. Height of each bar is proportional
      to that day's DM count. Days with zero get a 1px floor so they remain
      visible.
- [ ] If `leads.close_crm_id` is null network-wide for the last 14 days, an
      info chip "Close handoff coming soon — see Settings." is visible
      under the card. Once any `close_crm_id` is non-null in the last 14d
      the chip disappears automatically.
- [ ] Empty-state copy "Quiet week so far. New DMs will appear here."
      appears when current week has zero DMs (and there's a previous-week
      headline if available).
- [ ] Tooltip on the headline rate explains: "Percentage of this week's DMs
      that have been pushed to Close CRM as a lead."
- [ ] Keyboard: focusable elements get a visible focus ring; Tab order is
      sensible. Sparkline has `aria-label="Daily DMs Mon through Sun"` and
      a visually-hidden table fallback for screen readers.
- [ ] Light theme only — no dark variants.

## Browser/devices

- [ ] Chrome desktop (1440×900): card spans full width of the dashboard
      grid. Funnel arrow chevrons readable.
- [ ] Mobile (390×844): funnel wraps gracefully; sparkline scales down.

## Regression

- [ ] Existing Metrics + Activity still render correctly.
- [ ] `npm run test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `compile-block.contract.test.ts` byte-identical (we did not touch
      prompt assembly — verify it's still green).
