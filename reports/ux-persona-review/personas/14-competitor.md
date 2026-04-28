# Mike — Competitor's User (33)

Project manager. Two years on ManyChat for our DM funnels, six months on Make.com, and demoed Voiceflow last quarter. I'm here because someone slacked me a link.

## TL;DR

This is not ManyChat. It's also not Voiceflow. It's a third thing — a _prompt-shaped_ flow editor for a _single Instagram bot_ with a built-in LLM playground. The bones are interesting and the Simulator is honestly one of the better things I've seen in this category. But three minutes in I've hit four "wait, where's the…?" moments that ManyChat solved in 2021.

There's no flow list, no IF/ELSE block, no integrations panel, no A/B testing, no templates, no import path, no webhooks, no keyboard shortcuts, and half the tabs are visibly half-built. Switching from ManyChat to this today would cost me a quarter of relearning conventions.

But — the **product is doing something my current stack can't**. ManyChat lets me build a deterministic flowchart that breaks when a prospect goes off-script. This thing lets me edit the _prompt_, with structure, and _test against a live LLM in the same screen._ That's a real differentiator.

**Overall gut feel: 2.5 / 5** — unique stuff is genuinely better than what I'm used to. Familiar stuff is missing or worse.

## Findings

### Flow canvas

**Gut feel: 3/5**

| #   | Page        | Category          | Finding                                                                                                              | Severity          | Persona Rationale                                                                                                      |
| --- | ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| M1  | Flow canvas | Navigation & Flow | **No flow index page.** `/dashboard/flows` returns 404. No UI to list, search, duplicate, archive, or create a flow. | Blocker           | Every competitor opens onto a flow LIST page. Going straight into a single flow is the most jarring difference.        |
| M2  | Flow canvas | Navigation & Flow | **One flow per account, apparently.** No "New flow" button, no flow switcher.                                        | Blocker           | I run 6 flows in ManyChat. If this product locks me to one flow, that's a single-purpose tool.                         |
| M3  | Flow canvas | Navigation & Flow | **No conditional/branching block.**                                                                                  | Critical          | ManyChat's "Condition" block is in 90% of my flows. Without IF/ELSE, can't model "if location = Sydney."               |
| M4  | Flow canvas | Navigation & Flow | **No webhooks / integrations panel.**                                                                                | Critical          | Webhook out is the #1 escape hatch for everything ManyChat doesn't ship natively. Without it I can't connect anything. |
| M5  | Flow canvas | Navigation & Flow | **No A/B testing affordance.**                                                                                       | High              | ManyChat's A/B nodes have been around since 2019.                                                                      |
| M6  | Flow canvas | Navigation & Flow | **No template / starter library.**                                                                                   | High              | Every competitor opens with templates.                                                                                 |
| M7  | Flow canvas | Navigation & Flow | **No import path** from ManyChat / Voiceflow / Botpress.                                                             | Critical          | If you want me to switch, I have 47 ManyChat flows to migrate.                                                         |
| M8  | Flow canvas | Forms & Input     | Block palette has only 8 fixed types                                                                                 | Critical          | ManyChat has ~30 actions. 8 fixed types is a wizard with extra steps.                                                  |
| M9  | Flow canvas | Visual & Layout   | Block cards show _purpose_ in plain English ("Greet warmly...") rather than trigger condition                        | Medium (positive) | This is genuinely better than ManyChat. Showing intent makes canvas readable.                                          |
| M10 | Flow canvas | Visual & Layout   | "8 blocks · 14 routes" stat strip but block cards say "3 exits" — pick one term                                      | Low               | Inconsistent terminology in your _own_ UI on the _same screen_.                                                        |
| M11 | Flow canvas | Feedback & State  | Three header pills simultaneously visible                                                                            | High              | "Saved to Supabase" is naming the technology, not the state. Reads like internal dashboard accidentally shipped.       |
| M12 | Flow canvas | Feedback & State  | **No keyboard shortcuts.** Hit `?`, `Cmd-K`, `/` — nothing                                                           | High              | Voiceflow and Botpress have `Cmd-K`.                                                                                   |
| M13 | Flow canvas | Visual & Layout   | Canvas pan/zoom looks closer to Linear/Figma than ManyChat                                                           | Low (positive)    | Genuinely nicer than ManyChat's chaotic noodle lines.                                                                  |
| M14 | Flow canvas | Trust & Safety    | "Preview replies" prominent, no destructive twin                                                                     | Low (positive)    | Compare ManyChat where Publish and Test sit next to each other and I've fat-fingered Publish.                          |

