# Open Questions

Unresolved items from the strategy doc and scoping sessions. Update status as decisions are made.

## Brand & Persona

- [ ] Confirm VendingPreneurs as Phase 1 brand (George)
- [ ] Define setter persona name and voice (Sofia / Jeffrey for brand QA)

## Qualification Criteria

- [ ] Machine count floor
- [ ] Revenue floor
- [ ] Location type preferences
- [ ] Who provides these? (sales team input needed)
- [ ] Target email capture rate
- [ ] Target call booking rate
- [ ] Current human setter benchmarks for comparison

## Inro Integration Model

- [ ] Get Inro login credentials and account access from colleagues
- [ ] Test Inro's native Claude integration — evaluate if it's good enough or if we need full custom (Option A vs B)
  - **Option A:** Inro calls Claude directly, fires webhooks to us with conversation events → we handle data routing only
  - **Option B:** Inro sends raw incoming messages via webhook, we call Claude, we send reply back through Inro API → we own conversation state
- [ ] Review Inro API documentation — webhook event types, message sending API, conversation context payload
- [ ] Confirm plan tier supports webhook + API capabilities at required volume

## Conversation State

- [ ] Design conversation storage in Supabase — full message history per contact
- [ ] **Note:** Anthropic Messages API is stateless — no persistent threads. We must store and pass full conversation history on each call. Design the data model accordingly.

## External Services — All Blocked on Credentials

- [ ] Inro account access (blocked — waiting on colleagues)
- [ ] ManyChat dashboard login for full conversation scraping (blocked — waiting on credentials)
- [ ] Close CRM API key and contact write permissions (Greg / Stephen)
- [ ] Customer.io account and API access
- [ ] ROI calculator URL finalized and live (Matt's intern)

## Calendly Integration

- [ ] Generic team link or specific closer's link?
- [ ] How to confirm booking happened — Calendly webhook?
- [ ] Follow-up if contact doesn't book within X hours?
- [ ] Direct booking or human confirms/rebooks?

## Human Escalation

- [ ] Preference is fully Claude-handled with no escalation
- [ ] Define keyword triggers for edge cases (if needed)
- [ ] Abusive/threatening contact handling

## Failure Modes (Document Now, Build Later)

- [ ] Claude API downtime — fallback message? Human handoff? Silence?
- [ ] Webhook delivery failure — retry logic, dead letter queue
- [ ] Rapid-fire messages from contact — debounce / queue strategy
- [ ] Inro API downtime — queued reply delivery

## Compliance & Data

- [ ] Ben Brenner data architecture review (PII handling for email capture pipeline)
- [ ] Meta messaging window compliance confirmed for broadcast re-engagement

## Operational

- [ ] Comp / setter impact coordinated with George and HR before Phase 3 cutover
- [ ] Slack channel designated for closer alerts

## Training Data

- [ ] ManyChat scraper currently only captured `last_input_text` per contact (514 contacts)
- [ ] Full conversation scrape requires ManyChat dashboard login credentials (blocked)
- [ ] Transcripts will be used for system prompt training — few-shot examples and evaluation
- [ ] Scripts exist but are in `/tmp/` — need to be regenerated or moved when ready

## Decided / Closed

- [x] ~~n8n / Make~~ — **Not using.** All orchestration is custom-built in the app. All references removed from strategy doc. (2026-04-08)
- [x] ~~Multi-tenancy~~ — **Not now.** Building single-brand for Phase 1. May bolt on multi-tenant later. (2026-04-08)
- [x] ~~API cost concerns~~ — **Not a concern.** Cents on the dollar, not worth optimizing for. (2026-04-08)
