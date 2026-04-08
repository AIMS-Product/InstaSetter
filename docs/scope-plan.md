# InstaSetter — Scope Plan

**Status:** Pre-build. Blocked on third-party access. This document captures the full technical scope so we can start building the moment access is granted.

**Last updated:** 2026-04-08

---

## 1 · System Architecture

```
┌─────────────────┐     HTTP POST      ┌──────────────────────────────────┐
│                  │  (scenario action)  │         InstaSetter App          │
│      Inro        │ ────────────────▶  │                                  │
│  (IG DM layer)   │                    │  ┌────────────────────────────┐  │
│                  │  ◀──────────────── │  │   Webhook Handler          │  │
│                  │  Inro REST API /   │  │   /api/webhooks/inro       │  │
│                  │  MCP (send reply)  │  └────────┬───────────────────┘  │
└─────────────────┘                    │           │                      │
                                       │  ┌────────▼───────────────────┐  │
                                       │  │   Conversation Engine      │  │
                                       │  │   - Load history from DB   │  │
                                       │  │   - Call Claude API        │  │
                                       │  │   - Parse structured data  │  │
                                       │  │   - Route lead events      │  │
                                       │  └────────┬───────────────────┘  │
                                       │           │                      │
                                       │  ┌────────▼───────────────────┐  │
                                       │  │   Integration Layer        │  │
                                       │  │   - Close CRM             │  │
                                       │  │   - Customer.io           │  │
                                       │  │   - Slack                 │  │
                                       │  │   - Calendly              │  │
                                       │  └────────────────────────────┘  │
                                       │                                  │
                                       │  ┌────────────────────────────┐  │
                                       │  │   Dashboard / UI           │  │
                                       │  │   - Conversation viewer    │  │
                                       │  │   - Lead pipeline          │  │
                                       │  │   - Analytics              │  │
                                       │  └────────────────────────────┘  │
                                       │                                  │
                                       │         Supabase (canonical)     │
                                       └──────────────────────────────────┘
```

### Message Flow (per DM)

1. Contact sends Instagram DM
2. Inro scenario triggers → HTTP Request action POSTs to `/api/webhooks/inro`
3. Payload includes: `contact_id`, `username`, `trigger.message`, conversation context
4. App loads full conversation history from Supabase `messages` table
5. App calls Claude Messages API with system prompt + full message history
6. Claude returns reply text + (optionally) structured data (email captured, qualification score, lead summary)
7. App sends reply back to contact via Inro REST API or MCP
8. App stores both the incoming message and Claude's reply in Supabase
9. If a lead event occurred (email captured, call booked, conversation ended), app triggers downstream integrations

### Key Constraint: Inro Has No Push Webhooks

Inro does **not** fire native webhook events when a message arrives. Instead, you configure an Inro **scenario** with a trigger (keyword, all DMs, comment) and add an **HTTP Request action** that POSTs to our endpoint. This means:

- We must configure the Inro scenario to catch all relevant DM triggers
- The payload shape is configurable by us (we define what variables Inro sends)
- We should request: `contact.id`, `contact.username`, `contact.name`, `contact.email`, `trigger.message`, `trigger.date`

### Key Constraint: Anthropic API Is Stateless

No persistent threads. Every Claude call requires the full `messages[]` array. Our Supabase `messages` table is the conversation state store. On each incoming message:

1. Query `messages` WHERE `conversation_id = X` ORDER BY `created_at ASC`
2. Build the `messages[]` array (alternating user/assistant roles)
3. Prepend the system prompt
4. Send to Claude
5. Store Claude's response as a new row

---

## 2 · Data Model (Pseudo-Schema)

These are the core tables. Not SQL — just the shape. Will be refined when we build.

### contacts

The canonical contact record. Synced from Inro on first interaction.

```
contacts
├── id                  uuid (PK)
├── inro_contact_id     text (unique)     -- Inro's internal ID
├── instagram_handle    text (unique)
├── instagram_name      text?
├── email               text?
├── phone               text?
├── profile_picture_url text?
├── source              text              -- keyword, broadcast, organic_dm, comment
├── opted_out           boolean (default false)
├── opted_out_at        timestamptz?
├── first_seen_at       timestamptz
├── last_message_at     timestamptz
├── created_at          timestamptz
└── updated_at          timestamptz
```

