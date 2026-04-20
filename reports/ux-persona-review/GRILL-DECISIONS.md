# Grill Review: UX Persona Review — Fix Triage

Plan: reports/ux-persona-review/UX-REVIEW.md
Date: 2026-04-20
Status: COMPLETE — all 8 round-1 recommendations accepted
Reviewer: Claude · User: James

---

## Context the raw persona reviews didn't have

Signals from the codebase + project memory that calibrate priority:

- **Flow Builder is in-progress v1** per `docs/flow-builder/PLAN.md`. Weeks 1–6 have zero prod impact; week 7 is the first live per-brand cutover. "Preview" and "prototype" copy is factually accurate today.
- **Bot is live** (project memory: `project_bot_paused.md`). The "Live on v12 · 42 convos today" badge is real data, which makes **Publish safety** a real operational risk.
- **No auth gate yet** — not a bug, a staged-rollout decision. Persona findings about "auth / account / workspace switcher" are premature.
- **Target user** is an AIMS operator (sales/ops fluent), not a consumer. Sales vocabulary ("Qualifier", "Handoff", "Prospect") is domain-correct and stays.
- **Near-term audience** is the AIMS team (not the public). Trust-chrome findings (pricing, compliance, DPA, Meta partner) are out of scope until a public launch plan exists.

---

## Round 1 — Decisions

| #   | Topic                         | Decision                                                                                                                                                                                                                      | Scope                                                                       |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Audience calibration          | Treat Flow Builder as AIMS operator-facing within 4 weeks                                                                                                                                                                     | Sets priority: fix operator blockers; defer public trust chrome             |
| 2   | Conversations crash (P0.1)    | Both fixes: set env var now + split config so `listConversations()` doesn't depend on `ANTHROPIC_API_KEY`                                                                                                                     | File: `src/lib/config.ts` — split into `supabaseConfig` / `anthropicConfig` |
| 3   | Pointer-events overlay (P0.2) | Diagnose + patch now                                                                                                                                                                                                          | File: likely `src/app/dashboard/flows/[flowId]/directions/b-stage/*`        |
| 4   | Publish v13 safety (P0.5)     | (a) Confirm dialog now. (b) Diff/rollback bundled with Versions tab build. (c) Audit trail deferred to v2.                                                                                                                    | Only (a) in this pass                                                       |
| 5   | Unicode glyph icons (P0.3)    | One-shot refactor — `<IconButton icon={Edit} label="..." />` with `label` required at the type level, replace all glyphs in a single PR                                                                                       | New component + global replace                                              |
| 6   | Domain jargon (P0.4)          | Keep sales vocabulary (Qualifier, Prospect, Objection Handler); fix dev-speak: "v13" → "Version 13", "convos" → "conversations", "IG Organic DM" → "Instagram DM Flow". Optional tooltips on sales terms for non-sales users. | Copy-only                                                                   |
| 7   | Mobile support (P1.8)         | Gate Flow Builder below 1024px with "requires desktop" screen. Keep Conversations + Dashboard mobile-friendly.                                                                                                                | New breakpoint gate                                                         |
| 8   | Trust chrome (P0.7, P1.11)    | Defer all (footer, pricing, company info, ToS, compliance) until a public launch plan exists                                                                                                                                  | Won't-fix for now                                                           |

---

## Prioritised Fix Queue

### This week — blockers + quick wins

Sequence matters — (1) unblocks further Flow Builder work, (2) unblocks the home page's primary CTA, (3) closes the operational risk on a live bot.

