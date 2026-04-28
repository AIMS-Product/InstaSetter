# Persona Review: Marcus — Impatient Power User

## Summary

- **Pages reviewed:** 8 (Flow canvas, Inbox, Variables, Release, Bot, Simulator panel, Palette drawer, Mobile gate, Unknown-flow fallback)
- **Issues:** 38
- **Blockers:** 4
- **Overall gut feel:** **2 / 5** — functional, looks alright, but it was clearly not designed for someone who works fast. No Cmd-K. No shortcut overlay. Tabs don't change the URL. The simulator's primary action is _disabled_. The console is barfing 30+ React loop errors. I am not in love.

---

## Page-by-Page Review

### Flow tab (canvas) — `/dashboard/flows/ig-organic-dm`

**Gut feel: 2/5** — The canvas LOOKS like Linear/Figma but the keyboard story is non-existent and the click targets fight each other.

| #   | Page        | Category                  | Finding                                                                                                                                                                                  | Severity | Persona Rationale                                                                                                                                         |
| --- | ----------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Flow canvas | Accessibility & Inclusion | No Cmd-K / global command palette anywhere                                                                                                                                               | Critical | I open Cmd-K on every app I touch. Its absence is the first thing I noticed and the reason my hand hovered over Cmd-W.                                    |
| 2   | Flow canvas | Accessibility & Inclusion | No keyboard shortcut overlay (`?` does nothing)                                                                                                                                          | Critical | Every serious tool — Linear, Notion, Figma, Superhuman, Stripe — has one. If I can't `?` to learn the keys, I assume there are none.                      |
| 3   | Flow canvas | Accessibility & Inclusion | Zoom in / Zoom out / Fit view buttons have no visible shortcuts (no `Cmd +`, `Cmd 0`)                                                                                                    | High     | Figma muscle memory dies the second I have to mouse to a tiny corner button.                                                                              |
| 4   | Flow canvas | Accessibility & Inclusion | No undo/redo affordance visible. No `Cmd-Z` indicator. ROUTE-MAP says Toast does undo but it's hidden until something happens                                                            | Critical | I edit, then I edit, then I `Cmd-Z`. If I can't predict that works I won't touch the canvas.                                                              |
| 5   | Flow canvas | Accessibility & Inclusion | No multi-select. Shift-click doesn't appear to do anything. No marquee select                                                                                                            | Critical | Bulk operations on blocks is table stakes. Touching 8 nodes one at a time is theatre.                                                                     |
| 6   | Flow canvas | Feedback & State          | Console error: "Maximum update depth exceeded" appears 30+ times during normal navigation                                                                                                | Blocker  | Every one of these is a render-loop tax on my CPU. App will feel sluggish under any real load. Power users notice this in the first 30s.                  |
| 7   | Flow canvas | Navigation & Flow         | Tabs (Flow/Inbox/Variables/Release/Bot) swap content but DON'T change the URL                                                                                                            | Critical | I cannot Slack a teammate "look at the Bot tab" with a link. Cannot reload to the same view. Cannot bookmark. Cannot back-button between them. Hard fail. |
| 8   | Flow canvas | Navigation & Flow         | `/dashboard/flows` (no ID) returns 404 — there's no flow index                                                                                                                           | High     | If I forget the flow ID, I have to dig through the dashboard. There should always be an index.                                                            |
| 9   | Flow canvas | Navigation & Flow         | `/dashboard/flows/<garbage>` happily renders the seeded flow instead of 404                                                                                                              | High     | This is silently routing nonsense IDs to a real flow. As a dev I'd file a bug; as a PM I'd assume the URL was wrong but be misled.                        |
| 10  | Flow canvas | Forms & Input             | Block click intercepted by overlay. The Playwright log shows clicks on "Qualifier" being eaten by `<div>Block library</div>` — meaning the palette drawer is overlaying clickable canvas | Critical | If automation can't click a node, my drag-and-drop probably suffers too. Z-index hell in interactive canvases is unforgivable.                            |
| 11  | Flow canvas | Visual & Layout           | Sidebar tabs use a verbose two-line label ("Flow / Edit the draft", "Inbox / Review real chats", etc.) and a giant icon                                                                  | Medium   | Wastes vertical real estate. Power users want compact navigation, not friendly subtitles. Either show subtitles on hover or kill them.                    |
| 12  | Flow canvas | Visual & Layout           | "Shared draft workspace." floating tiny grey label at the bottom of the sidebar — looks like dead text                                                                                   | Low      | Unclear what it tells me. Either make it functional (link, dropdown) or remove it.                                                                        |
| 13  | Flow canvas | Copy & Labels             | "Unpublished edits / Saved to Supabase / Live: setter-v2" — three pills with three different states all together. Confusing semantics                                                    | High     | Am I saved or not? Are my edits live? "Saved to Supabase" tells me a _technology_, not a state. Power users want one clear state pill.                    |
| 14  | Flow canvas | Copy & Labels             | "8 blocks · 14 routes" — what's a route vs an exit? "Opening — 3 exits" and "14 routes" use different vocabulary                                                                         | Medium   | Standardise the term. Pick "exits" or "edges" or "routes" and stick with it. Inconsistent terms slow me down.                                             |
| 15  | Flow canvas | Visual & Layout           | Three colourful pill clusters in the lower right ("preview", "actions"?) — no label, just colour                                                                                         | Low      | I don't know what those pills do without hovering. Mystery meat.                                                                                          |
| 16  | Flow canvas | Trust & Safety            | "Preview replies" button: I can't tell from the label that it opens a sandbox                                                                                                            | Low      | "Open simulator" or "Test reply" would be clearer. "Preview" suggests read-only.                                                                          |