### Inbox tab

**Gut feel: 2/5**

| #   | Page  | Category          | Finding                                                              | Severity | Persona Rationale                                                                                                  |
| --- | ----- | ----------------- | -------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| M15 | Inbox | Copy & Labels     | "until flow_id lands on the conversations table"                     | Critical | "We know it's broken, we're shipping it anyway" notice. ManyChat would never expose `flow_id` in user-facing copy. |
| M16 | Inbox | Feedback & State  | Empty metric cards `—` with separate "Loading..." spinner            | High     | If metrics aren't wired, hide the cards. Uncanny valley.                                                           |
| M17 | Inbox | Forms & Input     | No keyboard nav, no `j/k`, no search, no filter chips, no date range | High     | ManyChat's Live Chat has search. Front has full keyboard nav. This is read-only tail-the-log.                      |
| M18 | Inbox | Navigation & Flow | "Select a conversation to view the transcript."                      | Medium   | Empty states should help.                                                                                          |
| M19 | Inbox | Trust & Safety    | Inbox shows brand-wide data even on flow-scoped page                 | High     | Will lead to wrong flow getting blamed for wrong conversation.                                                     |

### Variables tab

**Gut feel: 3.5/5** — The best-organized page. Mental model lines up.

| #   | Page      | Category        | Finding                                                                                                                                    | Severity          | Persona Rationale                                                                            |
| --- | --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| M20 | Variables | Visual & Layout | Three-tier hierarchy explicitly explained: "Brand stays put forever, Contact follows a person, Conversation is scoped to a single thread." | High (positive)   | This is _better_ than ManyChat. Cardinality explicit makes memory model click in 30 seconds. |
| M21 | Variables | Forms & Input   | "Reference only / not wired yet." Read-only                                                                                                | Critical          | ManyChat lets me create custom fields inline. If I ask an engineer, this is back to 2014.    |
| M22 | Variables | Forms & Input   | Three banners saying read-only — pill + body + footer                                                                                      | Medium            | One signal is enough.                                                                        |
| M23 | Variables | Visual & Layout | Cards on top + table at bottom for same data                                                                                               | Low               | Single table view with category filters preferable.                                          |
| M24 | Variables | Copy & Labels   | `brand.brand_name` dot-notation namespace                                                                                                  | Medium (positive) | What I'd expect from Make.com or Zapier. Familiar and clean.                                 |

### Release tab

**Gut feel: 1/5** — Worst tab. Marketing copy with no actions.

| #   | Page    | Category          | Finding                                                   | Severity | Persona Rationale                                                                                                                                            |
| --- | ------- | ----------------- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M25 | Release | Navigation & Flow | "Publish controls and release history are not wired yet." | Blocker  | This is the page I came for. Versioning + diff + rollback is the #1 reason I'd pay enterprise. If stub, the "you can edit prompts safely" pitch falls apart. |
| M26 | Release | Navigation & Flow | Four cards describing state without action buttons        | Critical | Voiceflow has Publish + Rollback + Preview as buttons on every version row.                                                                                  |
| M27 | Release | Copy & Labels     | "Compiled from src/lib/prompts/sections/\*.ts"            | High     | Marketers don't know what `*.ts` is.                                                                                                                         |
| M28 | Release | Feedback & State  | "Recommended workflow today" tutorial baked in            | Medium   | After my second visit I'd want to hide it.                                                                                                                   |

