# Claude AI Setter — Strategy Plan

**Modern Amenities Holdings · Wild Ducks / AIMS**
**Confidential Strategy Document**

- **Date:** March 2026
- **Version:** v1.0
- **Author:** Jess Mayo — Wild Ducks / AIMS
- **Status:** Draft — Internal Review
- **Classification:** Confidential

---

## 1 · Executive Summary

This document outlines the strategy for deploying a Claude-powered AI setter across Modern Amenities Holdings' Instagram DM channels — initially targeting VendingPreneurs, with a clear replication path to Modern Amenities, MedPro, and VendHub.

The core thesis: every function a human setter performs in an Instagram DM conversation — opening, qualifying, educating, handling objections, capturing contact information, and booking calls — can be executed by Claude at unlimited scale, 24 hours a day, with zero variability in quality.

### Vision

This is not a chatbot. It is an AI-powered conversation agent that adapts in real time, qualifies leads against defined criteria, delivers the ROI calculator as a contextual value moment, captures email addresses conversationally, and hands off fully-briefed leads to human closers.

### Strategic Objectives

- Replace human setter headcount with Claude across all Instagram DM channels
- Capture email addresses at scale from thousands of existing Instagram contacts
- Deliver the ROI Calculator as a lead magnet within a natural DM conversation
- Qualify leads automatically and route them to Calendly booking or email nurture
- Generate fully structured lead records in Supabase and Close CRM with zero manual data entry
- Build a replicable system that can be launched across all portfolio brands with brand-specific personas and qualification criteria

### Why Now

The holdco has thousands of opted-in Instagram contacts who have never been systematically followed up with. Every day without a system is lost pipeline. The ROI calculator being built by Matt's intern creates a compelling, timely lead magnet that gives us a reason to re-engage. ManyChat and Inro make the DM automation layer Meta-compliant and production-ready. The Claude API makes the conversation layer intelligent enough to replace a trained setter.

---

## 2 · The Problem We Are Solving

### Current State

Human setters on Instagram are the status quo. They are expensive, inconsistent, limited to business hours, and cap out at 50–100 DMs per day per person before quality degrades. Response time averages 2–4 hours during the day and falls off entirely outside of it.

At the same time, the holdco has accumulated thousands of Instagram contacts who engaged in the past and were never followed up with systematically. There is no automated mechanism to re-engage them, no lead magnet delivery system, and no pipeline for capturing contact details from DM conversations.

| Current Problem   | Detail                                                                       |
| ----------------- | ---------------------------------------------------------------------------- |
| Response Time     | 2–4 hours average during business hours; none after hours                    |
| Daily Capacity    | 50–100 DMs per setter before quality degrades                                |
| Coverage          | Business hours only — leads go cold overnight and on weekends                |
| Cost              | Salary + commission per setter; scales linearly with volume                  |
| Consistency       | Variable by rep — tone, qualification depth, and CRM data quality all differ |
| CRM Handoff       | Manual; dependent on rep discipline; frequently incomplete                   |
| Existing Contacts | Thousands of opted-in contacts with no systematic follow-up mechanism        |

### The Opportunity

Instagram DMs consistently outperform email for open and response rates. The channel is already warm — these contacts opted in. What has been missing is the infrastructure to engage them at scale with intelligence. This strategy builds that infrastructure.

---

## 3 · The Solution Architecture

The solution has four layers: the DM automation layer (Inro), the AI conversation layer (Claude), the orchestration layer (custom-built in-app), and the downstream systems (Close CRM, Customer.io, Slack).

### Full Stack

| Layer / Tool        | Role in the System                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inro**            | Meta-compliant Instagram DM automation layer. Handles message routing, keyword triggers, and HTTP request actions to our webhook. Has its own built-in AI agent (black box) and an MCP server + private REST API for programmatic access. |
| **Claude (Sonnet)** | AI conversation engine. Operates as a named setter persona. Qualifies leads, captures email addresses conversationally, delivers the ROI calculator, handles objections, books calls, and generates structured lead summaries.            |
| **InstaSetter App** | Custom orchestration engine. Receives webhooks from Inro on key conversation events, manages Claude conversation state, and routes data to downstream systems. No external automation tools (n8n, Make, etc.).                            |
| **Supabase**        | Canonical data store. All contacts, conversations, messages, and leads live here. Single source of truth — external systems (Close CRM, Customer.io) are sync targets.                                                                    |
| **Close CRM**       | CRM destination for qualified leads. Claude-generated conversation summaries are written as contact notes. Closers receive pre-briefed leads with full context.                                                                           |
| **Customer.io**     | Email nurture for leads who did not book a call. Triggered by the app when email is captured but no Calendly booking is made.                                                                                                             |
| **Slack**           | Closer alert system. When a call is booked, a structured Slack message fires to the assigned closer with full lead context from the Claude summary.                                                                                       |
| **Calendly**        | Call booking layer. Claude delivers the link contextually when a lead qualifies. Booking triggers the Slack alert and Close CRM update via the app's integration layer.                                                                   |

