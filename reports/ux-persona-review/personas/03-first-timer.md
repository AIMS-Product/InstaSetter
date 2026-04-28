# Sam — First-Time Visitor (28)

I clicked a link from social media. I have no idea what InstaSetter is. I'll give this 10 seconds before I close the tab.

## Summary

I'm staring at the screen and… what is this? The logo says "InstaSetter." There's a thing called "Flow Builder." There's a brand pill that says "VendingPreneurs" — am I VendingPreneurs? Am I supposed to be? There's an orange "DEV" tag next to my name which feels like I'm in a place I shouldn't be.

The page heading "Instagram DM Flow" with subtitle "Edit the shared draft and sanity-check tone before anything ships." Ships where? To who? I don't have an Instagram product. I don't know what "the shared draft" is. Three pills: "Unpublished edits," "Saved to Supabase" (Supa-what?), "Live: setter-v2" (setter as in dog?).

Below: huge canvas with rectangles connected by lines — Opening, Qualifier, Objection Handler, Booking Handoff, Email Capture. Looks like a flowchart of some kind of conversation. But I don't know what the product _does_. There's no "What is InstaSetter?" copy anywhere. No demo, no tour, no help link, no pricing, no login wall — I'm just dropped in someone's workspace. No "About," no docs, no contact.

I'd close in about 8 seconds.

**Overall gut feel: 1/5.** No idea what this product is, what it does, what I'm supposed to do, or whether I'm in the right place.

## Page-by-Page Review

### Page 1 — `/dashboard/flows/ig-organic-dm` (Flow tab — default landing)

The first thing: "VENDINGPRENEURS / Instagram DM Flow." I cannot tell if VendingPreneurs is the product, a customer, or my own pre-set demo account. The orange DEV pill makes it look broken.

Subtitle: every key phrase is jargon — "Organic DM," "shared draft," "ships." Then three status pills: "Unpublished edits" / "Saved to Supabase" / "Live: setter-v2" — all inscrutable. "Saved to Supabase" actively hurts trust — that's a database name. Like a restaurant menu saying "stored in our walk-in fridge."

Left sidebar: Flow / Inbox / Variables / Release / Bot — taglines help but reinforce I'm in a builder, not a website. Canvas itself is genuinely cool-looking, but I don't know if I'm meant to edit it, watch a demo, or just look. There's literally no headline, no hero copy, no value proposition.

| Category          | Score   | Notes                                                                                       |
| ----------------- | ------- | ------------------------------------------------------------------------------------------- |
| Navigation & Flow | 2/5     | Two competing nav systems with no explanation.                                              |
| Copy & Labels     | 1/5     | "Saved to Supabase," "setter-v2," "Organic DM," "shared draft," "ships" — wall of jargon.   |
| Visual & Layout   | 4/5     | Honestly looks clean. Linear-y vibes. But polished view of nothing I understand.            |
| Feedback & State  | 2/5     | Three status pills with no tooltips. Orange "Unpublished edits" feels like a warning at me. |
| Trust & Safety    | 1/5     | "Saved to Supabase" + "DEV" + version names = leaked staging environment.                   |
| Accessibility     | 4/5     | Skip-link present, contrast ok.                                                             |
| **Gut feel**      | **1/5** | I'd close the tab.                                                                          |

### Page 2 — Inbox tab

Header now says "Brand inbox" with a banner: "_Use this inbox to spot reply quality issues, stalled leads, and booking events while per-flow attribution is still being wired into the conversation records._" That's literally a developer's TODO list. Below: "BRAND-WIDE ONLY" warning with `flow_id` and "conversations table" — database schema notes.

Four metric tiles all empty placeholders showing dashes.

| Category        | Score   | Notes                                                                     |
| --------------- | ------- | ------------------------------------------------------------------------- |
| Copy & Labels   | 1/5     | "until X lands on Y table" — engineering ticket titles, not product copy. |
| Visual & Layout | 2/5     | Loading state placeholder, empty tiles, half-built feel.                  |
| Trust & Safety  | 1/5     | The "until X lands" tells me this product is not done.                    |
| **Gut feel**    | **1/5** | I'm reading developer notes.                                              |

