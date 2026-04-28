# Persona Review: Karen — Angry Frustrated User (47)

## Context I'm walking in with

My client just called me yelling. Their bot — _my_ bot, the one I sold them on — sent something embarrassing to a real prospect on Instagram. I am pissed.

I need three things, in order:

1. **Stop the bot.** Right now.
2. **Find the bad message.** I need to read it.
3. **Take over the conversation manually.** Apologise like a human.

Then **roll back** the prompt change, and **someone to call** when I can't figure it out.

## Summary

- **Pages reviewed:** 7
- **Issues:** 32
- **Blockers:** 6
- **Overall gut feel:** **1 / 5** — This app is _actively hostile_ to a frustrated user. There is no kill switch. There is no support link. There is no rollback. There is no way to filter the inbox to find the prospect. Half the things I need say "not wired yet." If my bot goes rogue, this app does not let me stop it.

## What's missing entirely

| #   | What I needed                                                        | What I found                                                                                                | Severity     |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | **PAUSE THE BOT** — kill switch                                      | Nothing. Anywhere. Header, every tab, Bot tab, Release tab — no button on this page that turns the bot off. | **Blocker**  |
| 2   | A **support link** — phone, email, "contact us", live chat, "?" icon | Nothing. No support email, no contact link, no help menu.                                                   | **Blocker**  |
| 3   | A way to **find the angry prospect**                                 | Inbox is "Brand-wide only" — no search box, no filter, no Instagram handle field, no date range.            | **Blocker**  |
| 4   | A **"take over conversation" / human handoff** button                | Inbox right pane only says "Select a conversation to view the transcript." No "reply manually" affordance.  | **Blocker**  |
| 5   | A **rollback / revert** button                                       | Release tab: "Publish controls and release history are not wired yet."                                      | **Blocker**  |
| 6   | An **undo** of last edit                                             | No `Cmd-Z` indicator. No undo button. No "last saved 2 minutes ago — restore" link.                         | **Critical** |

That's six blockers before I've reviewed a single page.

## Page-by-Page Review

### Flow canvas

**Gut feel: 1/5** — Pretty boxes. Nice colours. None of which help me right now.

| #   | Category          | Finding                                                                                        | Severity    | Persona Rationale                                                                                   |
| --- | ----------------- | ---------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| 7   | Trust & Safety    | **No kill switch in the header.**                                                              | **Blocker** | If my bot is misbehaving the _first thing_ I should see is a giant red Pause button. Not "Preview." |
| 8   | Copy & Labels     | "Live: setter-v2" pill — green dot. **Looks healthy. Is the literal source of the bad reply.** | Critical    | Green dot makes me think things are fine. They are not. Need way to flag a live prompt as suspect.  |
| 9   | Trust & Safety    | "Unpublished edits" pill — I don't know if my edits are live, staged, or about to go live      | Critical    | Scared to click anything because I don't know what's deployed.                                      |
| 10  | Copy & Labels     | "Saved to Supabase" — what is a Supabase? I don't care about your database.                    | High        | Tell me if my work is _safe_.                                                                       |
| 11  | Navigation & Flow | Five tabs all on same URL — can't right-click "open in new tab"                                | High        | I want bot rules in one tab and broken conversation in another. I cannot.                           |
| 12  | Feedback & State  | Console throws **30+ "Maximum update depth exceeded" errors**                                  | **Blocker** | If I open dev tools, the app looks _broken_. Asking for a refund.                                   |
| 13  | Trust & Safety    | Canvas seeds for _any_ flow ID I type                                                          | Critical    | Type wrong flow ID by accident → fake data that looks real. I'd act on it.                          |
| 14  | Copy & Labels     | "Edit the shared draft and sanity-check tone before anything ships."                           | Medium      | Copy implies prevention. Runtime didn't deliver.                                                    |
| 15  | Navigation & Flow | Block in canvas — which one caused the bad reply? **No way to know.**                          | Critical    | Need a "trace" — given a bad message, which block produced it?                                      |