### conversations

One conversation per contact (may restart if contact re-engages after a period).

```
conversations
├── id                  uuid (PK)
├── contact_id          uuid (FK → contacts)
├── status              text              -- active, completed, stalled, escalated
├── prompt_version      text              -- e.g. setter-v1, setter-v1.2
├── summary             text?             -- Claude-generated summary at close (used for returning contacts)
├── flagged_reason      text?             -- moderation flag if conversation was flagged
├── is_test             boolean (default false)
├── started_at          timestamptz
├── ended_at            timestamptz?
├── created_at          timestamptz
└── updated_at          timestamptz
```

### messages

Every message in every conversation. This is the source of truth for Claude context.

```
messages
├── id                  uuid (PK)
├── conversation_id     uuid (FK → conversations)
├── role                text              -- user | assistant
├── content             text              -- message text
├── inro_message_id     text? (unique)    -- dedup key, if available from Inro
├── dedup_hash          text? (unique)    -- fallback: hash of contact_id + content + timestamp
├── created_at          timestamptz
└── metadata            jsonb?            -- any extra context from Inro
```

### leads

Generated when Claude produces a lead summary at conversation end. Drives downstream routing.

```
leads
├── id                  uuid (PK)
├── contact_id          uuid (FK → contacts)
├── conversation_id     uuid (FK → conversations)
├── qualification_status text             -- hot | warm | cold
├── machine_count       integer?
├── location_type       text?
├── revenue_range       text?
├── call_booked         boolean
├── calendly_slot       timestamptz?
├── calculator_sent     boolean
├── key_notes           text?
├── recommended_action  text?
├── call_outcome        text?             -- showed_up | no_show | closed | not_qualified | needs_follow_up
├── call_outcome_notes  text?             -- closer's notes after the call
├── call_outcome_at     timestamptz?
├── close_crm_id        text?             -- after sync
├── customerio_id       text?             -- after sync
├── created_at          timestamptz
└── updated_at          timestamptz
```

### integration_events

Audit trail for every outbound integration call. Essential for debugging.

```
integration_events
├── id                  uuid (PK)
├── lead_id             uuid? (FK → leads)
├── contact_id          uuid (FK → contacts)
├── integration         text              -- close_crm | customerio | slack | calendly | inro
├── action              text              -- send_message | create_contact | trigger_sequence | send_alert
├── status              text              -- pending | success | failed
├── request_payload     jsonb?
├── response_payload    jsonb?
├── error_message       text?
├── created_at          timestamptz
└── completed_at        timestamptz?
```

---

## 3 · App Structure

```
src/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── inro/           -- POST handler for Inro HTTP Request actions
│   ├── (dashboard)/
│   │   ├── conversations/      -- conversation list + detail viewer
│   │   ├── leads/              -- lead pipeline (hot/warm/cold)
│   │   ├── analytics/          -- conversion rates, email capture, call booking
│   │   └── settings/           -- system prompt editor, integration config
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── global-error.tsx
│   ├── loading.tsx
│   └── error.tsx
├── components/
│   ├── conversations/          -- conversation list, message thread, status badges
│   ├── leads/                  -- pipeline board, lead cards, qualification badges
│   ├── analytics/              -- charts, stat cards, filters
│   └── ui/                     -- shared UI primitives (shadcn/ui)
├── lib/
│   ├── services/
│   │   ├── inro.ts             -- Inro API client (send messages, read contacts)
│   │   ├── claude.ts           -- Claude API wrapper (build messages, call API, parse response)
│   │   ├── conversation.ts     -- conversation state management (load history, store messages)
│   │   ├── lead.ts             -- lead creation, qualification logic, summary parsing
│   │   ├── close-crm.ts        -- Close CRM integration (create/update contacts, add notes)
│   │   ├── customerio.ts       -- Customer.io integration (trigger sequences)
│   │   ├── slack.ts            -- Slack integration (closer alerts)
│   │   └── calendly.ts         -- Calendly integration (booking confirmation)
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── middleware.ts
│   ├── config.ts               -- env var validation (Zod)
│   └── prompts/
│       └── setter-v1.ts        -- system prompt (versioned, exportable)
├── hooks/
├── types/
│   ├── database.ts             -- generated Supabase types
│   ├── inro.ts                 -- Inro webhook payload types
│   ├── lead.ts                 -- lead summary schema (Zod + TS)
│   └── claude.ts               -- Claude API types
└── store/
```

