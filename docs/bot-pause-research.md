# Bot Pause / Human Takeover — Research

**Status:** interim research, not yet implemented. Waiting on leadership direction.
**Captured:** 2026-04-18

---

## The reported problem

When a team member jumps in to reply to a DM via SendPulse's UI, the bot also responds to the user's next message — so the contact sees two parallel voices (bot + human) until the conversation ends.

## Why it happens today

`src/app/api/webhooks/sendpulse/route.ts` processes every `incoming_message` event through the Claude engine. There is no check for whether a human has taken over. The existing `pauseAutomation()` call (line 33) only pauses SendPulse's **own** standard reply flows — it does **not** stop our bot, because our bot runs as an external webhook handler outside SendPulse's automation graph.

Relevant code:

- [src/app/api/webhooks/sendpulse/route.ts](../src/app/api/webhooks/sendpulse/route.ts)
- [src/lib/services/engine.ts](../src/lib/services/engine.ts)
- [src/lib/services/sendpulse.ts](../src/lib/services/sendpulse.ts)

Only `opted_out` short-circuits the flow today — no concept of "paused" or "handed off."

---

## SendPulse capabilities (verified against docs)

### Webhook events available

| Event              | When it fires                                                             |
| ------------------ | ------------------------------------------------------------------------- |
| `incoming_message` | User sends a DM (we subscribe to this)                                    |
| `outgoing_message` | **Any** outbound message — bot-flow OR operator-typed in the SendPulse UI |
| `new_subscriber`   | Contact first subscribes                                                  |
| `open_chat`        | User hits an Action element with "Open chat" option                       |
| `run_custom_flow`  | Flow triggered                                                            |
| `link_click`       | Button link clicked                                                       |
| `unsubscribe`      | User unsubscribes                                                         |
| `bot_block`        | User blocks the bot                                                       |

### Payload shape

All events carry: `info`, `service`, `title`, `bot`, `contact`, `date`.

Multiple sources indicate the payload also carries an **`operator` object** (`username`, `user_id`, `email`, `avatar`, `created_at`) when a human team member performed the action. **This is the critical field for distinguishing bot-sent vs. operator-sent outbound messages** — but we have not yet inspected a real `outgoing_message` payload to confirm the exact shape.

### Pause-bot feature (native SendPulse)

- Inside a subscriber card, an operator can click **Pause automation** — halts SendPulse's own flows for 60 min (extendable in 60-min increments). Resume via **Continue Autoflows**.
- There's a conversation-level setting **"Pause bot automation for [1 / 3 / 6 / 24 hr]"** that can **auto-engage whenever an operator replies**.
- Durations available: 1hr / 3hr / 6hr / 24hr.
- `setPauseAutomation` API endpoint exists (write-only; we already call it). **No documented read/status endpoint** — needs verification with SendPulse support.

---

## Option matrix

### Fully automatic (no team action required)

**Option A — Subscribe to `outgoing_message`, skip when `operator` is present.** _Recommended._

- Extend our Zod schema to accept `outgoing_message`.
- When one arrives with an `operator` object → set `bot_paused_until = now + 6h` on the contact (new column, additive).
- On next `incoming_message`, check `bot_paused_until` → skip Claude + send if still active.
- Cost: schema migration + handler branch.
- Risk: need to confirm the `operator` field is actually present in the real payload.

**Option B — Honor SendPulse's built-in auto-pause, poll their pause-status endpoint.**

- Team enables "Pause bot automation on operator reply" in SendPulse.
- Our webhook hits a GET status endpoint on each `incoming_message` before calling Claude.
- Cost: +1 API round-trip per message (~100–300 ms latency). Depends on a status endpoint that isn't in the public docs.

**Option C — Compare last outbound message author via message-history API.**

- Query SendPulse's message history endpoint per incoming message.
- Same latency cost as B, same documentation gap.

**Option D — Bot-initiated handoff tool.**

- Give Claude a `request_human_handoff` tool.
- When it detects frustration, "I want to speak to a human," or complex objections, it pauses itself and alerts the team.
- Proactive, not reactive. Stacks well with A/B/C.

### Manual (team action required)

**Option E — Tag `bot-off` in SendPulse.**

- Team adds a `bot-off` tag to the contact when taking over.
- Our webhook handler already receives `event.contact.tags` ([src/types/sendpulse.ts:23](../src/types/sendpulse.ts:23)) — add an early-skip branch alongside `opted_out`.
- Tag removal re-enables the bot.
- Weakness: requires team discipline; doesn't catch the **first** message after takeover if the tag is added after reply (the bot fires on an ~3–8s window from webhook receipt to send).

**Option F — "Take Over" button in our dashboard.**

- Click flips `bot_paused_until` on the contact row.
- Team can reply either through our UI (we call SendPulse send API) or through SendPulse's UI (same effect).

### Safety-net (stacks with any option)

**Option G — Grace-period delay.**

- Bot waits 15–30 s after receiving a webhook before replying.
- If any outbound message appears in that window (detected via `outgoing_message` webhook or history query), cancel our reply.
- Adds latency to the happy path but catches the race on the **first** message of a takeover — the weak point of every other option.

---

## Recommendation (if leadership wants a path forward)

Ship **A + D + G**:

- **A** is the fully automatic core.
- **D** catches the proactive "user asks for a human" cases.
- **G** removes the race-condition weak point on the first message of a takeover.

Fallback if `operator` field turns out not to exist in practice: **B** (poll pause-status API) or **E** (tag-based, manual).

## Required to ship A

1. Test webhook delivery: enable `outgoing_message` in SendPulse Bot Settings > Webhooks, send one reply from the SendPulse UI, capture the raw payload, confirm `operator` field shape.
2. Additive migration: `contacts.bot_paused_until timestamp null`.
3. Extend `sendpulseWebhookSchema` to accept `outgoing_message` with optional `operator` object.
4. Branch in `handleEvent`: on `outgoing_message` with `operator` → set `bot_paused_until`. On `incoming_message` → check `bot_paused_until` before processing.
5. Dashboard surface: display pause state on the contact row, allow manual override.

---

## Interim state (now)

Global kill switch via `BOT_ENABLED` env var. When set to `false`, both webhook handlers (SendPulse + Inro) short-circuit to a 200 response with `skipped: 'bot_paused'`. Set it on Vercel and the bot goes silent; unset / set to `true` to resume.

This is a temporary operational pause, not the final solution.

---

## Sources

- [SendPulse Chatbot Webhooks](https://sendpulse.com/integrations/api/chatbot/webhooks)
- [Manage automated replies](https://sendpulse.com/knowledge-base/chatbot/conversations/manage-autoreplies)
- [Chats with subscribers](https://sendpulse.com/knowledge-base/chatbot/conversations)
- [SendPulse Live Chat](https://sendpulse.com/knowledge-base/chatbot/livechat)
- [SendPulse Chatbot API overview](https://sendpulse.com/integrations/api/chatbot)