### Inbox tab (Brand inbox)

**Gut feel: 2/5** — Loads slow. Big amber warning banner. Loading spinner top right _and_ "Loading conversations…" in the body. Empty metric cards. Looks half-built.

| #   | Page  | Category          | Finding                                                                                                                                                                                                  | Severity | Persona Rationale                                                                                                          |
| --- | ----- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| 17  | Inbox | Feedback & State  | Two simultaneous "Loading…" indicators — one tiny in the header, one large in the conversation list                                                                                                      | Medium   | Pick one. Two loaders make me think something's stuck.                                                                     |
| 18  | Inbox | Feedback & State  | Metric cards (STARTED TODAY / BOOKED / COMPLETED / STALLED) show empty `—` with no skeleton                                                                                                              | High     | I don't know if these are zero, or loading, or unwired. Looks broken.                                                      |
| 19  | Inbox | Copy & Labels     | "Brand-wide only" amber banner: "Inbox metrics and transcripts below include all VendingPreneurs conversations until flow_id lands on the conversations table" — I don't care about your migration story | Critical | This is internal engineering jargon dumped on the user. Either fix it or hide it behind a small info icon.                 |
| 20  | Inbox | Forms & Input     | No keyboard navigation between conversations visible. No `j/k` to move down the list                                                                                                                     | High     | Inbox without `j/k` keyboard nav in 2026 is unacceptable. Every modern inbox does this (Gmail, Linear, Front, Superhuman). |
| 21  | Inbox | Navigation & Flow | "Select a conversation to view the transcript" is the only thing in the right pane — no recent / pinned / search                                                                                         | High     | Empty state should suggest something. Search box at minimum.                                                               |

### Variables tab

**Gut feel: 3/5** — Cleanest screen in the app. Three-column hierarchy is decent. Still missing search and edit-in-place.

| #   | Page      | Category          | Finding                                                                                                                                              | Severity | Persona Rationale                                                                    |
| --- | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| 22  | Variables | Forms & Input     | "Set manually" with no inline edit — there's no obvious way to change `brand.brand_name` from this page                                              | High     | If I can see the value, I want to change it here. Not click-through to another page. |
| 23  | Variables | Copy & Labels     | "Reference only" pill plus "REFERENCE ONLY" banner plus "Creating variables and row-level actions is not wired yet" — three ways of saying read-only | Medium   | One read-only banner. Done. Repetition signals a half-finished feature.              |
| 24  | Variables | Navigation & Flow | No filter / search across variables. The full table at the bottom requires scrolling                                                                 | High     | If there were 50 variables I'd be in scroll hell. Add a `Cmd-F` style filter.        |
| 25  | Variables | Visual & Layout   | Three category cards on top, then a separate Brand table below — same data, two visual treatments                                                    | Medium   | Pick a hierarchy. Inconsistent presentation costs me a parse.                        |