---

## 4 · Integration Specs

### Inro (DM Layer)

**Authentication:** API key or OAuth (TBD — need account access to view private API docs at `app.inro.social/api_doc.html`)

**Inbound (Inro → Us):**

- Inro scenario triggers on incoming DM
- HTTP Request action POSTs to `/api/webhooks/inro`
- We define the payload shape using Inro's variable interpolation:
  ```json
  {
    "contact_id": "{{contact.id}}",
    "username": "{{contact.username}}",
    "name": "{{contact.name}}",
    "email": "{{contact.email}}",
    "message": "{{trigger.message}}",
    "timestamp": "{{trigger.date}}"
  }
  ```

**Outbound (Us → Inro):**

- Send Claude's reply back to the contact via Inro REST API or MCP
- MCP server: `https://api.inro.social/mcp` (OAuth 2.0)
- MCP has "send message" tools for individual and batch sending
- REST API alternative: TBD pending private API docs review

**Open questions:**

- [ ] Can a scenario trigger on ALL incoming DMs (not just keyword matches)?
- [ ] Does the MCP "read conversation history" return full thread or just recent?
- [ ] REST API vs MCP for message sending — which is simpler from a Next.js server?
- [ ] No webhook signature verification documented — how do we validate inbound requests?

**Minimum plan required:** Pro (EUR 12.99/mo) — Free plan has no webhooks or API access.

### Claude (Conversation Engine)

**Model:** Sonnet (cost-effective for high volume DMs, fast response)

**Per-message flow:**

1. Load conversation history from Supabase
2. Build `messages[]` array
3. Call `anthropic.messages.create()` with system prompt + messages
4. Parse response for: reply text, any structured data (email, qualification signals)
5. Store response, send via Inro

**System prompt structure:**

1. Persona definition (name, tone, role)
2. Company/product context (VendingPreneurs, ROI calculator)
3. Qualification criteria (machine count, location, revenue thresholds)
4. Objection handling playbook
5. Email capture instructions
6. Decision routing logic (hot → Calendly, warm → nurture, cold → close)
7. Summary generation instruction (JSON output at conversation end)

**Structured data extraction:**
Claude's reply needs to contain both the DM text AND structured signals. Options:

- Tool use: define tools for `capture_email`, `qualify_lead`, `book_call`, `generate_summary`
- Structured output at conversation end (JSON lead summary)
- Parse signals from reply text (fragile — avoid)

**Recommendation:** Use Claude tool use. Define tools the model can call alongside its reply. This cleanly separates the DM text from the structured data without fragile parsing.

### Close CRM

**Purpose:** Qualified lead destination. Hot + warm leads get a contact record with Claude's notes.
**Auth:** API key (pending from Stephen/Greg)
**Actions:** Create contact, add note with conversation summary
**Trigger:** Lead created with status hot or warm

### Customer.io

**Purpose:** Email nurture for warm leads (email captured, no call booked)
**Auth:** API key (pending)
**Actions:** Create/update person, trigger welcome sequence
**Trigger:** Lead created with status warm + email present

### Slack

**Purpose:** Closer alerts when a call is booked
**Auth:** Bot token or incoming webhook URL
**Actions:** Post structured message to designated channel
**Payload:** Contact name, IG handle, qualification summary, call time, talking points
**Trigger:** Lead created with call_booked = true

### Calendly

**Purpose:** Call booking for hot leads
**Integration level:** Claude sends the link in the DM. Calendly webhook (if configured) confirms booking.
**Open:** Generic team link or per-closer link? Do we verify booking happened?

---

## 5 · What's Blocked vs. What Could Be Built