---

## 4 · The Conversation Flow

The conversation flow is not a rigid bot script. It is a system prompt architecture that defines how Claude behaves, what information it collects, and how it makes decisions — but the actual conversation adapts in real time based on what the contact says.

### Flow Overview

| Step                                   | What Happens                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step 1 — Trigger**                   | Contact DMs the account, comments on a post with a keyword (e.g., 'calculator', 'ROI', 'info'), or is re-engaged via a broadcast. Inro fires the Claude setter flow.                                                                                                                                            |
| **Step 2 — Opener**                    | Claude responds immediately (under 5 seconds) with a warm, human-toned message. It introduces itself by persona name, acknowledges the trigger, and asks a simple opening question to begin qualification.                                                                                                      |
| **Step 3 — Rapport + Qualification**   | Claude asks 3–4 qualifying questions spread naturally across the conversation: current machine count, location types, how long in business, and approximate monthly revenue. It adapts based on answers — pushing toward a call for strong leads, pivoting to the email nurture track for early-stage contacts. |
| **Step 4 — ROI Calculator Delivery**   | At a natural moment in the conversation, Claude introduces the calculator: 'Based on what you're telling me, I want to show you what your route could actually be worth. We built a calculator for this — want me to send you the link?' This creates permission, then delivers the URL.                        |
| **Step 5 — Email Capture**             | Immediately after delivering the calculator link, Claude asks for their email address so it can send them the link directly and follow up with additional resources. The ask feels natural because it follows value delivery. Claude validates the format before accepting.                                     |
| **Step 6 — Qualification Decision**    | Based on qualification answers, Claude categorizes the lead: Hot (strong candidate for a call), Warm (early stage, route to email nurture), or Cold (not a fit at this time). This drives the next step.                                                                                                        |
| **Step 7A — Hot Lead: Book a Call**    | Claude delivers the Calendly link with context: 'Based on everything you've shared, I think it's worth getting you on a quick 20-minute call with our team. Here's a link to grab a time that works for you.' It confirms the booking and sets expectations.                                                    |
| **Step 7B — Warm Lead: Email Nurture** | Claude closes the DM conversation warmly, confirms the email has been noted, and lets the contact know they'll hear from the team. The app routes them into the Customer.io welcome sequence.                                                                                                                   |
| **Step 8 — Lead Summary Generation**   | At conversation end, Claude generates a structured internal summary: name, IG handle, email, machine count, location type, revenue range, qualification status, key notes, and recommended next action. Stored in Supabase and routed to downstream systems.                                                    |
| **Step 9 — Data Distribution**         | The app writes the lead summary to Supabase (canonical store), syncs to Close CRM with Claude's notes, triggers Customer.io for warm leads, and fires a Slack alert to the closer for hot leads with a booked call.                                                                                             |

---

## 5 · Claude Prompt Architecture

The system prompt is the most critical build artifact. It defines who Claude is, how it behaves, what it knows, and what decisions it makes. It is not a script — it is a playbook that Claude executes conversationally.

### System Prompt Components

#### 1. Persona Definition

Claude operates as a named team member — not 'an AI assistant.' The persona has a name, a tone, and a defined role. The tone is warm, direct, knowledgeable about the vending industry, and conversational. It never reveals it is an AI unless directly asked, in which case it acknowledges it is an AI assistant for the team.

#### 2. Company and Product Context

Claude is briefed on the brand (VendingPreneurs for Phase 1), the community, what the business does, and who the ideal customer is. It knows the ROI calculator exists, what it does, and how to introduce it naturally.

#### 3. Qualification Criteria

Claude knows what a qualified lead looks like. It is given explicit criteria — machine count thresholds, location types, revenue ranges, time-in-business signals — and instructed to score leads against these criteria during the conversation without the contact knowing they are being scored.

#### 4. Objection Handling Playbook

The prompt includes a defined set of common objections and how to handle each one:

- **'I'm just starting out'** — acknowledge the early stage, redirect to the email nurture track and position it as the right starting point
- **'I don't have the money right now'** — explore further, do not push a call; route to warm nurture
- **'I already have a system / supplier'** — acknowledge, pivot to differentiation, qualify further
- **'What is this?' / 'Who are you?'** — warm introduction to the brand, no hard sell
- **'Is this a bot?'** — acknowledge it is an AI assistant for the team; keep it brief and redirect

#### 5. Email Capture Instructions

Claude is instructed to capture the email address after delivering the calculator link and before the conversation closes. It is given the exact ask sequence and instructed to validate the format. If the contact declines to provide an email, Claude accepts gracefully and routes them to the call-booking path only.

