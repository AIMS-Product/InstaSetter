# P2.01 — Live email delivery channel decision

**Decision date:** 2026-04-29
**Owner:** James (final sign-off pending)
**Status:** Locked pending DNS + reply-to inbox provisioning (see "What James must do" in [01-pick-channel.md](./01-pick-channel.md))

---

## Decision

**Chosen provider: [Resend](https://resend.com).**

The first live transactional email path for the DM Setter ships through
Resend's `POST /emails` endpoint, with delivery events fanned in via a
Svix-signed webhook at `/api/webhooks/resend` (registered in P2.04).

**Verified sender:** `team@vendingpreneurs.com`
**Display name:** `Anthony from VendingPreneurs`
**Reply-To:** `sales@vendingpreneurs.com` (monitored shared inbox; James
provisions before P2.04 cutover.)

---

## Rationale (3 bullets)

1. **Developer experience matches the rest of the stack.** First-class
   CLI (`resend listen` for local webhook forwarding analogous to
   `stripe listen`), idiomatic Node/TypeScript SDK, dashboard ergonomics
   that map 1:1 to Vercel's and Supabase's. Same vendor cohort. The team
   moves through it without a context switch.
2. **Webhook signing via Svix is a known-good pattern.** Svix is the
   de-facto outbound webhook signer (Discord, Notion, Brex use it).
   `svix` package usage in the P2.04 verifier route is a few lines, and
   the well-documented header contract sidesteps Stripe-style hand-rolled
   HMAC. No reinvention.
3. **Cleaner sender-domain verification flow.** DKIM/SPF/DMARC propagation
   status is surfaced live in the dashboard with explicit failure reasons.
   Re-add to retry is one click. Postmark's "Pending" state by contrast
   does not always tell you which record is wrong, and the resubmit flow
   is clunkier.

(Pricing parity holds at our volume: Pro $20/mo for 50k + $0.90/1k overage
vs Postmark's $15/mo for 10k. Sub-1k/day VP traffic puts us comfortably
inside either base tier.)

---

## Runner-up: Postmark

Postmark stays second-pick — genuinely strong deliverability reputation
(canonical pure-transactional ESP for a decade), no marketing-email
crosstalk fighting for IP reputation, and a slightly better price point at
low volume. Three reasons we don't pick it first:

1. DX feels frozen relative to Resend / Vercel / Supabase. The dashboard
   and SDK predate the modern dev-tool aesthetic.
2. No documented `Idempotency-Key` header on the `/email` endpoint today
   (verified against
   <https://postmarkapp.com/developer/api/email-api>, fetched April 2026).
   We'd compensate with stricter DB-side `provider_message_id` uniqueness
   in P2.04, but losing a battle-tested HTTP-level dedup primitive is a
   real cost.
3. Webhook auth is HTTP Basic (`POSTMARK_WEBHOOK_USERNAME` /
   `POSTMARK_WEBHOOK_PASSWORD`) rather than signature-verified. Works,
   but is less idiomatic than Svix.

**Switching cost (Resend → Postmark mid-rollout):** 1–2 days, all isolated
to `src/lib/services/email-provider.ts` + the P2.04 webhook route handler.
The shim's typed boundary insulates everything downstream.

---

## Eliminated

| Provider                    | Why eliminated                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Customer.io**             | Overkill for first cutover. $100/mo Essentials entry. The value is the journey/segment engine we don't need yet. Reconsider when P3 (Close handoff) wires in — Customer.io's Close integration would matter then.                                            |
| **SendGrid**                | Under Twilio's umbrella now (`docs.sendgrid.com` redirects to `twilio.com/docs/sendgrid`). Heavier auth, no documented idempotency-key support on the mail-send endpoint, DX feels frozen circa 2019. Reputation is fine; the developer surface has slipped. |
| **Close CRM as the sender** | Close's email API is tuned for sales-rep mailbox proxying, not transactional volume, and replies route into the Close inbox by default. Close stays the sales-rep follow-up channel in P3; we do NOT use it for the post-email-capture lead-magnet send.     |

---

## Doc URLs cited (fetched April 2026)

| Resource                                             | URL                                                                   | What we verified                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend send-email API                                | <https://resend.com/docs/api-reference/emails/send-email>             | `POST https://api.resend.com/emails`. Bearer-token auth. Required: `from`, `to` (max 50), `subject`. Attachments capped at 40MB after base64. `Idempotency-Key` header supported, 24h window, ≤256 chars.                                                 |
| Resend webhooks                                      | <https://resend.com/docs/dashboard/webhooks/introduction>             | Svix-based delivery, signed payloads, at-least-once semantics.                                                                                                                                                                                            |
| Resend webhook event types                           | <https://resend.com/docs/dashboard/webhooks/event-types>              | All six events we subscribe to are documented: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`. (Plus `opened`, `clicked`, `received`, `scheduled`, `suppressed` — not subscribing in v1.) |
| Resend signature verification                        | <https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests> | Svix-style header verification; signing secret available after webhook endpoint registration.                                                                                                                                                             |
| Resend domain verification                           | <https://resend.com/docs/dashboard/domains/introduction>              | DKIM + SPF mandatory, DMARC recommended, MX optional (skip in v1). 72h re-check window; failed records surface specific reasons in dashboard.                                                                                                             |
| Resend pay-as-you-go pricing                         | <https://resend.com/changelog/pay-as-you-go-pricing>                  | Pro $20/mo for 50k + $0.90/1k overage. Free tier 3k/mo with 100/day cap.                                                                                                                                                                                  |
| Postmark email API (runner-up reference)             | <https://postmarkapp.com/developer/api/email-api>                     | `POST /email`. `X-Postmark-Server-Token` header. No documented idempotency-key.                                                                                                                                                                           |
| Customer.io transactional API (eliminated reference) | <https://docs.customer.io/journeys/transactional-api>                 | `POST https://api.customer.io/v1/send/email`. Bearer auth. No documented idempotency-key.                                                                                                                                                                 |
| Customer.io pricing (eliminated reference)           | <https://customer.io/pricing/>                                        | $100/mo Essentials entry.                                                                                                                                                                                                                                 |

---

## Fallback plan (if Resend hits a blocker)

**Trigger conditions:**

- Domain verification fails twice on `vendingpreneurs.com` after 72h.
- Resend rate-limits or caps unexpectedly.
- Deliverability complaint (Resend's Sender Identity feature flags us).

**Fallback path: Postmark.** See "Runner-up" above for cost.

**What we keep on a swap:**

- Same `sendTransactionalEmail({...})` interface (lives in
  `src/lib/services/email-provider.ts`).
- Same DB tables and webhook-event dedup pattern (P2.04 builds these
  provider-agnostic).
- Same env-var-per-concern pattern (`POSTMARK_SERVER_TOKEN` replaces
  `RESEND_API_KEY`; `POSTMARK_WEBHOOK_USERNAME` /
  `POSTMARK_WEBHOOK_PASSWORD` replace `RESEND_WEBHOOK_SECRET`).

**Estimated rework:** 1–2 days of focused work, all isolated to
`email-provider.ts` + the webhook route handler.

---

## Acceptance-criteria status

- [x] Provider chosen + runner-up named.
- [x] Doc URLs cited with fetched-on date (April 2026).
- [x] `src/lib/services/email-provider.ts` shipped as a typed `NOT_CONFIGURED` stub. Downstream P2.02–P2.05 specs can import the signature today without runtime crashes.
- [x] `src/lib/services/__tests__/email-provider.test.ts` covers the not-configured stub + never-throws contract (5 cases).
- [x] `src/lib/config.ts` exports `getEmailProviderConfig()` Zod slice; all fields optional/nullable; existing slices unchanged; new tests in `src/lib/__tests__/config.test.ts`.
- [x] `docs/sofia-feedback-priorities.md` updated with chosen provider, sender display, and reply-to.
- [ ] DNS records on `vendingpreneurs.com` submitted to registrar (handed off to James — see "What James must do" in [01-pick-channel.md](./01-pick-channel.md)). Tracked separately; does not block this branch.
- [ ] `sales@vendingpreneurs.com` (or Google Group) provisioned (handed off to James). Same.
- [ ] Resend account on Free tier today; upgrade to Pro before P2.04 cutover (handed off to James).

---

## Notes for downstream specs (P2.02 / P2.03 / P2.04 / P2.05)

- `email-provider.ts` returns `{ success: false, error: 'NOT_CONFIGURED', retryable: false }` until P2.04 wires the live SDK call. Treat the stub as the contract, not the implementation.
- The `idempotencyKey` field is required in the input — P2.04 will pass it as Resend's `Idempotency-Key` header. Use a deterministic value tied to the business event (e.g. `email_capture_<conversationId>`).
- The webhook handler P2.04 ships at `/api/webhooks/resend` MUST cross-check `event.data.livemode` against `process.env.NODE_ENV === 'production'` (per the Stripe rule template — `~/.claude/rules/stripe.md`). Test-mode events arrive at the prod endpoint when sandbox sends fire; do not let them write to live conversation rows.
- P2.04 may install `resend` and `svix` npm packages. This branch deliberately does NOT install them; the shim is pure TypeScript.
- The 40MB attachment cap (after base64) drives P2.03's storage strategy — stick to PDFs and small assets; large media stays out of email and into a hosted-link fallback.