### Release tab

**Gut feel: 2/5** — Marketing copy, no actions. Useless to a power user.

| #   | Page    | Category          | Finding                                                                                            | Severity | Persona Rationale                                                                                |
| --- | ------- | ----------------- | -------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| 26  | Release | Navigation & Flow | "Publish controls and release history are not wired yet" — entire tab is a stub                    | Critical | If it's not wired, hide it. Don't show me a tab I can't act on. Wastes a click and erodes trust. |
| 27  | Release | Copy & Labels     | Four cards with bullet circles in different colours and no key/legend — what does the colour mean? | Medium   | If the dot is semantic, label it. If decorative, make it less prominent.                         |
| 28  | Release | Feedback & State  | "Recommended workflow today" reads like a tutorial that won't go away                              | High     | Power users don't need step 1/2/3 every visit. Make it dismissable, or move to a help flyout.    |

### Bot tab

**Gut feel: 3/5** — Best information density of the bunch. Locked vs editable distinction is good. Still missing search across rules.

| #   | Page | Category        | Finding                                                                                                                       | Severity | Persona Rationale                                                                      |
| --- | ---- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| 29  | Bot  | Forms & Input   | "Display name" empty input shows placeholder "Not named — shared team inbox". Saving state unclear                            | Medium   | I type, then what? No save button visible. No autosave indicator. Don't make me guess. |
| 30  | Bot  | Forms & Input   | Sections collapse/expand by clicking the chevron. Need to expand each one to see content                                      | Medium   | Add "Expand all / Collapse all" and a `/` to focus search.                             |
| 31  | Bot  | Visual & Layout | Three sections visible with `LOCKED` and `EDITABLE` badges; one is open by default. No way to filter to "show only editable"  | Medium   | If half the sections are read-only, I want a toggle to hide them.                      |
| 32  | Bot  | Copy & Labels   | "Parsed from the live system prompt. Each section shows what's editable vs locked" — the word "parsed" is implementation-leak | Low      | Marketing-facing copy says "parsed" — that's a developer's word.                       |

### Simulator (BSimFloat)

**Gut feel: 1/5** — The primary action is **disabled**. End of review.

| #   | Page      | Category         | Finding                                                                                               | Severity | Persona Rationale                                                                                                                                                                       |
| --- | --------- | ---------------- | ----------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 33  | Simulator | Forms & Input    | The "Send" button is `<button disabled>` — Playwright fell back to "Run" to actually fire the message | Blocker  | This is the simulator's whole job. If "Send" is disabled and an unlabelled "Run" is the real button, I will not figure that out. The exploration log proves automation couldn't either. |
| 34  | Simulator | Copy & Labels    | "Try a real prospect opener" — long heading for a simple input                                        | Low      | One line of placeholder text in the input would do.                                                                                                                                     |
| 35  | Simulator | Forms & Input    | No `Cmd-Enter` or `Enter` to send shown. No textarea-style multi-line.                                | High     | Every chat / playground UI lets me hit Enter to send. If this needs Cmd-Enter, label it (`Cmd↵ Send`).                                                                                  |
| 36  | Simulator | Feedback & State | Floating panel covers part of the canvas — no way to dock left/right or pin                           | Medium   | I want to see the canvas AND the simulator side-by-side. Stop floating it on top.                                                                                                       |

### Palette drawer (Block library)

**Gut feel: 2/5** — Good idea, broken execution. Z-index issues prove this.

| #   | Page    | Category                  | Finding                                                                                                                        | Severity | Persona Rationale                                                                                                     |
| --- | ------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 37  | Palette | Forms & Input             | No search input in the palette — 8+ block types and growing, I have to scan                                                    | High     | Every component palette I've used in the last 5 years has search.                                                     |
| 38  | Palette | Accessibility & Inclusion | Palette overlays canvas and intercepts pointer events on canvas blocks (Playwright log shows "Block library" eating the click) | Blocker  | This is a real interaction bug. Click the wrong pixel and you hit the wrong thing. Power users feel this immediately. |