### Inbox tab

**Gut feel: 1/5** — _Uniquely_ useless to me.

| #   | Category          | Finding                                                         | Severity    | Persona Rationale                                                                                         |
| --- | ----------------- | --------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| 16  | Forms & Input     | **No search box.** Anywhere.                                    | **Blocker** | I have ONE prospect to find. Client gave me their handle. No field to type it in.                         |
| 17  | Forms & Input     | **No filter by date, status, or block.**                        | **Blocker** | "Last hour" is enough info — except no time filter.                                                       |
| 18  | Copy & Labels     | Amber warning: "until flow_id lands on the conversations table" | **Blocker** | Database migration sentence. Reads as "this data might be wrong." Can't trust this for incident response. |
| 19  | Feedback & State  | Four empty metric cards `—`                                     | Critical    | Are those zero? Loading? Broken? Looks dead.                                                              |
| 20  | Feedback & State  | Two simultaneous "Loading…" states                              | Medium      | Can't tell if working or stuck.                                                                           |
| 21  | Trust & Safety    | **No "Take over conversation" or "Pause this thread"** button   | **Blocker** | The instant I find the bad conversation I should be one click from "stop bot, let me reply manually."     |
| 22  | Trust & Safety    | No "Mark as needs review" / "Flag for QA"                       | Critical    | Want to flag for client and possibly legal. No way.                                                       |
| 23  | Navigation & Flow | "Brand-wide only" badge is passive label, not action            | Medium      | If known limitation, give me "Switch to flow-scoped view" — even disabled with tooltip.                   |
| 24  | Copy & Labels     | "while per-flow attribution is still being wired"               | High        | So this _isn't_ the real inbox. I don't know whether to trust it.                                         |

### Variables tab

**Gut feel: 2/5** — Pretty. Read-only. Mocks me.

| #   | Category       | Finding                                                                         | Severity | Persona Rationale                                                                                     |
| --- | -------------- | ------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| 25  | Trust & Safety | "Reference only" + "Creating variables and row-level actions is not wired yet." | Critical | I came to maybe edit `brand.brand_name` because that might be the source. **I cannot edit anything.** |
| 26  | Copy & Labels  | Booking URL with tiny `url` chip                                                | Low      | Fine. But I can't click to test it.                                                                   |
| 27  | Forms & Input  | Brand timezone shows "not set" in light grey                                    | Medium   | If timezone isn't set, bot might send replies at 3am. Should be required.                             |

### Release tab

**Gut feel: 1/5** — This is the page that should save me. It does the opposite.

| #   | Category          | Finding                                                                                 | Severity    | Persona Rationale                                                                                       |
| --- | ----------------- | --------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| 28  | Trust & Safety    | "Publish controls and release history are not wired yet."                               | **Blocker** | This page exists _for the explicit purpose_ of giving me rollback. It is admittedly non-functional.     |
| 29  | Copy & Labels     | Four cards with "Compiled from src/lib/prompts/sections/\*.ts"                          | Critical    | A file path. To me. The marketer. With an angry client. I do not know what `*.ts` is and don't want to. |
| 30  | Trust & Safety    | "New conversations still use the compiled setter-v2 prompt until publish wiring lands." | Critical    | So my edits _aren't_ the live behaviour? Then why is "Unpublished edits" lit up?                        |
| 31  | Navigation & Flow | "Recommended workflow today" section                                                    | Medium      | A "workflow" doesn't help when bot is on fire. Where's the **incident** workflow?                       |
| 32  | Trust & Safety    | No "Pause publishing", no "Roll back", no version list                                  | **Blocker** | If something goes wrong I should be one button from a known-good version.                               |

### Bot tab

**Gut feel: 2/5** — I can read the rules. I cannot turn the bot off.