### Page 3 — Variables tab

Title "Variables" — uh oh. Then `brand.brand_name`, `contact.location`, `conversation.last_objection` — code with dots. "Reference only" pill. Banner: "_Creating variables and row-level actions is not wired yet._" Table looks like database admin panel.

I now think InstaSetter is a tool I'd need to be a developer to use.

| Category       | Score   | Notes                                               |
| -------------- | ------- | --------------------------------------------------- |
| Copy & Labels  | 2/5     | Mixes plain English with raw `dot.notation` schema. |
| Trust & Safety | 1/5     | Third "not wired yet" disclaimer.                   |
| **Gut feel**   | **1/5** | Confirmed: this is for engineers, not me.           |

### Page 4 — Release tab

Tab is "Release" but heading is "Release status" — three names for the same thing.

"_A marketer-facing reality check…_" — first time I've seen "marketer." So _marketers_ are the audience? News to me. Banner: "_Publish controls and release history are not wired yet._" Fourth disclaimer.

Cards: DRAFT WORKSPACE / LIVE RUNTIME / PROMPT SOURCE / SIMULATOR. "_Compiled from src/lib/prompts/sections/_.ts\*" — a literal file path on someone's computer.

| Category       | Score   | Notes                                                                      |
| -------------- | ------- | -------------------------------------------------------------------------- |
| Copy & Labels  | 1/5     | A file path is shown as page copy. There is no greater violation of trust. |
| Trust & Safety | 1/5     | Internal tool that someone forgot to gate.                                 |
| **Gut feel**   | **1/5** | This is an internal tool I shouldn't be looking at.                        |

### Page 5 — Bot tab

Heading: "Appointment Setter" — first time the actual job-to-be-done is named anywhere. I get it now: this thing books Instagram DM appointments. _That should be on the front door, not five clicks deep._

"Display name" / "Not named — shared team inbox." "Identity — HARD RULES" `LOCKED`, "Voice" `EDITABLE`, "Message Length — HARD LIMIT" `LOCKED`. Why locked? Would I break the bot? Charge me?

Voice section shows actual prose: "Warm, direct, and locally aware…" — first real glimpse of what InstaSetter does. Buried at the bottom of tab #5.

| Category       | Score   | Notes                                                                        |
| -------------- | ------- | ---------------------------------------------------------------------------- |
| Copy & Labels  | 2/5     | LOCKED-by-whom? Why? No tooltip.                                             |
| Trust & Safety | 3/5     | Best tab so far. Hard Rules / Hard Limit framing feels considered.           |
| **Gut feel**   | **2/5** | Tells me what the product is — but it's the LAST page a stranger would find. |

### Page 6 — Mobile gate

If I clicked from social media on my phone (which I do for most links), I get "_Flow Builder needs a desktop. Editing the flow uses a multi-panel canvas that doesn't fit on a phone or small tablet. Open this page on a screen at least 1024px wide._"

Instant bounce. No marketing page, no screenshot, no demo video. "Open conversations" leads to another part of the same internal tool — I don't know what conversations are.

| Category       | Score   | Notes                                                      |
| -------------- | ------- | ---------------------------------------------------------- |
| Trust & Safety | 1/5     | Telling a mobile visitor "go away" is a guaranteed bounce. |
| **Gut feel**   | **1/5** | If this is the entry point from social, I never come back. |

### Page 7 — Block selected (Opening)

Clicked Opening. Right panel slides in with tabs: "Design / Routing / Triggers / Locals." Then Sketchpad. Then "Why This Exists / Examples / Data Capture / Runtime Details."

"Why This Exists" is the only button I'd actually click as a first-timer because _that's the question I have about the entire product_. I'd hope clicking explains InstaSetter, but I'm sure it just explains the Opening block.