1. **Pointer-events overlay** (decision #3) — diagnose + CSS/z-index fix
2. **Env config split** (decision #2) — split `config.ts`, Conversations loads without `ANTHROPIC_API_KEY`
3. **Publish confirm dialog** (decision #4a) — modal with "this affects N active conversations"

### Next PR — polish pass

4. **IconButton refactor** (decision #5) — `<IconButton label="..." />` + replace every Unicode glyph (`⎔ ◉ ∥ ⟳ ◐ ⤢ ⊞ × − +`)
5. **Jargon copy pass** (decision #6) — v13 → Version 13, convos → conversations, IG Organic DM → Instagram DM Flow
6. **Mobile gate** (decision #7) — "requires desktop" screen below 1024px on Flow Builder

### Bundled with Versions tab build (next flow-builder sprint)

7. **Publish diff + rollback + toast** (decision #4b)
8. **Autosave indicator + dirty pill** (P1.3) — 7/15 personas flagged
9. **Bot status pill** (P1.4) — persistent "Bot: LIVE · N conversations" in top bar
10. **Inspector field labels** (P0.10) — wire `aria-labelledby` on every textarea

### Bigger — dedicated sprints

11. **App shell + nav + breadcrumbs** (P0.6) — `<DashboardShell>` layout component
12. **WAI-ARIA tab pattern + `:focus-visible` global + landmarks** (P1.1, P1.10) — accessibility sprint
13. **Canvas keyboard editing** (P1.15) — WCAG 2.1.1 for drag-drop authoring
14. **Design tokens + shared primitives** (P1.6) — kill inline styles, ship `<Button>` / `<Chip>` / `<Input>`
15. **Dashboard KPIs** (P1.2) — replace placeholder with real bot status + metrics
16. **Toast system** (P2.14) — `useToast` hook + centralised mount

### Won't fix now (deferred until public launch plan)

- Trust chrome (footer, pricing, legal, compliance) — decision #8
- Mobile-responsive Flow Builder — decision #7 (gated instead)
- Auth / workspace switcher / account menu — staged rollout decision

### Won't fix (out of scope or addressed elsewhere)

- Persona-specific tastes (dark mode, emojis, micro-interactions) — P3 personality issues
- Template/import-from-ManyChat (P2.13) — not a stated strategic priority
- Public pricing/marketing page — orthogonal product decision

---

## What shipped this session

| #   | Fix                                       | Status                                    | Files changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | Pointer-events overlay                    | ✅ Shipped + verified in browser          | `src/app/dashboard/flows/[flowId]/directions/b-stage/palette-drawer.tsx` — `left: 12` → `left: 76` so the collapsed drawer stops overlaying PageNav                                                                                                                                                                                                                                                                                                                                           |
| 2   | Env config split                          | ✅ Shipped + tests + verified             | `src/lib/config.ts` (split into `getSupabaseServerConfig` / `getAnthropicConfig` / `getBrandConfig` slices); `src/lib/supabase/service-role.ts` uses Supabase-only slice; `src/lib/supabase/__tests__/service-role.test.ts` + `src/lib/__tests__/config.test.ts` add regression coverage for "Supabase reads don't require Anthropic"                                                                                                                                                         |
| 4a  | Publish confirm dialog                    | ✅ Shipped + verified                     | `src/app/dashboard/flows/[flowId]/directions/b-stage/header.tsx` — modal with title, consequence body, Cancel + Publish buttons, `role="dialog"`, `aria-modal`, backdrop dismiss, autoFocus on confirm                                                                                                                                                                                                                                                                                        |
| 6   | Jargon split (dev-speak → plain English)  | ✅ Shipped + verified                     | `shared-data.ts` (`IG Organic DM` → `Instagram DM Flow`); `header.tsx` (`Draft v13` → `Draft version 13`, `Live on v12 · 42 convos today` → `Live on version 12 · 42 conversations today`, `Publish v13` → `Publish version 13`); `dashboard/page.tsx` (`Open IG Organic DM` → `Open Instagram DM Flow`); `page-runs.tsx` (eyebrow updated)                                                                                                                                                   |
| 7   | Mobile gate below 1024px                  | ✅ Shipped + verified at 375px and 1280px | `flow-builder.tsx` — wrapped `<DirectionB>` in `hidden lg:block`, added `<MobileGate>` in `lg:hidden`. Gate reads "Flow Builder needs a desktop" with explanation + "Open conversations →" CTA                                                                                                                                                                                                                                                                                                |
| 5   | IconButton component + PageNav glyph swap | ⚠️ Partial                                | **Shipped**: `src/components/icon-button.tsx` (shared wrapper with required `label` prop); `page-nav.tsx` swaps `⎔ ◉ ∥ ⟳ ◐` → Lucide `Workflow / Activity / Braces / History / Bot` + adds `aria-label` + `aria-current`. **Deferred**: icon-only buttons in `palette-drawer.tsx` (`⊞ ←`), `sim-float.tsx` (`× ↻`), `inspector.tsx` (`×` ×3), canvas zoom controls (`− + ⤢ ⊞`), `inspector.tsx` (`↗ View Persona`). These need the same `<IconButton>` + Lucide treatment in a follow-up pass |

Test suite: **30 files, 257 tests — all passing** after changes. No console errors in browser.

## Verification proof

Browser-verified at `http://localhost:3100` via Claude Preview:

- Pointer-events: `elementFromPoint` at PageNav "Runs" centre returns the Runs button's own SPAN (`hitIsRunsButton: true`). Was previously returning the palette-drawer overlay.
- Conversations: page renders 15 conversation rows, no error fallback, no console errors.
- Publish confirm: click → dialog opens with `role="dialog"`, title "Publish version 13 to the live bot?", Cancel dismisses, autoFocus lands on Publish button.
- Jargon: header snippet reads "VendingPreneurs › Instagram DM Flow · Draft version 13 · Live on version 12 · 42 conversations today · Simulator · Publish version 13".
- Mobile gate at 375×812: shows gate only; no Simulator, no Publish, no flow canvas. At 1280×800: full builder renders, gate hidden.
- PageNav: all 5 buttons have `lucide lucide-{name}` SVG icons with proper `aria-label` and `aria-current="page"` on the active tab.

## Remaining from this review (in priority order)

### Week-2 polish PR

- Complete IconButton rollout: swap `× + − ⤢ ⊞ ↻ ↗` glyphs across `palette-drawer.tsx`, `sim-float.tsx`, `inspector.tsx`, and canvas zoom controls.
- P0.10 — Inspector textareas need `aria-labelledby` + dirty/saved state pill.
- P1.3 — autosave indicator ("Saved 2s ago" / "Unsaved changes").
- P1.4 — persistent bot status pill in top bar.

### Versions-tab sprint (bundled with the already-planned Versions build)

- 4b — Publish diff/rollback + toast after confirm.
- P1.17 — undo/redo + audit log.

### Dedicated sprints

- P1.1 + P1.10 — WAI-ARIA tab pattern + global `:focus-visible` + landmarks.
- P1.15 — canvas keyboard editing (WCAG 2.1.1).
- P1.2 — real dashboard with KPIs, status pill, escalation queue.
- P1.6 — design tokens + shared primitives (`<Button>`, `<Chip>`, `<Input>`).
- P2.14 — toast system.

### Deferred per decision #8

- All trust-chrome items (footer, pricing, legal, compliance) — revisit when a public launch plan exists.

## Next step

Manual review of the 5 edits, run the dev server on :3000 normally to confirm end-to-end, then decide whether to commit as one PR or split by concern. My recommendation: commit as `fix(flow-builder): UX review pass 1` with all 5 changes — they're small, independent, each with a clear rationale in the diff. Splitting risks landing the pointer-events fix without the env split and getting a broken Conversations page on cold install.