#### 6. Decision Logic

Claude is given explicit routing logic: if qualification score is above the threshold and email is captured, deliver the Calendly link and book a call. If below threshold but email is captured, close warmly and trigger email nurture. If no email is captured, make one more ask, then close.

#### 7. Summary Generation Instruction

At conversation close, Claude is instructed to generate a structured JSON-format lead summary. The app parses this and routes it to downstream systems. Fields include:

- `name`
- `instagram_handle`
- `email`
- `machine_count`
- `location_type`
- `revenue_range`
- `qualification_status` (hot/warm/cold)
- `call_booked` (true/false)
- `calendly_slot`
- `key_notes`
- `recommended_action`

### Build Note

The system prompt should be built and tested in Claude.ai before it is deployed to Inro. Run it against at least 20 simulated DM conversations covering different lead types, objections, and edge cases. Iterate until the qualification accuracy and conversation quality meet the bar you would hold a human setter to.

---

## 6 · ROI Calculator Integration

The ROI calculator being built by Matt's intern is the lead magnet for Phase 1. It is a high-value, low-friction offer that gives Claude a genuine reason to engage — not a cold pitch, but a useful tool delivered as part of a conversation that has already established context.

### Calculator Requirements for this Funnel

- Must be hosted on a web page (not a downloadable file) — this enables link delivery in DMs and allows analytics tracking on usage
- The URL should be clean and brandable — a VendingPreneurs-branded short link is ideal
- The results page should be personalized based on inputs — 'your route could generate $X/month' output increases shareability and return visits
- Optionally: gate the full results behind an email capture on the landing page itself, creating a second capture point independent of the DM conversation
- Track calculator completions via a simple event (Google Analytics or app webhook) so we can see conversion from DM link delivery to calculator completion

### Growth Loop

A calculator that outputs a personalized revenue estimate is inherently shareable. Every person who shares their result drives new DM volume organically. Build the share mechanic in from the start.

---

## 7 · Data Flow & Systems Integration

Every conversation that passes through the Claude setter generates a structured data record. The app's orchestration layer ensures that record reaches the right downstream system based on the lead's qualification status and actions taken.

### Supabase (Canonical Store)

All lead data lives in the `leads` table in Supabase. Every contact who enters the funnel gets a record, regardless of qualification outcome. See `docs/scope-plan.md` § Data Model for full schema.

### Close CRM

Hot and warm leads are written to Close as new contacts. The Claude-generated conversation summary is added as a note on the contact record. Closers see a fully contextualized lead before they ever pick up the phone. No manual data entry required.

### Customer.io Email Nurture

Warm leads (email captured, no call booked) are pushed to Customer.io via the app and entered into a welcome sequence. The sequence should be brand-specific, value-forward, and timed appropriately — not an immediate hard sell. The goal is to move them from warm to hot over 3–5 touchpoints.

### Slack Closer Alerts

When a call is booked, a Slack message fires to the designated closer channel with: the contact's name and IG handle, their qualification summary, the scheduled call time, and Claude's recommended talking points based on the conversation. The closer walks into every call prepared.

---

## 8 · Performance: Claude vs. Human Setter

| Metric                 | Human Setter                      | Claude Setter                           |
| ---------------------- | --------------------------------- | --------------------------------------- |
| Response Time          | 2–4 hours average                 | < 5 seconds, always                     |
| Coverage Hours         | Business hours only               | 24/7, 365 days                          |
| Daily Capacity         | 50–100 DMs max                    | Unlimited                               |
| Cost per Conversation  | Salary + commission (linear)      | ~$0.01–0.05 per conversation (API cost) |
| Tone Consistency       | Variable by rep                   | Uniform, always on-brand                |
| CRM Data Quality       | Depends on rep discipline         | Structured, always complete             |
| Qualification Accuracy | Variable                          | 100% criteria-consistent                |
| Handoff Quality        | Incomplete notes common           | Full structured summary, every time     |
| Scalability            | Hire more setters                 | Increase API limit                      |
| Brand Replication      | Hire + train new setter per brand | Copy prompt + update persona per brand  |

---

## 9 · Phased Rollout Plan