| Item                                           | Status              | Blocker                                                  |
| ---------------------------------------------- | ------------------- | -------------------------------------------------------- |
| Inro webhook handler + scenario setup          | Blocked             | Inro account access                                      |
| Inro message sending (reply delivery)          | Blocked             | Inro API docs (behind auth)                              |
| Claude conversation engine                     | **Buildable**       | System prompt needs placeholder values for qual criteria |
| Supabase schema + migrations                   | **Buildable**       | None                                                     |
| Dashboard UI (conversations, leads, analytics) | **Buildable**       | None                                                     |
| System prompt v1 skeleton                      | **Buildable**       | Persona name + qual thresholds TBD                       |
| Close CRM integration                          | Blocked             | API key from Stephen                                     |
| Customer.io integration                        | Blocked             | Account access                                           |
| Slack closer alerts                            | Partially buildable | Need channel designation                                 |
| Calendly integration                           | Blocked             | Workflow decisions pending                               |
| ManyChat full conversation scrape              | Blocked             | Dashboard login credentials                              |

---

## 6 · Inro-Specific Setup (Once Access Granted)

When Inro credentials arrive, the immediate checklist:

1. **Log in and review private API docs** at `app.inro.social/api_doc.html`
2. **Confirm plan tier** — must be Pro or above for webhooks + API
3. **Test scenario triggers** — can we catch ALL incoming DMs (not just keywords)?
4. **Test HTTP Request action** — send a test POST to a RequestBin to see exact payload
5. **Test MCP message sending** — can we send a reply via MCP from server-side code?
6. **Test REST API message sending** — compare with MCP for simplicity
7. **Check conversation history access** — does MCP return full thread? How far back?
8. **Check webhook security** — any signature verification or IP allowlisting?

---

## 7 · Instagram / Meta Constraints

These are hard limits imposed by Meta, enforced through Inro:

- **New IG accounts:** 20–30 DMs/day
- **Established accounts:** 50–100 DMs/day
- **First message:** max 300 characters
- **Text messages:** max 2,000 characters
- **Promotional broadcasts:** 24-hour messaging window
- **Non-promotional:** 7-day window
- **Comment-triggered DM flows:** fully compliant (recommended primary trigger)
- **No scraping, no password-based tools** — only Meta-approved APIs

**Implication:** Response length from Claude must be monitored. 2,000 chars is ~350 words — sufficient for DMs but the system prompt should instruct Claude to keep replies concise and conversational (1–3 short paragraphs max).

---

## 8 · Risk Register

| Risk                                                               | Impact                                         | Mitigation                                                                                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Inro can't trigger on all DMs (keyword-only)                       | High — misses organic conversations            | Test immediately on access. Fallback: create catch-all keyword list                                                           |
| Inro API doesn't support sending replies programmatically          | Critical — breaks Option B entirely            | MCP has send_message tools, so likely fine. Verify on access. Fallback: use Inro's native AI with limited customization       |
| Instagram rate limits throttle high-volume broadcast re-engagement | Medium — slows pipeline fill                   | Phase broadcasts over days. Prioritize organic + keyword triggers first                                                       |
| Claude produces off-brand or inaccurate responses                  | High — damages brand trust                     | Extensive prompt testing (20+ simulated convos). Human monitoring in Phase 2. Conversation viewer in dashboard for ongoing QA |
| No webhook signature verification from Inro                        | Medium — spoofed requests possible             | IP allowlisting if Inro publishes IPs. Shared secret in payload. Rate limiting on endpoint                                    |
| ManyChat training data incomplete                                  | Low — affects prompt quality, not architecture | Build prompt from strategy doc + team knowledge first. Refine with real data later                                            |
| Contact sends messages faster than we process                      | Medium — race conditions, duplicate replies    | Queue incoming messages per conversation. Process sequentially per contact. Debounce rapid-fire                               |

---

## 9 · Conversation Lifecycle

### When a conversation ends

Two mechanisms work together:

1. **Claude-initiated close** — Claude generates the lead summary when it has delivered value (calculator sent, email captured or declined) and reached a routing decision (Calendly link sent OR warm close OR cold exit). The summary is the final action.
2. **Timeout close** — If no reply for 4–6 hours, the conversation auto-closes as "stalled." A partial lead record is created with whatever data was captured. Simple cron or Supabase DB function checking `last_message_at`.

### Returning contacts

A new `conversation` record is created, but prior conversation summaries are loaded as context. Claude's system prompt includes a section for returning contacts so it can reference prior interactions naturally. Full old message history is NOT loaded — just the stored summary from each prior conversation. Keeps the context window lean.

### Message deduplication

