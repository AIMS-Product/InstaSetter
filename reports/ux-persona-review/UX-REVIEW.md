# UX Persona Review — Flow Builder Section

App: InstaSetter
URL: http://localhost:3000
Date: 2026-04-28
Scope: `/dashboard/flows/[flowId]` and its 5 tab views (Flow / Inbox / Variables / Release / Bot) plus mobile gate, palette drawer, simulator panel, block inspector
Pages tested: 9 surfaces
Interactions tested: 30+
Screenshots captured: 29
Personas: 15

Prior whole-app review archived in `_archive-2026-04-20/`.

---

## Executive Summary

- **Total unique issues:** 87
- **P0 Critical (10+ personas or blocker):** 8 — **6 ✅ DONE 2026-04-28** (#1, #2, #3, #5, #6, #7)
- **P1 High (5-9 personas or critical severity):** 17
- **P2 Medium (2-4 personas):** 28
- **P3 Low (1 persona):** 34
- **Blockers:** 12 — **3 ✅ DONE 2026-04-28** (B5, B6, B7)
- **Average gut feel across personas:** **1.7 / 5**

> **Status legend:** `✅ DONE 2026-04-28` — fixed and verified (type-check + 394 tests + lint pass). Original finding text retained for context; do not delete.

The flow builder is a polished prototype that has shipped its dev-diary to its users. Every persona — from a 78-year-old grandmother to a competitor's power user, from an exec with 30 seconds to a developer with DevTools open — independently arrived at the same conclusion: this looks like an internal staging tool, not a product. Three forces compound:

1. **The chrome leaks engineering** — "Saved to Supabase," "setter-v2," `src/lib/prompts/sections/*.ts`, "until flow_id lands on the conversations table," "DEV" badge, "not wired yet" banners on 2 of 5 tabs.
2. **The most important controls are missing** — no kill switch / pause-bot anywhere, no support contact, no rollback (Release tab admits this), no search in the Inbox, no undo, no human-takeover button. The default tab is the editor; the metrics live one tab in.
3. **The runtime is on fire** — 30+ "Maximum update depth exceeded" React errors per session, the simulator's primary `Send` button is permanently disabled, and the palette drawer eats clicks on the canvas underneath it.

A bright spot: the _idea_ is genuinely differentiated. The inline LLM Simulator (Mike's review compares favourably to ManyChat, Voiceflow, Botpress), the Variables hierarchy with explicit cardinality (Brand/Contact/Conversation), and the Bot tab's LOCKED-vs-EDITABLE persona governance model are all stronger than what most competitors ship. The mobile gate copy is the single warmest piece of writing in the entire app — every persona praised it. The product underneath is interesting; the packaging is hostile to anyone who isn't already a customer.

---

## Blockers

| #                     | Page/Feature       | What's Broken                                                                                                                                                                                                                                                                                                                                                           | Personas Affected                                                     |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| B1                    | Header (every tab) | **No bot kill switch / pause button anywhere.** Header has Preview, brand pill, status pills, but no way to turn the bot off mid-incident.                                                                                                                                                                                                                              | 8/15 (Tom, Karen, Priya, Marcus, Mike, Rachel, Victoria, David)       |
| B2                    | All pages          | **No support / help / contact link anywhere.** No `?` icon, no help menu, no support email, no chat widget.                                                                                                                                                                                                                                                             | 6/15 (Karen, Betty, Rachel, Priya, Sam, Mike)                         |
| B3                    | Release tab        | "Publish controls and release history are not wired yet." — entire tab is a stub.                                                                                                                                                                                                                                                                                       | 9/15 (Karen, Mike, Rachel, Marcus, Tom, Victoria, Alex, Priya, Betty) |
| B4                    | Variables tab      | "Reference only — Creating variables and row-level actions is not wired yet." Read-only entire tab.                                                                                                                                                                                                                                                                     | 7/15 (Mike, Rachel, Marcus, Karen, Tom, Priya, Betty)                 |
| B5 ✅ DONE 2026-04-28 | Flow tab (canvas)  | **30+ React "Maximum update depth exceeded" errors** in console during normal interaction — infinite re-render loop. **Fix:** Toast `useEffect` deps included inline arrow callbacks rebuilt every Shell render; wrapped `onDone`/`onUndo` in `useCallback` (`b-stage/index.tsx`). Verified zero console errors under rapid add-block load.                             | 4/15 (Alex, Marcus, David, Karen)                                     |
| B6 ✅ DONE 2026-04-28 | Flow tab (canvas)  | **Palette drawer overlays canvas and eats pointer events** on blocks underneath. **Fix:** Drawer's absolutely-positioned cosmetic frame had no pointer-events guard; set `pointerEvents:'none'` on the wrapper and re-enabled it on the toggle button + catalog scroll container (`b-stage/palette-drawer.tsx`). Verified via `elementFromPoint` underneath the drawer. | 7/15 (Alex, Marcus, Karen, Tom, Priya, Mike, David)                   |
| B7 ✅ DONE 2026-04-28 | Simulator          | **"Send" button disabled in default state** made the primary CTA look broken. The disabled state was actually correct behaviour — the real defect was that the input never auto-focused on open, so first-time users couldn't tell the field accepted input. **Fix:** Added `inputRef` + focus effect tied to the `open` prop (`b-stage/sim-float.tsx`).                | 6/15 (Alex, Marcus, Karen, Mike, Yuki, Betty)                         |
| B8                    | All pages          | No marketing / landing surface. Strangers drop _into the product_ with no value-prop or onboarding.                                                                                                                                                                                                                                                                     | 4/15 (Sam, Rachel, Betty, Zoe)                                        |
| B9                    | All pages          | No pricing, plans, billing, or terms / privacy / DPA pages. B2B SaaS that touches Instagram DMs without legal pages.                                                                                                                                                                                                                                                    | 3/15 (Rachel, Sam, Mike)                                              |
| B10                   | Inbox tab          | No search by Instagram handle, no date filter, no flow-scope filter. Cannot find a specific conversation.                                                                                                                                                                                                                                                               | 4/15 (Karen, Marcus, Mike, Priya)                                     |
| B11                   | Inbox tab          | No "Take over conversation" / human handoff button per thread.                                                                                                                                                                                                                                                                                                          | 3/15 (Karen, Tom, Priya)                                              |
| B12                   | Mobile / Tablet    | Gates everyone below 1024px (including iPad portrait at 768px) with no read-only fallback. Phone has zero way to monitor or pause the bot.                                                                                                                                                                                                                              | 6/15 (Jake, Zoe, Tom, Karen, Priya, David)                            |

---

## P0 — Critical Issues (10+ personas or blocker severity)

| #                    | Page               | Category                       | Issue                                                                                                                  | Personas                                                                                     | Suggested Fix                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 ✅ DONE 2026-04-28 | Header (every tab) | Copy & Labels / Trust & Safety | "Saved to Supabase" exposes the database vendor name in a customer-visible status pill.                                | 11/15 (Rachel, Priya, Yuki, Karen, Sam, Betty, Tom, Marcus, Alex, Mike, Victoria)            | Replace with **"Saved"**. Never name the persistence layer in customer pills. **Fix:** `surface-status.tsx` — pill now reads "Saved". All downstream Supabase mentions in toasts, hints, and version meta also cleaned.                                                                                                    |
| 2 ✅ DONE 2026-04-28 | Header (every tab) | Copy & Labels                  | "Live: setter-v2" — internal version slug visible to customers.                                                        | 11/15 (same as above plus Zoe)                                                               | Replace with "Live" + tooltip, or "Live · Production" — never expose internal branch/version handles. **Fix:** `surface-status.tsx` — pill now reads "Live"; runtime detail copy rewritten to remove "setter-v2".                                                                                                          |
| 3 ✅ DONE 2026-04-28 | Inbox tab          | Copy & Labels                  | Banner: "until flow_id lands on the conversations table" — engineering ticket vocabulary on a marketer-facing surface. | 13/15 (Rachel, Priya, Yuki, Karen, Sam, Betty, Tom, Marcus, Alex, Mike, Victoria, Zoe, Jake) | Rewrite as: "Right now we show all your bot's conversations together. Per-flow filtering is coming soon." **Fix:** `surface-status.tsx` `BRAND_INBOX_STATUS` + `page-runs.tsx` intro — banner now reads "All flows — Right now we show all of VendingPreneurs' conversations together. Per-flow filtering is coming soon." |
| 4                    | Release tab        | Trust & Safety                 | "Publish controls and release history are not wired yet." — entire tab is a stub.                                      | 12/15                                                                                        | Either ship it or hide the tab. Customer-facing UI must not advertise unfinished features.                                                                                                                                                                                                                                 |
| 5 ✅ DONE 2026-04-28 | Release tab        | Copy & Labels                  | "Compiled from src/lib/prompts/sections/\*.ts" — literal file path on a customer screen.                               | 12/15                                                                                        | Replace with "Compiled from prompt source files." **Fix:** `page-versions.tsx` card title + `prompt-reader.tsx` detail + `page-bot.tsx` inline `setter-v2.ts` chip — all file paths removed from customer surfaces.                                                                                                        |
| 6 ✅ DONE 2026-04-28 | Header (every tab) | Trust & Safety                 | "DEV" badge appears in production-facing UI.                                                                           | 5/15 (Rachel, Sam, Betty, Zoe, Priya) — but tagged as Blocker by Rachel                      | Hide DEV in production builds. Use environment check. **Fix:** `dashboard-shell.tsx` — badge now only renders when `env !== 'production'`.                                                                                                                                                                                 |
| 7 ✅ DONE 2026-04-28 | Flow tab (canvas)  | Feedback & State               | 30+ React render-loop errors during normal interaction — "Maximum update depth exceeded."                              | 4/15 (Alex, Marcus, Karen, David)                                                            | **Fix:** Wrapped Toast's `onDone`/`onUndo` in `useCallback` (`b-stage/index.tsx`). The Shell re-renders on every autosave-status dispatch; the inline arrows were rebuilt each time, churning Toast's timer effect. Now stable refs — timer only resets when the toast itself changes.                                     |
| 8                    | All pages          | Trust & Safety                 | No bot pause / kill switch. No support contact. No rollback. No undo.                                                  | 12/15                                                                                        | Add persistent "Bot status" pill in header on every tab/screen size with confirmation modal. Add help icon top-right. Ship rollback in Release tab.                                                                                                                                                                        |

---

## P1 — High Priority (5-9 personas or critical severity)

| #   | Page                 | Category          | Issue                                                                                                                                                                                 | Personas                                                       | Suggested Fix                                                                                                                                          |
| --- | -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9   | Flow tab (canvas)    | Navigation & Flow | Tabs (Flow / Inbox / Variables / Release / Bot) swap content but never change the URL. Cannot deep-link, bookmark, share, or back-button between them.                                | 5/15 (Alex, Marcus, Mike, Karen, Sam)                          | Promote tab to search param `?tab=bot` or path segment `/dashboard/flows/[flowId]/[tab]`.                                                              |
| 10  | Flow tab (canvas)    | Navigation & Flow | `/dashboard/flows` (no ID) returns 404. No flow index page exists.                                                                                                                    | 4/15 (Mike, Marcus, Alex, Sam)                                 | Create `app/dashboard/flows/page.tsx` listing known flows.                                                                                             |
| 11  | Flow tab (canvas)    | Trust & Safety    | `/dashboard/flows/<garbage-id>` returns HTTP 200 and renders the seeded flow (no flowId validation).                                                                                  | 3/15 (Alex, Marcus, Karen)                                     | Validate flowId at the page boundary. Show 404 / NotFoundFlow component for unknown IDs.                                                               |
| 12  | All tabs             | Copy & Labels     | Heavy domain jargon throughout: "block," "exits," "Routing," "Triggers," "Locals," "Hard Rules," "Hard Limit," "compiled prompt," "shared draft," "live runtime," "release," "scope." | 9/15                                                           | Add a glossary or first-mention tooltips. Standardise to two state words: "draft" (editing) and "live" (customers see).                                |
| 13  | All tabs             | Copy & Labels     | Header subtitle "Edit the shared draft and sanity-check tone before anything ships." stacks idioms ("shared draft," "sanity-check," "ships") in one sentence.                         | 5/15 (Yuki, Sam, Betty, Priya, Tom)                            | Rewrite: "Edit the team draft and check the tone before publishing."                                                                                   |
| 14  | Bot tab              | Copy & Labels     | LOCKED / EDITABLE / HARD RULES / HARD LIMIT — four state words for two states. Locked-by-whom never explained.                                                                        | 7/15 (Yuki, Rachel, Tom, Priya, Karen, Marcus, Sam)            | Reduce to two state words: "Editable" or "Fixed." Tooltip on Fixed: "Set by InstaSetter for safety/compliance — cannot be edited."                     |
| 15  | All tabs             | Visual & Layout   | Three header pills ("Unpublished edits," "Saved to Supabase," "Live: setter-v2") look like one system but communicate three unrelated things.                                         | 8/15 (Claire, Marcus, Priya, Tom, Yuki, Sam, Rachel, Victoria) | Collapse to one status pill with unambiguous state language. Group with separate labels if all three must remain.                                      |
| 16  | Inbox tab            | Feedback & State  | Empty metric cards (`—`) plus "Loading conversations…" plus separate "Loading…" indicator — multiple ambiguous loading states.                                                        | 7/15 (Marcus, Claire, Tom, Priya, Karen, Mike, Sam)            | Single skeleton state. Resolve dashes to either "0" or "Loading…" — never both ambiguous at once.                                                      |
| 17  | Inbox tab            | Trust & Safety    | Inbox shows brand-wide data even on flow-scoped page; no clear way to know which conversations belong to this flow.                                                                   | 5/15 (Mike, Karen, Rachel, Priya, Tom)                         | Either hide brand-wide data behind a feature flag until per-flow filtering ships, or surface a clear "All flows / This flow" toggle.                   |
| 18  | Flow tab — Simulator | Forms & Input     | Disabled `Send` button next to functional `Run` pills creates two CTAs in the same panel doing similar things.                                                                        | 5/15 (Marcus, Alex, Karen, Mike, Yuki)                         | Pick one primary action. Auto-focus textarea on open, hide Send until input has content, or have starter pills _fill_ the input rather than auto-send. |
| 19  | Flow tab (canvas)    | Accessibility     | At 200% browser zoom (low-vision accommodation), the page reports viewport <1024px and shows "needs desktop" gate. Locks out screen-reader/zoom users entirely.                       | 1/15 (David — but Blocker severity)                            | Detect zoom-vs-screen, or don't gate above 1024 _device_ px. Ship a read-only flow viewer at narrow widths.                                            |
| 20  | Flow tab (canvas)    | Accessibility     | Simulator and Inspector are `position:absolute` floating panels with no `role="dialog"`, no `aria-modal`, no focus trap, no focus moved on open, no Escape.                           | 1/15 (David — but Critical severity)                           | Add full dialog semantics: role, aria-modal, focus management, Escape key. Three panels, same fix.                                                     |
| 21  | Flow tab (canvas)    | Accessibility     | Toast notifier (`role="status"` missing) auto-dismisses in 6s — undo never announced to screen readers and unreachable for keyboard users in time.                                    | 1/15 (David — Critical)                                        | Add `role="status" aria-live="polite"`. Pause auto-dismiss when toast has focus.                                                                       |
| 22  | Bot tab              | Trust & Safety    | "Display name" is a free input; project rule says bot must never have a stated name. Marketer can break persona contract silently.                                                    | 1/15 (Alex — Critical)                                         | Lock the field with an explanation, or server-validate non-empty values.                                                                               |
| 23  | Variables tab        | Forms & Input     | "Reference only" — page shows brand booking URL and timezone but I cannot edit them.                                                                                                  | 5/15 (Mike, Marcus, Karen, Tom, Priya)                         | Make the table editable inline, or remove until edit is shipped.                                                                                       |
| 24  | Default landing      | Visual & Layout   | Default tab is Flow (the editor). Most personas need Inbox first (status / metrics).                                                                                                  | 6/15 (Tom, Priya, Victoria, Mike, Sam, Karen)                  | Default to Inbox tab, with the four metrics at the top, in real numbers, with a clear "since you last logged in" delta.                                |
| 25  | Mobile / Tablet      | Visual & Layout   | Tablet at 768px is gated identically to phone. iPad mini and iPad Air portrait — all blocked.                                                                                         | 4/15 (Jake, Alex, David, Zoe)                                  | Drop cutoff to 900px so iPad-landscape works. Or split: tablet gets view-only, phone gets gate.                                                        |

---

## P2 — Medium Priority (2-4 personas)

| #   | Page                 | Category          | Issue                                                                                                                                     | Personas                         | Suggested Fix                                                                                                                     |
| --- | -------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 26  | Flow tab (canvas)    | Navigation & Flow | No `Cmd-K` / global command palette. No `?` shortcut overlay. No keyboard shortcuts at all.                                               | 3/15 (Marcus, Alex, Mike)        | Ship `Cmd-K` for tab/block jumping. Ship `?` for shortcut sheet.                                                                  |
| 27  | Flow tab — Simulator | Visual & Layout   | Simulator floats over canvas; no way to dock left/right. With Inspector also open, three panels compete for space on a 13" laptop.        | 4/15 (Marcus, Priya, Alex, Mike) | Allow docking the simulator at the bottom or detached popout.                                                                     |
| 28  | Inbox tab            | Forms & Input     | No keyboard navigation between conversations. No `j/k`, no arrows, no search.                                                             | 3/15 (Marcus, Mike, Karen)       | Add `j/k` keyboard navigation in the conversation list and a search input.                                                        |
| 29  | Flow tab — Palette   | Forms & Input     | Palette items use _flow stages_ (Opening / Qualifier / Booking) not _primitives_ (Send Message / HTTP Request / Set Variable).            | 3/15 (Mike, Tom, Karen)          | Add primitive blocks alongside stage blocks (or document that the product is intentionally template-only).                        |
| 30  | Flow tab — Palette   | Forms & Input     | No search input in the palette.                                                                                                           | 2/15 (Marcus, Mike)              | Add `Cmd-F` style search.                                                                                                         |
| 31  | Flow tab — Palette   | Forms & Input     | Each palette entry is `<button draggable>` AND click-to-add — risk of double-add when drag-then-click misfires.                           | 2/15 (Alex, Karen)               | Make drag and click mutually exclusive.                                                                                           |
| 32  | Inbox tab            | Visual & Layout   | "Brand inbox" header, "Inbox" tab label, "Brand-wide only" pill — three different framings of the same scope on one page.                 | 3/15 (Yuki, Marcus, Sam)         | Pick one name.                                                                                                                    |
| 33  | Inbox tab            | Copy & Labels     | "STALLED" / "BOOKED" / "COMPLETED" — ambiguous metric names without explanation.                                                          | 3/15 (Yuki, Priya, Tom)          | Tooltip-explain each metric. Replace "STALLED" with "NO REPLY" or "INACTIVE."                                                     |
| 34  | Variables tab        | Copy & Labels     | Examples shown in dot-notation `brand.brand_name` / `contact.location` without explaining the namespace.                                  | 4/15 (Yuki, Sam, Betty, Zoe)     | Either explain the dot-notation in a one-liner, or hide the schema names behind plain-English labels (Bakery name, Booking link). |
| 35  | Variables tab        | Visual & Layout   | Three banners doing the same job — top-right pill + body banner + footer.                                                                 | 3/15 (Mike, Marcus, Alex)        | One read-only signal is enough.                                                                                                   |
| 36  | Bot tab              | Forms & Input     | "Display name" placeholder mixes state ("Not named") and hint ("shared team inbox") in one field.                                         | 4/15 (Yuki, Tom, Priya, Sam)     | Move hint to helper text below the input.                                                                                         |
| 37  | Bot tab              | Copy & Labels     | "Tone is customisable per brand. Peer-mentor beats salesperson 3:1." — sports metaphor + sales jargon + ratio of unspecified things.      | 2/15 (Yuki, Betty)               | Rewrite with concrete percentages: "Sound like a friendly coworker about 75% of the time, salesperson 25%."                       |
| 38  | All tabs             | Visual & Layout   | Pills are doing too many jobs — status, category, scope, type, label. At least 5 different pill systems on screen.                        | 2/15 (Claire, Yuki)              | Reserve pill shape for _status only_. Use chips/tags for the rest.                                                                |
| 39  | Flow tab (canvas)    | Visual & Layout   | Mini-map (`@xyflow/react` default) is unstyled — multicolor block-type squares don't match the actual canvas palette.                     | 2/15 (Claire, Alex)              | Style the mini-map to match the surface palette, or hide it.                                                                      |
| 40  | Flow tab (canvas)    | Visual & Layout   | Block cards have coloured top edge stripes that don't map to anything documented.                                                         | 2/15 (Claire, Tom)               | If meaningful, add a legend. If decorative, remove or use a 3-stop ramp.                                                          |
| 41  | Variables tab        | Copy & Labels     | "Stays put forever" / "follows a person" / "scoped to a single thread" — three different verb metaphors for what is one parallel concept. | 3/15 (Yuki, Sam, Priya)          | Make parallel: "stored once, permanently / stored per person / stored per chat."                                                  |
| 42  | All tabs             | Copy & Labels     | "is not wired yet" — electrical metaphor on multiple banners.                                                                             | 4/15 (Yuki, Sam, Betty, Tom)     | Replace with "is not built yet" or "coming soon."                                                                                 |
| 43  | Release tab          | Copy & Labels     | Twelve different vocabulary items for two states (draft vs live) across four cards.                                                       | 2/15 (Yuki, Mike)                | Pick two words: "draft" (editing) and "live" (customers see). Use only those two.                                                 |
| 44  | Flow tab — Simulator | Forms & Input     | No `Cmd-Enter` or `Enter` to send shown. No way to copy a bot reply. No saved test scenarios.                                             | 3/15 (Marcus, Mike, Alex)        | Add Enter-to-send (with "Cmd↵ Send" label if needed). Add "Save scenario" affordance.                                             |
| 45  | Bot tab              | Visual & Layout   | LOCKED and EDITABLE pills have subtly different backgrounds — "almost the same" is the worst option.                                      | 2/15 (Claire, Tom)               | Make them obviously different (different shape or much larger contrast) or obviously the same (only color differs).               |
| 46  | Mobile gate          | Visual & Layout   | Mobile gate uses inline `style={...}` with hardcoded hex values — bespoke island outside the design system.                               | 1/15 (Claire — but Critical)     | Refactor to design tokens. Forcing function for whether tokens exist.                                                             |
| 47  | Mobile gate          | Forms & Input     | "Open conversations →" CTA touch target undersized (10×18px padding, 13px text — under 44×44pt minimum).                                  | 2/15 (Jake, David)               | Bump padding to meet 44pt minimum.                                                                                                |
| 48  | Mobile gate          | Navigation & Flow | Header nav still shows "Flow Builder" highlighted on mobile — tapping just reloads the gate. Dead-end loop.                               | 2/15 (Jake, Karen)               | Hide or grey-out Flow Builder nav item on mobile.                                                                                 |
| 49  | Mobile gate          | Navigation & Flow | No Share / "send me this link" / bookmark button on the gate.                                                                             | 2/15 (Jake, Priya)               | Add `navigator.share` button or "email me this link."                                                                             |
| 50  | Bot tab              | Forms & Input     | Display name has no save button or autosave indicator.                                                                                    | 3/15 (Marcus, Mike, Tom)         | Show "Saved" toast on autosave, or explicit Save button.                                                                          |
| 51  | Flow tab (canvas)    | Forms & Input     | No undo/redo affordance. No `Cmd-Z` indicator. Toast undo only after delete.                                                              | 4/15 (Marcus, Karen, Betty, Tom) | Persistent undo affordance. `Cmd-Z` keyboard shortcut.                                                                            |
| 52  | Flow tab (canvas)    | Forms & Input     | No multi-select on canvas (Shift-click, marquee).                                                                                         | 2/15 (Marcus, Mike)              | Add Shift-click and marquee selection.                                                                                            |
| 53  | Flow tab (canvas)    | Visual & Layout   | Sidebar tabs verbose with two-line label + giant icon. Power users want compact navigation.                                               | 2/15 (Marcus, Tom)               | Optionally collapse to icon-only on hover, or remove subtitles.                                                                   |
| 54  | Variables tab        | Visual & Layout   | Three category cards on top + Brand table at bottom — same data, two visual treatments.                                                   | 3/15 (Marcus, Claire, Mike)      | Pick one — single table view with category filters preferred.                                                                     |
| 55  | Bot tab              | Visual & Layout   | Sections collapse with chevron — no "Expand all / Collapse all."                                                                          | 3/15 (Marcus, Mike, Tom)         | Add bulk expand/collapse controls.                                                                                                |

---

## P3 — Low Priority (1 persona)

Trimmed for length. Highlights:

- **Yuki:** 42 idioms catalogued ("Mirror back what you know," "drop the booking link," "Peer-mentor beats salesperson 3:1," "until flow_id lands on the conversations table"). Top fix: standardise draft/live vocabulary to two words.
- **Claire:** 34 visual inconsistencies — pill systems, eyebrow colours, border-radius values, icon families, focus states, mini-map styling. Top fix: ban inline `style={}` and tokenise the mobile gate as a forcing function.
- **Alex:** Source-level findings — `canvas.tsx` is 1576 lines, all inline styles, render-loop diagnosis traced to `index.tsx:131-152` Toast `useEffect` deps.
- **David:** 20 a11y findings — missing focus indicators, no `role="dialog"` on overlays, toast not announced, minimap unlabelled, edges unreachable.
- **Karen:** 6 blockers from a single incident-response perspective — every panic action is missing.
- **Betty:** 67 "I don't know what this means" findings — every status pill, every tab name, every block name is jargon.
- **Sam:** "If the simulator was the front door, I'd convert in 5 seconds" — the most valuable interaction is the deepest-buried.
- **Mike:** Competitive gap analysis — no flow index page, no IF/ELSE block, no webhooks, no A/B, no templates, no import. But genuine wins: inline LLM Simulator, scoped Variables, Bot persona governance.
- **Zoe:** "Lowkey this is the most boomer software I've ever seen." Zero emojis. No animations. Vertical sidebar feels like Outlook.
- **Jake:** Tablet form-factor recommendation — "drop the cutoff to 900px so iPad-landscape works."

---

## Page-by-Page Gut Feel (averaged across 15 personas)

| Page              | Avg         | Min                                                | Max                                            | Lowest Persona    | Highest Persona |
| ----------------- | ----------- | -------------------------------------------------- | ---------------------------------------------- | ----------------- | --------------- |
| Flow tab (canvas) | 1.9 / 5     | 1 (Sam, Betty, Karen, Zoe, Victoria, Marcus)       | 3 (Claire, Mike)                               | Sam, Betty, Karen | Mike, Claire    |
| Inbox tab         | 2.0 / 5     | 1 (Sam, Betty, Karen, Zoe, Rachel, Victoria)       | 3 (Tom, Marcus, Mike)                          | Karen             | Tom             |
| Variables tab     | 2.4 / 5     | 1 (Rachel, Sam, Betty, Zoe, Tom)                   | 3.5 (Mike)                                     | Rachel            | Mike            |
| Release tab       | 1.5 / 5     | 1 (everyone except Alex/Mike)                      | 3 (Alex, Mike)                                 | Most personas     | Alex, Mike      |
| Bot tab           | 2.5 / 5     | 1 (Karen, Rachel, Betty, Zoe, Yuki)                | 3.5 (Mike, Alex)                               | Betty             | Mike, Alex      |
| Simulator         | 2.6 / 5     | 1 (Marcus, Karen)                                  | 4 (Mike)                                       | Marcus            | Mike            |
| Palette           | 2.4 / 5     | 1 (Betty, Karen, Zoe)                              | 4 (Sam — block names are clearest copy in app) | Karen             | Sam             |
| Mobile gate       | 3.4 / 5     | 1 (Karen, Priya, Sam, Jake when scored as blocker) | 5 (Yuki — "clearest copy in the app")          | Karen             | Yuki            |
| **Overall**       | **1.7 / 5** | 1 (Betty, Sam, Rachel, Karen, Victoria, Zoe)       | 2.5 (Mike)                                     | Multiple          | Mike            |

---

## Category Breakdown

### Navigation & Flow

- **P0:** No bot kill switch on any tab/screen size. No flow index page (`/dashboard/flows` 404s). Tabs don't update URL.
- **P1:** Default tab is Flow (editor) instead of Inbox (status). No deep linking to a tab or block.
- **P2:** No Cmd-K, no command palette, no shortcut overlay. No `j/k` keyboard nav in inbox. Mobile/tablet gate at 1024px is too aggressive.

### Copy & Labels

- **P0:** "Saved to Supabase," "Live: setter-v2," "until flow_id lands on the conversations table," "Compiled from src/lib/prompts/sections/\*.ts," "DEV" badge, "not wired yet" banners — engineering jargon throughout.
- **P1:** Heavy domain jargon (qualifier, exits, routes, runtime, hard rules, hard limit, scope, compiled, parsed). Header subtitle stacks idioms.
- **P2:** Twelve vocabulary items for two states on Release tab. "Brand inbox" / "Inbox" / "Brand-wide" — three names for one thing. "STALLED" ambiguous.

### Forms & Input

- **P0:** Simulator's Send button permanently disabled. No edits on Variables (read-only). No publish controls (Release stub).
- **P1:** No bot pause/resume. No undo. No keyboard shortcuts. No multi-select on canvas. No search on Inbox or Palette.
- **P2:** Display name placeholder mixes state and hint. Send button conflict with Run pills. No autosave indicators on Bot tab.

### Visual & Layout

- **P0:** Three header pills look like one system but communicate three unrelated states.
- **P1:** Empty metric cards with `—` next to "Loading…" — multiple ambiguous loading states. Default tab shows a graph instead of metrics.
- **P2:** Pill exhaustion — at least 5 different pill systems on screen. Mini-map unstyled (stock @xyflow). Mobile gate is bespoke inline-style island. Inconsistent eyebrow colors. Block top-stripe colors not legend'd.

### Feedback & State

- **P0:** Render loop floods console. No toast announcement (a11y). Two simultaneous loading states.
- **P1:** No status delta ("X new conversations since you last logged in"). KPI cards show `—` not skeleton.
- **P2:** Loading-state inconsistency between regions. Status pill content variable-length without min-width — layout shifts.

### Trust & Safety

- **P0:** No kill switch. No support contact. No rollback. No undo. No DPA / privacy / terms / pricing. No social proof.
- **P1:** "DEV" pill in production. Random flowIds render seeded data. No human handoff in inbox. Bot has no name yet field is editable (contract violation possible).
- **P2:** Locked sections un-explained. No "this is sample data" indicator. No environment indicator on simulator.

### Accessibility

- **P0:** 200% zoom locks user out (gates as small device). Toast not announced. Overlays missing dialog semantics.
- **P1:** Outlines stripped without focus replacements. Pale focus rings on near-white. Canvas edges keyboard-unreachable. Minimap unlabelled.
- **P2:** PageNav `aria-label` overrides visible descriptive subtitle (NVDA misses the description). Trigger warning silent. Loading without aria-busy.

---

## Persona Highlights — what each lens caught uniquely

| Persona                  | Unique Findings                                                                                                     | Most Concerned About                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Betty (Grandparent)      | Status pill change between tabs felt like data loss. Tiny zoom icons unreadable. "Run" vs "Send" verb difference.   | Fear of clicking anything; need for Help and Undo.                                     |
| Marcus (Power User)      | Tabs don't update URL. No Cmd-K, no `?` overlay. No multi-select. No `j/k` in inbox.                                | Speed of execution; deep-linking; broken simulator Send.                               |
| Sam (First-timer)        | If Simulator was the front door, would convert in 5 seconds. No value-prop anywhere.                                | Cannot tell what InstaSetter does in 10 seconds.                                       |
| David (Accessibility)    | 200% zoom triggers mobile gate. Overlays missing dialog semantics. Edges keyboard-unreachable.                      | Whole app effectively locked out for low-vision/keyboard users.                        |
| Yuki (Non-native)        | 42 idioms catalogued. Twelve vocabulary items for two states. "Peer-mentor beats salesperson 3:1."                  | Idioms and engineering jargon double the cognitive cost.                               |
| Rachel (Skeptical Buyer) | "DEV" badge alone is a tab-close. No legal pages. No social proof. No pricing.                                      | Cannot recommend to CEO; would die in security review.                                 |
| Jake (Mobile)            | Mobile gate is honest but undersells. Tablet 768px gated unfairly. CTA touch target < 44pt.                         | Can't even _see_ a flow on mobile, let alone edit.                                     |
| Claire (Perfectionist)   | 5 distinct pill systems on screen. Mini-map is stock @xyflow. Mobile gate uses inline styles outside design system. | Every almost-but-not-quite is a paper cut.                                             |
| Tom (Pragmatist)         | No bot status indicator. Can't pause from anywhere. Bot tab "Display name" lacks helper text.                       | "Is it on" and "how do I turn it off" are unanswered.                                  |
| Zoe (Teenager)           | Zero emojis. No animations. Vertical Outlook-style sidebar. Disabled "Send" is a sad button.                        | Vibes are 2008 enterprise software.                                                    |
| Priya (Business Owner)   | "Shared team inbox" doesn't fit a one-person bakery. No "since you last logged in" delta.                           | 10 minutes between customers; need reassurance loop.                                   |
| Alex (Developer)         | Render loop traced to `index.tsx:131-152` Toast `useEffect`. `canvas.tsx` 1576 lines. Unknown flowId returns 200.   | Code-quality smells visible in 5 minutes with DevTools.                                |
| Victoria (Executive)     | No executive view. Default page has zero numbers. Need traffic-light release status.                                | Cannot brief from any page in this product.                                            |
| Mike (Competitor's User) | No flow index, no multi-flow, no IF/ELSE, no webhooks, no A/B, no templates, no import.                             | Switching cost is too high — but Simulator + Variables + Bot governance are real wins. |
| Karen (Angry User)       | Six panic-action blockers. No pause, no support, no rollback, no search, no human takeover.                         | App is _actively hostile_ to a frustrated user.                                        |

---

## Screenshots Index

All in `screenshots/`. Key references:

| Screenshot                                    | Page                  | What It Shows                                               |
| --------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| `flow-ig-organic-dm-002-desktop-fullpage.png` | Flow canvas (default) | Full-page canvas with 5+ block cards, header pills, sidebar |
| `flow-deep-001-opening-block-selected.png`    | Flow + Inspector      | Opening block selected, right-side inspector with tabs      |
| `flow-deep-010-simulator-open.png`            | Simulator             | Live preview panel docked over canvas                       |
| `flow-deep-020-palette-open.png`              | Palette drawer        | Block library overlay, 8 block types                        |
| `flow-ig-organic-dm-11-tab-runs.png`          | Inbox tab             | Brand-wide banner, empty metric cards, loading states       |
| `flow-ig-organic-dm-12-tab-variables.png`     | Variables tab         | Brand/Contact/Conversation cards + variables table          |
| `flow-ig-organic-dm-13-tab-versions.png`      | Release tab           | Four-card grid + recommended-workflow + file path           |
| `flow-ig-organic-dm-14-tab-bot.png`           | Bot tab               | Persona configuration with LOCKED/EDITABLE collapsibles     |
| `flow-ig-organic-dm-300-mobile-gate.png`      | Mobile gate           | "Flow Builder needs a desktop" with conversations CTA       |
| `flow-ig-organic-dm-400-tablet.png`           | Tablet 768px          | Same gate at tablet width                                   |

---

## Skipped Destructive Actions

Actions intentionally not executed during exploration for safety:

| Page                      | Action                       | Reason Skipped                                                |
| ------------------------- | ---------------------------- | ------------------------------------------------------------- |
| /dashboard/flows/[flowId] | "Publish" button (if exists) | Would mutate live runtime — not in session-created safety set |
| /dashboard/flows/[flowId] | Block Delete (canvas)        | Targets seeded blocks, not session-created                    |
| Any page                  | Sending real Instagram DMs   | Outbound side effect on real customers                        |

---

## Next Steps

This report is the raw data. To decide what to fix and in what order:

1. ✅ **Tackle the P0 chrome leaks together as one PR** — "Saved to Supabase," `setter-v2`, `src/lib/prompts/sections/*.ts`, the "DEV" badge, "until flow_id lands on the conversations table." (Shipped 2026-04-28, commit `b47f464`.)
2. ✅ **Kill the render loop** (P0 #7) and **fix the palette overlay click-eating** (B6), plus the simulator focus issue (B7). (Shipped 2026-04-28, commit `3ca92e6`.)
3. **Triage the remaining 9 blockers** — most are missing primary controls (kill switch, support, rollback, search, human takeover) that no fix-up of polish can substitute for. The doc's "single most consequential change" trio (default-to-Inbox + populated metrics + persistent Pause Bot pill) is the highest-leverage next move.
4. **Decide on the stub tabs** (B3 Release, B4 Variables) — either ship them or hide them. Customer-facing UI must not advertise unfinished features.
5. **Run `/grill-me` on this report** to interview through fix priorities before implementation.

**The single most consequential change** based on persona consensus: change the default landing tab from Flow to Inbox, populate the four metrics with real data (with a clear "still wiring this up" footnote if needed), and add a persistent "Bot status: Active. [Pause Bot]" pill in the header on every tab. That trio answers every "is it working / how do I stop it / what did it do today" question that nine of fifteen personas asked first.

Issues marked as blockers are roughly half "not built yet" (Release tab publish, Variables editing, support contact) and half "interaction bugs in shipped code" (render loop, palette overlay, simulator Send button). The user decides which "not yet" features are blocking ship vs roadmap items.