| Category      | Score   | Notes                              |
| ------------- | ------- | ---------------------------------- |
| Copy & Labels | 1/5     | "Locals" is the one that broke me. |
| **Gut feel**  | **2/5** | Right idea, wrong audience.        |

### Page 8 — Simulator open

Clicked "Preview replies." Floating modal: "Try a real prospect opener" with chat-like interface. Send button disabled until I type.

OK — _this is the moment_ InstaSetter could win me. If I type "hi do u have any vending machines" and watch the bot reply, I'd get it instantly. **This should be the front door.**

But I had to land on a page I didn't understand, ignore four jargon tabs, click an unfamiliar block, notice the small "Preview replies" button, dismiss feeling I was in the wrong place, _then_ find this.

| Category          | Score   | Notes                                   |
| ----------------- | ------- | --------------------------------------- |
| Navigation & Flow | 2/5     | Buried. Should be the entry point.      |
| **Gut feel**      | **3/5** | Best part of the product. Hide it less. |

### Page 9 — Palette open (Block library)

Hit "+" — Block library drawer slid out: Opening / Qualifier / Objection / Booking / Email Capture / Follow-Up / Escalation / Summary.

I now realize these are the _types_ of conversation steps the bot can handle. **The block names alone describe what the bot does — better than any other copy on the site. Lead with these on the homepage!**

| Category      | Score   | Notes                                                  |
| ------------- | ------- | ------------------------------------------------------ |
| Copy & Labels | 4/5     | Best naming on the site. Surface this on the homepage. |
| **Gut feel**  | **3/5** | Best naming on the site.                               |

## Blockers

1. **No value proposition anywhere.** Zero copy says "InstaSetter is a tool that automates Instagram DM appointment booking using AI."
2. **No marketing/landing page on `/` or `/dashboard/flows/[anything]`.** A stranger drops _into the product_ with no context.
3. **Mobile gate is a bounce trap.** ~70% of social-media link traffic is mobile.
4. **Internal artifacts leak to the user.** `src/lib/prompts/sections/*.ts`, "Saved to Supabase," "DEV," "setter-v2," "until flow_id lands on the conversations table."
5. **"Not wired yet" disclaimers shown to visitors.** Four banners on four pages tell me the product is unfinished.

## My Top 10 Issues

1. **No value proposition copy anywhere.** — Cannot tell what InstaSetter does in 10 seconds.
2. **Internal/dev artifacts visible.** — Saved to Supabase, DEV tag, setter-v2, file paths.
3. **Mobile visitors get a flat refusal screen.** — No marketing content, no preview.
4. **"Not wired yet" disclaimers on Inbox, Variables, Release, and Bot tabs.** — Looks like a developer's todo list.
5. **VendingPreneurs vs Instagram DM Flow vs InstaSetter title hierarchy unclear.** — Cannot tell which is the product, account, or customer.
6. **Two competing nav systems.** — Top nav (Dashboard / Conversations / Lead Sources / Flow Builder) and left workspace nav (Flow / Inbox / Variables / Release / Bot). "Inbox" vs "Conversations" — same or different?
7. **Heavy domain jargon with no glossary or tooltips.** — Block, exits, Routing, Triggers, Locals, Hard Rules, Hard Limit, compiled prompt, shared draft, live runtime.
8. **The "Preview replies" button — the most valuable interaction for a first-timer — is small and tucked next to noisy status pills.** — The simulator should be the most visually dominant CTA.
9. **No "About," docs link, help, contact, pricing, login/signup, or marketing footer.** — A legitimate SaaS has _somewhere_ I can read about it.
10. **Three status pills in the header all look like alerts addressed to me.** — Wrong emotional tone for a stranger.

## What would actually rescue this for me

If I were Sam landing here cold, the only thing that would keep me on page longer than 10 seconds is if the **simulator was the front door**: a single screen that says "Type what an Instagram prospect might DM your business. Watch the AI book the appointment." A pre-filled example. One Send button. After the demo runs, _then_ show me the canvas as the "and here's how it works."

The product is interesting underneath. The packaging is hostile to anyone who isn't already a customer.

— Sam