| #   | Category       | Finding                                                                 | Severity    | Persona Rationale                                                                                                          |
| --- | -------------- | ----------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| 33  | Trust & Safety | Bot has no name — "Display name" empty                                  | High        | If a prospect asks "who am I talking to?" the bot doesn't know. Could explain weird reply. No "danger, undefined" warning. |
| 34  | Copy & Labels  | LOCKED on Identity, EDITABLE on Voice, LOCKED on Message Length         | High        | "Locked" — by whom? Legal? Tech? Behind an upgrade? No tooltip.                                                            |
| 35  | Trust & Safety | Voice section is free-text area                                         | Medium      | If marketer pastes paragraph contradicting locked Identity, who wins at runtime? Nothing tells me.                         |
| 36  | Forms & Input  | No "test this rule change" button. No "draft / publish" within Bot tab. | Critical    | I'd be petrified to edit anything mid-incident.                                                                            |
| 37  | Trust & Safety | **No "Pause the bot" toggle on the page that controls the bot.**        | **Blocker** | Of all pages, this should have the kill switch.                                                                            |

### Simulator

**Gut feel: 2/5**

| #   | Category         | Finding                                                                         | Severity | Persona Rationale                                                              |
| --- | ---------------- | ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| 38  | Forms & Input    | Send button permanently disabled per exploration log                            | Critical | Tried to send. Nothing. I'd assume simulator is broken.                        |
| 39  | Copy & Labels    | "Side chamber" / "Prep camera" buttons                                          | High     | Don't read like buttons in a chat simulator. Like typo or untranslated copy.   |
| 40  | Trust & Safety   | Simulator runs _live_ prompt only                                               | Critical | Edit draft, but simulator runs live one. Can't actually test my fix. Catch-22. |
| 41  | Feedback & State | No "send a real prospect's message and see what bot would have replied" feature | High     | Literal need: paste the prospect's last DM.                                    |

### Palette drawer

**Gut feel: 2/5**

| #   | Category          | Finding                                                                    | Severity | Persona Rationale                                      |
| --- | ----------------- | -------------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| 42  | Navigation & Flow | Palette overlays canvas and **steals click events from blocks underneath** | Critical | Even _closing_ the palette is a fight.                 |
| 43  | Copy & Labels     | "Block library" with list                                                  | Low      | Doesn't help me. I'm trying to _read_ what's deployed. |

### Mobile gate

**Gut feel: 1/5** — In the car between meetings. Phone is the only thing I have.

| #   | Category       | Finding                                                                | Severity    | Persona Rationale                                                                 |
| --- | -------------- | ---------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| 44  | Trust & Safety | "Editing requires desktop." Only mobile action: "Open conversations →" | **Blocker** | **My bot is on fire. I am on my phone. I cannot pause it.**                       |
| 45  | Copy & Labels  | "You can still monitor live conversations on your phone."              | Critical    | "Monitor" is passive. I want to _intervene_.                                      |
| 46  | Trust & Safety | No emergency-pause that _does_ fit on mobile                           | **Blocker** | Every modern automation product has at least _one_ mobile-accessible kill switch. |

## What would fix the worst

1. **A persistent header element on every tab — "Bot status: Active. [Pause Bot]"** — single most important fix.
2. **A search box and date filter in the Inbox.**
3. **A "Take over" button per conversation.**
4. **A "Roll back to last live version" button on the Release tab.**
5. **A help icon, top-right, every page.**
6. **An incident playbook on the Release tab.** "Something went wrong? 1. Pause the bot. 2. Find the conversation. 3. Take over. 4. Roll back. 5. Contact support."
7. **Stop saying "not wired yet"** in production UI.
8. **Strip the engineering language.**

## Final word

I sell this to my clients on the promise that it makes their lives _easier_ and _safer_. Right now, when something goes wrong, the app is _less_ helpful than a junior VA — at least the VA picks up the phone.

I am going home and pouring a large glass of wine. Then calling my client and apologising. Then on Monday, evaluating ManyChat. **Fix this before someone else's bot makes them call me.**

— Karen
