# Persona Review — Victoria, 55, Executive With 30 Seconds

I have a meeting in two minutes. My assistant sent me a link and said "this is the new bot dashboard — take a look." I clicked it.

## The 30-Second Test — Failed

I will say this clearly. I opened the page. I looked at it. I did not understand what was happening.

There is no headline number. There is no traffic light. There is no "your bot booked 14 appointments today." There is a graph of boxes connected by lines.

I closed the tab.

If I am the person paying for this product, that is the wrong outcome.

## Page-by-Page Reaction

### Flow tab (the page that loads first)

A diagram. Boxes labelled "Opening," "Qualifier," "Objection Handler," "Booking Handoff," "Email Capture." Lines between them.

This is an engineer's view. It is not a leader's view.

There is no number on this page. Not one. I cannot tell:

- Is the bot working today
- How many people did it talk to
- How many appointments did it book
- Is anything broken

The three pills at the top — "Unpublished edits," "Saved to Supabase," "Live: setter-v2" — are not English. "Supabase" is a brand name I have no reason to know. "setter-v2" is a version string. "Unpublished edits" sounds like a problem but no one is telling me whether it is one.

**Score: 1/5.** Built for the person editing the bot, not the person paying for it.

### Inbox tab

Better. Four large numbers across the top: Started, Booked, Completed, Stalled.

Then I read them. They are all dashes. "Loading..." The numbers never resolved.

Even if they had — Started 0, Booked 0, Completed 21, Stalled 1 — I am told there is a caveat: "Inbox metrics and transcripts below include all VendingPreneurs conversations until flow_id lands on the conversations table."

I do not know what that sentence means. I will assume the numbers are not trustworthy. **The Booked number is the only one I care about.** Make it the largest thing on the page. Put it above everything else. Sparkline next to it. Yesterday's number underneath. _That_ is the dashboard.

**Score: 2/5.** Right idea. Wrong execution.

### Variables tab

Three boxes: Brand, Contact, Conversation. Examples like `brand.brand_name`, `contact.location`, `conversation.last_objection`.

This is a developer reference page. I am not the audience.

**Score: 2/5.** Should not be the third tab in a top-level nav.

### Release tab

Three paragraphs. Four boxes. A "Recommended workflow today" list.

I am told my flow has "Unpublished edits" and that it is also "Live: setter-v2" and the prompt is "Compiled from src/lib/prompts/sections/\*.ts" and the simulator is "Live prompt only."

I cannot tell what is actually running right now. The page is asking me to read three explanations to figure that out.

A traffic light would solve this:

- **Green dot — Live and matching draft**
- **Amber dot — Live but draft has unsaved changes**
- **Red dot — Live is broken / paused**

That is one glance. What I have is a reading exercise.

**Score: 2/5.** The information is here. Buried.

### Bot tab

"Appointment Setter." A persona configuration screen with sections labelled "Identity — HARD RULES (LOCKED)," "Voice (EDITABLE)," etc.

This is fine. It is configuration. It is not where I would ever look. It does not need to be in my navigation.

**Score: 3/5.** Honest about what it is. Wrong audience for the top nav.

### Block detail (Opening selected)

Side panel with tabs and lists. I am not editing this.

**Score: not applicable.** Not my view.

### Simulator

A modal opens over the canvas. "Try a real prospect opener." Tabs and a text box.

I do not know what any of this means. Why would I type into this.

**Score: 1/5.** Pure jargon. No "Show me an example conversation" button.

## What Is Actually Missing — The Executive Summary Page

There is no bot health page. None.

If I had to describe what I expect when my assistant says "look at the bot dashboard," it is **one screen** that answers three questions:

1. **Is the bot on right now?** Green dot or red dot. One word.
2. **What did it do this week?** Big number: "Booked 47 appointments." Trend arrow vs last week.
3. **Is anything wrong?** "1 stalled lead needs review."

That is the page. Right now my "home" tab is a flowchart. That is wrong. The flowchart is the workshop floor. I should be looking at the showroom.

## Findings — Severity-Ranked

| #   | Page          | Category          | Finding                                                                                | Severity     | Persona Rationale                                                                                       |
| --- | ------------- | ----------------- | -------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | All pages     | Visual & Layout   | No executive summary view exists. Default landing for a flow is a graph editor.        | **Blocker**  | There is no page in the product for me. Closes tab in 30 seconds.                                       |
| 2   | Flow tab      | Visual & Layout   | Zero KPIs on default page. Not one number.                                             | **Blocker**  | If the headline page has no headline number, there is no headline.                                      |
| 3   | Inbox tab     | Feedback & State  | KPI numbers are dashes ("Loading...") at view time.                                    | **Critical** | A dashboard that shows "—" looks broken. Will not refresh.                                              |
| 4   | Inbox tab     | Trust & Safety    | Brand-wide caveat banner undermines numbers above it.                                  | **Critical** | If numbers cannot be trusted, they should not be there.                                                 |
| 5   | Release tab   | Copy & Labels     | "What is actually running right now" requires reading three paragraphs.                | **Critical** | My only question is "are we live with the latest changes — yes or no." Should be one-glance.            |
| 6   | All pages     | Copy & Labels     | Header pills use developer language.                                                   | **High**     | Victoria does not know what Supabase is. "setter-v2" reads as a version string from someone else's job. |
| 7   | Flow tab      | Navigation & Flow | Five-tab nav puts Flow first by default — most technical view.                         | **High**     | Executive's natural landing should be summary metrics.                                                  |
| 8   | Variables tab | Navigation & Flow | Reference page sits in top-level nav alongside metrics-bearing tabs.                   | **High**     | Variables, Release internals, Bot persona — none are executive-facing. Collapse under "Configure."      |
| 9   | Bot tab       | Copy & Labels     | "Identity — HARD RULES (LOCKED)" / "Affirmation Rules (EDITABLE)" written for designer | **High**     | Tells me about permissions, not about what the bot does.                                                |
| 10  | Simulator     | Copy & Labels     | "Try a real prospect opener" with tabs "Use chunks / First converts / Brand reply."    | **High**     | Pure jargon. No "Show me a demo conversation" button.                                                   |
| 11  | All pages     | Visual & Layout   | Three colored pills cluster with no visual priority.                                   | **Medium**   | If "Unpublished edits" is a problem state, it should look like one.                                     |
| 12  | Inbox tab     | Visual & Layout   | Hero KPI cards visually flat — no comparison number, no trend, no time period.         | **Medium**   | "Booked: 0" is meaningless without "vs 14 last week."                                                   |
| 13  | Release tab   | Copy & Labels     | "Recommended workflow today" — Victoria does not action workflows.                     | **Low**      | Wrong audience.                                                                                         |

## Gut Feel — Overall

**Score: 1/5.**

The product as it stands has no executive view. The default page is a flowchart with no numbers. The page that does have numbers shows dashes and footnotes them with developer language. The page that should answer "is it live" requires three paragraphs of reading.

I want to be very direct. **I do not see what I am paying for from any page in this product.** I see what the engineer has built. I see what the marketer is configuring. I do not see the result.

## Three Things — If I Were Asked

1. **Build a Bot Health page. Make it the default.** One number above the fold: "Booked this week." One status pill: "Running" / "Paused." One list: "Issues needing attention (0)."
2. **Push everything else into a "Configure" section.** Flow editor, Variables, Release internals, Bot persona — operator views.
3. **Translate the header pills.** "Live: setter-v2" → "Customers are talking to the latest version." "Unpublished edits" → "Your draft has unsaved changes." "Saved to Supabase" → delete it.

I am out of time.

— Victoria
