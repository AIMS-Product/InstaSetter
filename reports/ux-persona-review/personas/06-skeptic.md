---
persona: Rachel — Skeptical Buyer (42)
role: Marketing Director, evaluating InstaSetter for her team
date: 2026-04-28
scope: /dashboard/flows/[flowId] and its 5 tabs
---

# Rachel's Review — InstaSetter Flow Builder

## Overall Gut Feel: **1 / 5**

I came in to evaluate this for our team. I'm leaving without enough trust to put it on a shortlist, let alone in front of our CEO.

This product reads like a tool that escaped from a developer's branch mid-sprint. There is no pricing page, no terms, no privacy policy, no support contact, no testimonials, no "about us," no security page — and _that_ is before I even got into the product itself. Once I'm in the product, it tells me, in its own words, that several of the screens I'm looking at "are not wired yet." So what exactly am I being asked to buy?

I will not be sending this up the chain. Below is the receipt.

## Trust-Breaking Findings

### Finding 1 — A literal "DEV" badge in the chrome

| Where    | Header, top right, every page |
| -------- | ----------------------------- |
| Severity | **Blocker**                   |

There is an orange pill that says **"DEV"** sitting in the global header next to the brand selector. I can see it in every screenshot. It is the very last visual element my eye lands on before I look at the page content.

If this is a development environment, why am I being shown it as a sales surface? If this is the production product, why does it call itself "DEV"? Either answer is bad. A serious SaaS does not ship a debug-environment label to a customer-facing UI. This single pill, all on its own, would get me to close the tab if I weren't being paid to review it.

### Finding 2 — "Saved to Supabase" exposes the database vendor

| Where    | Header pill, every tab |
| -------- | ---------------------- |
| Severity | **Critical**           |

A green pill in the header literally says **"Saved to Supabase"**. Supabase is the name of the _database vendor they use_. I am a marketing director, not their CTO.

Two problems:

1. It tells me their team is shipping engineer-language to me.
2. It tells me, indirectly, that my data lives in a third-party Postgres-as-a-service. I now have a whole new vendor to vet — one they didn't volunteer in a DPA. Where is data residency? Who is sub-processor? Is it on Supabase's free tier?

The right copy here is **"Saved"** or **"All changes saved"**.

### Finding 3 — Dev-diary copy on the Inbox tab

| Where    | Inbox tab    |
| -------- | ------------ |
| Severity | **Critical** |

The Inbox screen has a banner that reads, verbatim:

> **BRAND-WIDE ONLY**
> Inbox metrics and transcripts below include all VendingPreneurs conversations until flow_id lands on the conversations table.

"Until flow_id lands on the conversations table" is a TODO comment from a Jira ticket. It's also a confession that the metrics are wrong. They don't show me data for the flow I'm looking at — they show a rolled-up brand total. That's the _entire reason a marketer logs into a flow tool_.

The four big metric cards are all empty dashes. Whether that's because there's no data or the page is broken, I cannot tell.

### Finding 4 — "Reference only — not wired yet" on the Variables tab

| Where    | Variables tab |
| -------- | ------------- |
| Severity | **Critical**  |

The Variables tab carries a pill that says **"Reference only"** + banner:

> **REFERENCE ONLY** — Creating variables and row-level actions is **not wired yet.**

Translation: "You can't actually use this tab. It's a screenshot of a feature we haven't built." It's listed in the workspace nav with same visual weight as Flow, Inbox, Release, Bot, so a buyer reasonably believes it's a working part of the product. It is not. _Deceptive surface area._

### Finding 5 — "Publish controls and release history are not wired yet"

| Where    | Release tab  |
| -------- | ------------ |
| Severity | **Critical** |

The Release tab — where I'd expect version history, diffs, rollback, audit log — has a banner: "**Publish controls and release history are not wired yet.**"

So how do I:

- Roll back if the new flow tanks our reply rate?
- Show my CEO an audit trail?
- Sign off on a change before it goes to live customers?
- Comply with internal change-control?

I cannot. The _publish_ feature does not work. On a tool whose entire job is to push prompts to live Instagram conversations.

The same screen has a card titled **"PROMPT SOURCE — Compiled from src/lib/prompts/sections/\*.ts"**. That's a filesystem path. I should not be able to see this. Ever.

### Finding 6 — "Live: setter-v2" — version names from inside the codebase

| Where    | Header pill on every tab |
| -------- | ------------------------ |
| Severity | **High**                 |

`setter-v2` is a developer's internal handle for "the second iteration of the setter prompt." It's not a feature, plan, or SKU. It's a branch name listed alongside customer-facing pills as if meaningful.

What does v1 do that v2 doesn't? When does v3 ship? Does v2 cost more? None of that is answered.

### Finding 7 — "LOCKED" sections on the Bot tab with no explanation

| Where    | Bot tab  |
| -------- | -------- |
| Severity | **High** |

"Identity — HARD RULES" is LOCKED. "Voice" is EDITABLE. The page never tells me:

- Locked **for whom**? My plan? Every customer? The team hasn't shipped the feature?
- Locked **forever**, or unlockable on a higher plan?
- Locked **by InstaSetter / by my admin**?