### Mobile gate (< 1024px)

**Gut feel: 3/5** — Honest about the limitation. Fine. But why offer no read-only canvas?

| #     | Page        | Category          | Finding                                                                                                                                                                  | Severity | Persona Rationale                                               |
| ----- | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------- |
| Mob-1 | Mobile gate | Navigation & Flow | Hard gate at < 1024px — no read-only fallback for "I want to glance at the flow on my iPad mini"                                                                         | Medium   | I'm a PM. I'm in meetings on a tablet. Read-only would suffice. |
| Mob-2 | Mobile gate | Copy & Labels     | "Editing the flow uses a multi-panel canvas that doesn't fit on a phone or small tablet. Open this page on a screen at least 1024px wide." — this copy is fine but wordy | Low      | One short sentence + one button.                                |

---

## Blockers

1. **Tabs don't change the URL.** Cannot share, bookmark, reload, or back-button between Flow / Inbox / Variables / Release / Bot. Hard table-stakes failure for any modern web app.
2. **Console floods with "Maximum update depth exceeded" — 30+ times during a single navigation.** This is a runtime perf bomb and a dev-discipline red flag. Every render loop heats my fan.
3. **Simulator "Send" is disabled** — exploration had to fall back to a "Run" button. The primary action of the primary testing tool doesn't work.
4. **Palette drawer eats canvas clicks.** Z-index / pointer-events bug means clicking on a real block sometimes hits the overlay. This is the kind of bug that makes me close the tab.

---

## My Top 10 Issues

1. **No Cmd-K, no command palette, no shortcut overlay.** This is a 2026 product? Bare minimum, ship `Cmd-K` to jump between tabs/blocks/variables. Bonus: `?` for a shortcut sheet.
2. **Tabs don't update the URL.** Make Flow / Inbox / Variables / Release / Bot real routes (or at least `?tab=bot`). Right now the app is unlinkable.
3. **30+ React render-loop errors in the console.** Fix the `useEffect` dependency that's setting state on every render. This is going to compound under real data.
4. **Simulator's primary "Send" button is disabled.** Either remove the disabled button or make Enter / Cmd-Enter the real send. Don't ship a chat with broken send.
5. **Palette overlay intercepts clicks on canvas blocks.** Either dim/disable canvas while palette is open, or dismiss the palette on outside click and properly stack pointer events.
6. **No keyboard navigation.** No `j/k` in inbox, no `Tab` cycle in canvas (`Tab x5` did nothing visible per the log), no `Cmd-Z`/`Cmd-Shift-Z`, no `Cmd +`/`Cmd 0` for zoom, no `/` to focus search anywhere. Add at least: tab-cycle blocks, arrow keys to move selected node, Cmd-Z undo.
7. **No multi-select.** Shift-click + marquee select on canvas blocks. Power users need to delete/move groups.
8. **Three "saved/published/live" pills in the header simultaneously.** Collapse to one pill that tells me unambiguously: "Draft saved" or "Edits unpublished — Cmd-Shift-P to publish".
9. **Half the app is "not wired yet."** Variables (read-only banner), Release (entire tab is a stub), Bot (display name unclear if it saves). Hide unfinished tabs behind a feature flag instead of showing me dead UI.
10. **No URL-based deep linking to a block.** I should be able to send a teammate `/dashboard/flows/ig-organic-dm?block=qualifier` and land them on the selected block with the inspector open. Right now there's no way to share a specific block.

---

**Verdict:** I'd give this 90 seconds before clicking "Cancel my trial." The bones are there — the canvas is pretty, the Bot tab is well-organised, the Variables hierarchy makes sense. But every single power-user expectation is missing or broken: no Cmd-K, no URL tabs, broken simulator Send, console errors everywhere, click-eating overlays, no keyboard nav, no multi-select. Fix three things first: URL the tabs, kill the render loop, and make the simulator's Send actually send. Then we can talk about Cmd-K.