### Bot tab

**Gut feel: 3.5/5** — Best information density.

| #   | Page | Category        | Finding                                                                      | Severity          | Persona Rationale                                                                                                                           |
| --- | ---- | --------------- | ---------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| M29 | Bot  | Forms & Input   | LOCKED vs EDITABLE badges on persona sections                                | High (positive)   | ManyChat doesn't give me "you can change tone but not identity." More sophisticated permission model than most platforms. Smart governance. |
| M30 | Bot  | Forms & Input   | Display name placeholder, no save button, no autosave indicator              | Medium            | ManyChat shows "Saved" toast every change.                                                                                                  |
| M31 | Bot  | Visual & Layout | Sections collapse with chevron. No "Expand all" / "Collapse all"             | Low               | Botpress and Make have these.                                                                                                               |
| M32 | Bot  | Copy & Labels   | "Parsed from the live system prompt." — engineer-speak                       | Low               | "Read directly from the live bot rules" would land better.                                                                                  |
| M33 | Bot  | Trust & Safety  | Voice section ships actual content visible: "Warm, direct, locally aware..." | Medium (positive) | More transparent than ManyChat hiding voice settings 4 clicks deep.                                                                         |

### Simulator (Preview replies)

**Gut feel: 4/5** — Standout feature.

| #   | Page      | Category         | Finding                                                  | Severity            | Persona Rationale                                                                                                                                                     |
| --- | --------- | ---------------- | -------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M34 | Simulator | Forms & Input    | **Inline live LLM preview tied to canvas/block context** | Critical (positive) | This is **the feature.** ManyChat's preview is deterministic-only. Voiceflow's tester is a separate panel. Inline LLM testing while editing is a real differentiator. |
| M35 | Simulator | Forms & Input    | "Side decode / Mom decode / Ready to book" presets       | High (positive)     | One-click prospect personas. Saves time.                                                                                                                              |
| M36 | Simulator | Forms & Input    | "Send" disabled forever; actual fire control is "Run"    | High                | If "Send" is disabled forever, drop it. "Run" vs "Send" is confusing.                                                                                                 |
| M37 | Simulator | Visual & Layout  | Floating panel covers right of canvas                    | Medium              | Make.com docks the test panel; Voiceflow docks. Add a dock-right option.                                                                                              |
| M38 | Simulator | Forms & Input    | No way to set variable overrides for simulated session   | High                | Voiceflow's tester has Variables sidebar for override-per-simulation.                                                                                                 |
| M39 | Simulator | Feedback & State | No saved "test scenarios" library                        | High                | Voiceflow has "Test Suites." Without saved scenarios, every test rebuilt from memory.                                                                                 |
| M40 | Simulator | Visual & Layout  | Chat bubbles styled like Instagram DMs                   | Low (positive)      | Cute and useful. Grounds me in _which channel_ I'm testing.                                                                                                           |

### Palette drawer

**Gut feel: 2/5**

| #   | Page    | Category         | Finding                                                                  | Severity       | Persona Rationale                                                                                                       |
| --- | ------- | ---------------- | ------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| M41 | Palette | Forms & Input    | No search input                                                          | Medium         | At 8 items not painful. At 30+ it would be.                                                                             |
| M42 | Palette | Visual & Layout  | Items use _flow stages_ (Opening / Qualifier / Booking) not _primitives_ | Critical       | Every other tool separates primitive (Send Message, Set Variable, HTTP) from purpose. Limits ceiling for custom builds. |
| M43 | Palette | Feedback & State | Overlay intercepts canvas pointer events                                 | High           | Voiceflow had this exact bug in 2022 and shipped a fix in three sprints.                                                |
| M44 | Palette | Visual & Layout  | Left-side drawer pushed from workspace                                   | Low (positive) | Better than Make's modal.                                                                                               |