| Phase       | Timeline  | Deliverables                                                                                                                                                                                                                               | Owner                                   |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **Phase 1** | Weeks 1–2 | System prompt v1 built and tested in Claude.ai against simulated DMs. Inro account set up and connected to VendingPreneurs Instagram. App webhook + integration layer built for downstream systems. ROI calculator URL confirmed and live. | Wild Ducks                              |
| **Phase 2** | Week 3    | Soft launch: Claude setter live for new organic DMs only. Human setter monitors conversations in parallel for first 5 days. Prompt iterated based on real conversation quality. Google Sheet populating correctly. Slack alerts tested.    | Wild Ducks / Matt's intern (calculator) |
| **Phase 3** | Week 4    | Close CRM integration live. Broadcast campaign to existing Instagram contacts (within Meta window compliance). Human setter fully replaced for standard DM volume. Closers trained on new lead handoff format.                             | Wild Ducks / Stephen (RevOps)           |
| **Phase 4** | Month 2   | Performance review: conversion rates, call booking rate, email capture rate, lead quality scores from closers. System prompt v2 based on learnings. Begin replication build for Brand 2 (Modern Amenities or MedPro).                      | Wild Ducks / Ben Brenner (data review)  |
| **Phase 5** | Month 3+  | Full multi-brand deployment. Brand-specific personas, qualification criteria, and lead magnets per brand. Centralized lead log across all brands with brand source column.                                                                 | Wild Ducks / Kody (production)          |

---

## 10 · Open Questions & Dependencies

### Decisions Required

- Which brand goes first? This plan assumes VendingPreneurs. Confirm with George.
- What is the setter persona name and voice? Needs to be defined before prompt build begins.
- What are the exact qualification thresholds? Machine count floor, revenue floor, location type preferences. Needs input from the sales team.
- Is the ROI calculator URL finalized and live? Required for Phase 1 launch.
- Does Inro's plan tier support the conversation volume and webhook capabilities required? Confirm before committing.
- What is the call booking workflow — Calendly directly, or does a human confirm and rebook? This affects how Claude handles the Calendly step.

### Dependencies

| Dependency           | Detail                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ROI Calculator       | Matt's intern must deliver a hosted, live URL before Phase 1 launch. Calculator must output personalized results.                |
| Inro Account         | Verify plan tier supports webhook events and Claude API integration at required volume.                                          |
| Close CRM API        | Confirm with Greg / Stephen that the Close API key and contact write permissions are available for the app.                      |
| Ben Brenner Review   | Data architecture review required before any PII (email addresses) is written to external systems. Standard Wild Ducks protocol. |
| Brand Voice Sign-Off | Persona name and tone must be approved before the system prompt is finalized. Sofia or Jeffrey for brand QA.                     |
| Comp / Setter Impact | If existing human setters are affected, this needs to be coordinated with George and HR before Phase 3 cutover.                  |

---

## 11 · Risk & Compliance

### Meta / Instagram Compliance

All DM automation must operate through Meta-approved channels. Inro uses the official Meta Messaging API — this keeps the system compliant. The following rules govern what Claude can and cannot do:

- Broadcast messages (outbound to existing contacts) are limited to a 24-hour window for promotional content and a 7-day window for non-promotional content. The re-engagement strategy must respect this.
- Comment-triggered DM flows (someone comments with a keyword and receives an automated DM) are fully Meta-compliant and are the recommended primary acquisition trigger.
- Do not use third-party Instagram scraping tools or any tool that requires your Instagram password — these violate ToS and risk account suspension.

### Data and Privacy

Email addresses collected through this system constitute PII and must be handled in compliance with applicable regulations. Ben Brenner must review the data flow before any email addresses are written to external systems. Key considerations:

- Customer.io is the email platform — contacts being enrolled must have opted in
- Supabase RLS policies restrict data access to authorized team members only
- Contacts must have a clear opt-out mechanism from any email sequences
- The DM conversation should make clear — naturally, not legalistically — that the contact is providing their email to receive the calculator and related resources

### AI Disclosure

If a contact directly asks whether they are speaking to a human or a bot, Claude must acknowledge it is an AI assistant for the team. It should not claim to be human. The persona approach (named team member, warm tone) is not deceptive — it is brand voice — but direct questions about AI status must be answered honestly.

---

## 12 · Immediate Next Steps

1. Confirm VendingPreneurs as the Phase 1 brand with George. Get sign-off on the setter replacement plan.
2. Define the setter persona: name, tone, and voice. Get approval from Sofia or Jeffrey for brand alignment.
3. Lock qualification criteria with the sales team: exact machine count floor, revenue range, location type preferences.
4. Confirm the ROI calculator is on track for delivery and will have a hosted URL within 2 weeks.
5. Set up the Inro account and confirm webhook and Claude API integration are available on the current plan.
6. Route to Ben Brenner for data architecture review of the email capture → Supabase → Close → Customer.io pipeline.
7. Begin system prompt v1 build. Run 20+ simulated conversations before connecting to live Inro flow.
8. Build app integration layer for Close CRM write, Customer.io trigger, and Slack closer alert.
9. Schedule a Wild Ducks review of the prompt and conversation quality before Phase 2 soft launch.

> **Foundation:** This is the first full agentic setter build for the holdco. Once VendingPreneurs is live and performing, the system prompt architecture and integration layer become reusable templates for every brand. Build it right the first time.

---

_Wild Ducks / AIMS · Modern Amenities Holdings · Confidential_