If "locked" means "we will never let you change this," it's a positioning decision that should be sold proudly. If "locked" means "we haven't built the editor yet," it's another _not wired_. The ambiguity is the problem.

### Finding 8 — Header status pills mean nothing to a buyer

| Severity | **High** |

Header carries up to four pills + DEV. Three are about _internal state of their engineering pipeline_ (Supabase, setter-v2, save pending). One is the brand. None tell me what _I_ should do next.

### Finding 9 — No pricing, no plans, no "buy" path anywhere

| Severity | **Blocker** |

I scrolled the whole page. No pricing page, plans, "Upgrade," "Billing." A buyer cannot evaluate without this.

### Finding 10 — No legal pages: no Terms, no Privacy, no DPA, no Security

| Severity | **Blocker** |

This product:

1. Connects to my Instagram Business account.
2. Reads inbound DMs (PII — names, locations, phone numbers).
3. Generates and sends replies on my behalf.
4. Stores transcripts ("conversations table").
5. Routes data through "Supabase."

And there is no DPA. No company on Earth lets me sign a SaaS that touches customer DMs without a DPA.

### Finding 11 — No social proof, no testimonials, no logos, no case studies

| Severity | **Critical** |

The only social signal is "VendingPreneurs" — and only by inference. No "trusted by." A new SaaS with zero social proof in 2026 either doesn't have customers or doesn't know how to ask.

### Finding 12 — No "How is my Instagram account protected?" answer

| Severity | **Critical** |

The product sends DMs from my IG Business account. Meta will ban my account if the bot violates automation policies. Nothing reassures me about:

- Meta Business Partner status
- DM processing region
- Rate limiting / spam protection
- Audit log of what was sent
- Pause/kill switch
- Human-handoff for sensitive messages

### Finding 13 — No support contact, no help center, no chat widget

| Severity | **Critical** |

No Help / Docs link. No live chat. No "Contact us." No support email. No phone. No status page link. If something breaks at 9pm Friday, who do I call?

### Finding 14 — Flow Builder is mocked out with seeded sample data, no obvious "this is sample" indicator

| Severity | **High** |

Canvas loads with fully populated blocks. Variables tab shows real-looking values. Is this:

- Sample data?
- A real customer's flow I'm somehow seeing because auth isn't enforced?

No auth on `/dashboard/flows/[flowId]` _and_ any flowId works. So `/dashboard/flows/unknown-flow-test` _also_ renders the same flow. Either critical authz bug or every visitor sees the same demo.

### Finding 15 — Mobile gate is honest but undersells

| Severity | **Medium** |

"Open conversations →" is respectful, but no nav, no logo brand-mark, no "Get a demo" or "Start trial." A mobile buyer just bounces.

### Finding 16 — The "Preview replies" simulator is unlabelled

| Severity | **Medium** |

Questions a buyer asks and the product never answers:

- Does this call my Instagram account or a sandbox?
- Is it talking to live Claude API and burning my credits?
- Will the prospect see anything?
- Where do test transcripts go?

A skeptical buyer does not press "Run" without knowing.

## Per-Page Gut Feel

| Page          | Score   | One-Sentence Reason                                                                                                |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| Flow tab      | 2/5     | Looks like a real editor for thirty seconds, then the DEV badge, Supabase pill, and seeded demo data with no auth. |
| Inbox tab     | 1/5     | "Until flow_id lands on the conversations table" — a literal Jira-comment in the chrome.                           |
| Variables tab | 1/5     | "Reference only — not wired yet." Sidebar tab that admits it doesn't work.                                         |
| Release tab   | 1/5     | Publish flow doesn't publish. Source file paths on a customer screen.                                              |
| Bot tab       | 2/5     | Best-looking page, but LOCKED/EDITABLE badges with no explanation.                                                 |
| Mobile gate   | 3/5     | Honest, but undersells.                                                                                            |
| Overall       | **1/5** | I cannot find a price, a privacy policy, a support contact, or a single working publish button.                    |

## What Would Move Me to a 3?

1. Remove the "DEV" badge.
2. Replace **"Saved to Supabase"** with **"Saved"**.
3. Either ship Variables and Release tabs, or hide them. "Not wired yet" must not appear in production.
4. Add a footer with Pricing, Terms, Privacy, DPA, Security, Contact.
5. Add a sentence above the canvas: _"This is a sample flow. Sign in to start your own."_
6. Replace `setter-v2` with a marketer-readable label.
7. Remove `src/lib/prompts/sections/*.ts` from the Release tab.
8. Explain "LOCKED" — even one sentence.

## Final Word

I evaluate four to six SaaS tools a quarter. I have walked away from products with smaller red-flag piles than this. The fundamentals of the flow editor look promising — canvas, inspector, simulator concept — but the chrome around it screams "unfinished." I would not send my CEO a product whose own UI tells me, in three places, that it is not wired yet. And I would not put my brand's Instagram account into a system whose data processing terms I cannot find with a search.

**Recommendation to my CEO:** Veto. Revisit in two quarters if they ship pricing, legal, and a publish flow.

— Rachel