### Flow Index

**Gut feel: 1/5** — Doesn't exist.

| #   | Page                       | Category          | Finding                                                 | Severity | Persona Rationale                                                                                            |
| --- | -------------------------- | ----------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| M45 | /dashboard/flows           | Navigation & Flow | Returns 404. No flow list, no create button, no archive | Blocker  | _The_ most jarring missing page.                                                                             |
| M46 | /dashboard/flows/<garbage> | Navigation & Flow | Random nonsense IDs render seeded flow instead of 404   | High     | Either route doesn't validate (security/sanity) or all IDs share a fallback (data-leak). Neither acceptable. |

## Category scores (1-5)

- **Navigation & Flow** — **1.5.** Flow index missing, tabs don't update URL, random IDs render real flows.
- **Copy & Labels** — **2.5.** Block copy genuinely better than ManyChat. But internal engineering language leaks on three screens.
- **Forms & Input** — **2.** Read-only Variables. Disabled Send. No shortcuts. No multi-select.
- **Visual & Layout** — **3.5.** Highest category. Canvas cleaner than ManyChat. Variables hierarchy more articulate. Bot persona model novel.
- **Feedback & State** — **2.** Console floods. Loading states double. Empty cards. ManyChat feels rock-solid by comparison.
- **Trust & Safety** — **2.5.** Locked persona model _more_ trustworthy. Inbox brand-wide _less_ trustworthy.
- **Accessibility** — **2.** No keyboard shortcuts. Voiceflow has Cmd-K, that's the bar.
- **Gut Feel** — **2.5.** Another look in 6 months. Today no.

## What's surprisingly BETTER

1. **Inline LLM Simulator tied to canvas.** Genuinely different experience.
2. **Block descriptions show INTENT, not message preview.**
3. **Variables organized into Brand/Contact/Conversation scopes with cardinality explained.**
4. **Bot tab's LOCKED vs EDITABLE persona sections.**
5. **Persona presets in Simulator** (Side decode / Mom decode / Ready to book).

## What's annoyingly WORSE

1. **No flow index page.**
2. **Apparently locked to one flow per brand.**
3. **No IF/ELSE / Conditional block.**
4. **No webhooks / integrations panel.**
5. **No A/B testing / split node.**
6. **No template / starter library.**
7. **No import path.**
8. **No keyboard shortcuts.**
9. **Tabs don't update URL.**
10. **Half the app is "not wired yet."**

## Five-minute switching-cost calculation

If my agency told me today "switch from ManyChat to InstaSetter":

- Migration time: ~22 person-weeks of rebuilding
- Feature parity gap: No webhooks (showstopper), no IF/ELSE (showstopper), no multi-flow (showstopper), no A/B, no templates, no import
- **Net answer:** Push back hard. Not because product is bad — because table-stakes gap is too wide.

In 6 months with multi-flow + webhooks + IF/ELSE + Versioning + Import:

- **Net answer:** Run a side-by-side pilot.

## My top 10 issues

1. **Ship a flow index page.**
2. **Multi-flow support.**
3. **Add IF/ELSE / Conditional block.**
4. **Add Webhook / HTTP block.**
5. **Fix the Release tab.**
6. **Make Variables editable.**
7. **URL the tabs.**
8. **Make Simulator's Send button work.**
9. **Drop engineering vocabulary from user-facing copy.**
10. **Ship Cmd-K + a `?` shortcut overlay.**

## Bottom line

Saying "this is a ManyChat competitor" sells it short — and damns it. It's not trying to be ManyChat. The unique features (inline LLM Simulator, intent-first block descriptions, scoped Variables, persona locking) point at a different product entirely: a _prompt-aware_ flow editor for LLM-powered DM bots. There's a real wedge here.

The single thing that would make me re-evaluate fastest: **multi-flow + a Webhook block + a working Release tab.**

— Mike
