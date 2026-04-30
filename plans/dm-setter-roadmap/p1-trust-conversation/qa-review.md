# P1.01 — Manual QA review

Branch: `feat/p1-01-limitations-labels`

## Browser walkthrough (after `npm run dev`)

For each route, confirm a SurfaceBadge is visible in the header region with the
right colour and the right detail copy on hover/focus.

- [ ] `/dashboard` — Orange "Under construction" badge in the top-right of the
      title row. Hover shows: "Active and today counts are real. Close-sync
      KPIs and longer-range trends are still being wired up."
- [ ] `/dashboard/conversations` — Grey "Read-only" badge inline with the Inbox
      header. Hover: "You can search, filter, and inspect every real
      conversation here. Editing replies and statuses lands later."
- [ ] `/dashboard/conversations/<any id>` — Grey "Read-only" badge in the top
      bar between the back link and the prompt-version note. Hover: "The full
      transcript and tool calls are real. Sending replies or editing the
      timeline from here lands later."
- [ ] `/dashboard/marketing-sources` — Green "Live" badge beside the
      Conversations link. Hover: "Creating, archiving, and copying SendPulse
      setup values all run against production data."
- [ ] `/dashboard/flows` — Grey "Read-only" badge beside the page title. Hover:
      "The flows list shows what is configured today. We support a single flow
      right now; click through to inspect it."
- [ ] `/dashboard/flows/ig-organic-dm` (Flow tab) — Grey "Read-only" badge
      beside the Draft/Runtime status badges in the BHeader. Hover: "Drafts
      persist, but live Instagram DMs still use the production prompt. The
      publish path lands later."
- [ ] `/dashboard/flows/ig-organic-dm` → Bot tab — Grey "Read-only" badge in
      the eyebrow row. Hover: "Persona and guardrails read from the active
      prompt. Editing them in this tab lands later."
- [ ] `/dashboard/flows/ig-organic-dm` → Variables tab — Grey "Reference only"
      badge in the eyebrow row. Hover: "Saved values and where the bot learns
      them. Editing variables from here lands later."
- [ ] `/dashboard/flows/ig-organic-dm` → Versions tab — Grey "Read-only" badge
      in the eyebrow row (same flow-detail copy).

## A11y spot-checks

- [ ] Tab into each page; the badge takes focus appropriately and
      `aria-describedby` exposes the detail copy in a screen reader (verify
      with VoiceOver: VO+arrow keys → reads label then detail).
- [ ] Title-only fallback: hover the badge with a mouse; the detail appears as
      a native tooltip.
- [ ] Colour contrast (AA): badge tone tokens reuse the existing Chip
      palette which is already AA-compliant.

## Light-theme + persona constraints

- [ ] No badges use a dark surface. Confirm Linear/Vercel/Stripe-style soft
      pastel pills throughout.
- [ ] No "Week N" wording anywhere in display or detail copy (also covered by
      automated test).
- [ ] No bot-name leaks ("Mike", "Anthony") in detail copy — copy is generic.

## Regression

- [ ] Compile-block contract test green (`npx vitest run
    src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`).
- [ ] Existing flow-builder StatusBadge / StatusNote unchanged (different
      concept: runtime state, not surface scope).