Store Inro's message ID (or a hash of `contact_id + message + timestamp`) on the `messages` table with a unique constraint. If duplicate, return 200 and skip. Short dedup window (~30 seconds) as fallback if Inro doesn't provide a stable ID.

### Opt-out handling

Handled at two layers:

1. **Claude** — recognizes opt-out language, responds with a clean exit, does not re-engage
2. **App** — flags contact as `opted_out` in Supabase. Webhook handler checks this flag before processing. Inro blocklist used if available.

Non-optional. Meta can restrict the account if automated messages continue after opt-out.

### Content moderation

No separate moderation pipeline. System prompt instructs Claude to disengage politely from threatening, abusive, or clearly non-business messages. Conversation gets a `flagged_reason` field. Flagged conversations surface prominently in the dashboard for human review.

### Response style

System prompt constrains Claude to: 1–3 short paragraphs, under 300 words, texting tone not email tone. One message per turn — no multi-bubble splitting. 2,000 char Instagram limit gives comfortable headroom at 300 words (~1,500 chars). Actual tone and length will be refined once ManyChat conversation data is scraped and analyzed.

---

## 10 · Testing Strategy

### Simulated conversation harness

A `/api/test/simulate` endpoint (dev/staging only) that:

- Accepts a message as if it came from Inro
- Runs it through the full conversation engine (history loading, Claude call, response parsing)
- Returns Claude's reply without sending to Inro
- Stores as a real conversation with a `test` flag

This enables the 100+ simulated conversation runs planned for prompt iteration — no live Instagram account needed.

### Prompt iteration workflow

1. Run simulated conversations covering: ideal leads, early-stage contacts, objection-heavy, opt-outs, returning contacts, off-topic, edge cases
2. Review in dashboard conversation viewer
3. Iterate system prompt
4. Re-run same scenarios, compare

### Live testing (Phase 2)

Once Inro access is granted, test with a real Instagram account (test DMs) before pointing at the VendingPreneurs account. Human monitors all conversations for first 5 days.

---

## 11 · Dashboard Auth

Email + password login via Supabase Auth. No magic links. Approved email addresses only — no public signup. Invite-only, managed by adding allowed emails to the system.

Role-based access deferred to later if closers need different views.

### Closer feedback loop

Closers update lead outcomes after calls: showed up / no-show / closed / not qualified / needs follow-up. This goes on the `leads` table. Can be a simple form in the dashboard or a Slack workflow reaction. Without this data, Claude's qualification accuracy can't be measured.

---

## 12 · Prompt Versioning

`prompt_version` field on the `conversations` table. Stamped when conversation is created. Prompt source lives in `src/lib/prompts/setter-v1.ts` as a versioned export.

Enables "did v2 improve things?" analysis later without any additional infrastructure.

---

## 13 · Decision Log

| Date       | Decision                                                | Rationale                                                            |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| 2026-04-08 | No n8n/Make — all custom orchestration                  | Full control over data flow, conversation state, and routing logic   |
| 2026-04-08 | Single-brand Phase 1 (VendingPreneurs)                  | Prove the system works before replicating                            |
| 2026-04-08 | Multi-tenancy deferred                                  | Bolt on later — not worth the complexity upfront                     |
| 2026-04-08 | API cost not a concern                                  | Cents per conversation — not worth optimizing                        |
| 2026-04-08 | Prefer fully Claude-handled (no human escalation)       | Minimize operational overhead. Keywords as last resort               |
| 2026-04-08 | Supabase as canonical store (not Google Sheets)         | Proper relational data, RLS, real-time, typed queries                |
| 2026-04-08 | Option B preferred (we own Claude calls)                | Maximum control over prompts, models, conversation state, and data   |
| 2026-04-08 | Dual conversation-end signals                           | Claude closes when complete + timeout for abandonment (4–6hr)        |
| 2026-04-08 | Returning contacts get new conversation + old summaries | Clean analytics per conversation, lean context window                |
| 2026-04-08 | No magic links                                          | Email + password auth. Bad past experiences with magic link delivery |
| 2026-04-08 | Response style from real data                           | Tone/length to be refined after ManyChat conversation scrape         |
| 2026-04-08 | Prompt versioning from day one                          | `prompt_version` on conversations table — low cost, high value later |
