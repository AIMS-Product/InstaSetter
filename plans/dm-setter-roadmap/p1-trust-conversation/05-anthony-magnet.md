# [P1.05] Anthony lead magnet path — architecture + decision

**Status:** open
**Phase:** 1 — Trust + conversation foundations
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385010071883
**Owner:** unassigned
**Depends on:** none for the decision; the chosen plumbing depends on P1.04 (forbidden phrases) only loosely. Implementation tasks spawn under P2 (live email delivery).
**Blocks:** P2.\* live-delivery work — P2 picks up wherever this spec lands the architecture.
**Risk:** medium — three architectures to evaluate; the decision shapes the next 1–3 weeks of P2.
**Rough size:** S–M for the decision + plumbing scaffolding (1–2 days). Actual delivery wiring is P2.

## Problem

Sofia, on Apr 29 (`docs/sofia-feedback-priorities.md`, P1 row "Prepare Anthony lead magnet path"):

> Sofia wants the Anthony lead magnet moving within roughly a week. → Decide whether the first version is landing-page capture, DM capture, or both.

Anthony is the VendingPreneurs founder. Sofia's "lead magnet" refers to a prep resource (likely a checklist PDF or short video) the bot can promise to send when capturing an email. The post-email-behavior shipped in commit `80d5d98` (`src/lib/prompts/post-email-behavior.ts`, `EmailTemplateSchema`) already supports an `attachment` URL + `subject`/`body`, but there's no live delivery mechanism today — `deliveryMode: 'none'` is the default and the bot is explicitly forbidden from promising automatic sending in that mode (refinement enforced by `PostEmailBehaviorSchema`'s refine in `post-email-behavior.ts` lines 36-45).

The decision is **which capture path** to prioritise:

- **A. DM capture only** — extend the existing in-DM email-capture flow to actually send a magnet. Lowest surface change.
- **B. Landing-page capture only** — a public Next.js page (`/m/[slug]`) takes name + email, posts to a Server Action, fires the same delivery pipeline. Different acquisition motion (paste-able link in IG bio, ads, etc.).
- **C. Both** — DM and landing page funnel to a unified `lead_capture_events` table, both trigger the same delivery job.

The existing source-tracking work (commits `7af70f9` Apr 24 — `feat(attribution): add instagram source tracking`; `2c06e41` — `feat(sources): improve lead source setup usability`) already gives us per-source attribution on inbound DMs (`src/lib/services/marketing-attribution.ts`, `src/app/dashboard/marketing-sources/page.tsx`). That work was DM-only. Path B / C extend the same model to landing pages.

This spec is a **decision** + the plumbing scaffolding common to all three paths. It does NOT pick a specific delivery provider (Customer.io / Resend / Close); P2 picks that.

## Goal

Sofia + Anthony pick path A, B, or C and the implementing agent has a clear, ready-to-build plan for whichever they choose. The spec ships:

1. A side-by-side comparison of A / B / C with concrete trade-offs.
2. The shared scaffolding all three need (the `lead_capture_events` event table + a delivery-job interface).
3. Per-path detailed plumbing: schema, services, UI surfaces, env vars, integration boundaries with documented unknowns the user must resolve.
4. A recommendation grounded in Sofia's stated constraints ("within roughly a week", first version, no production magnet exists yet).

## Non-goals

- This spec does NOT ship live email delivery. That is P2.
- This spec does NOT pick the email provider (Resend / Customer.io / Close / SendGrid). P2 owns that.
- This spec does NOT design Anthony's actual content (PDF copy, subject line, asset hosting). Sofia and Anthony own that.
- This spec does NOT design the dashboard analytics for landing-page conversion (P5 attribution).
- No live DM delivery wiring beyond what already exists in `email-capture.ts`. The bot still says what it says today; this is plumbing for what comes next.

## Functional requirements (decision-time)

1. Document path A (DM-only), path B (landing-page-only), and path C (both) with (a) operator workflow, (b) prospect workflow, (c) schema implications, (d) which integrations are required, (e) failure modes, (f) approximate scope.
2. Identify the **shared scaffolding** all three paths need — a single `lead_capture_events` table + a delivery-trigger interface. The scaffolding is implementation-ready in this spec; whichever path the user picks, the scaffolding stays.
3. For path B (landing page) and path C (both), build right up to the third-party boundary. Stop at: which delivery provider, which sender domain. Document exactly what Sofia / Anthony / James must do.
4. Recommend a path. Justify against Sofia's "within a week" constraint and the present codebase's readiness.

## Functional requirements (build-time, scaffolding only)

These ship in this PR regardless of which path Sofia picks:

5. New table `lead_capture_events` (additive — see schema). Captures the moment an email is committed to a magnet flow, regardless of channel.
6. New service `src/lib/services/lead-capture.ts` exporting `recordLeadCaptureEvent({ source, email, contactId?, conversationId?, attribution? })`. Pure data-layer; no delivery side-effects.
7. New service-layer interface `LeadMagnetDelivery` describing the contract any future provider must satisfy. Implemented as a no-op in v0 (`NoopMagnetDelivery`) so the rest of the plumbing can land without a real provider.
8. The existing in-DM `capture_email` tool routing in `engine.ts` (`routeLeadEvents` `case 'capture_email'`) calls `recordLeadCaptureEvent({ source: 'dm', ... })` after writing the email to `contacts.email`. Side-effect-free for callers that don't care; only writes a row.
9. Surface label catalog (P1.01) gains `dashboard.lead-capture-events` for an internal-only debug page (path can come later — placeholder OK).

## Acceptance criteria

- [ ] This spec contains a fully-fleshed comparison table covering A / B / C.
- [ ] Recommendation section clearly answers: "If we have one week, do A, B, or C?"
- [ ] Migration `supabase/migrations/<ts>_lead_capture_events.sql` creates the table additively, RLS service-role-only.
- [ ] Service `recordLeadCaptureEvent` exists with a Zod-validated input. Unit-tested.
- [ ] `LeadMagnetDelivery` interface defined; `NoopMagnetDelivery` implementation logs but doesn't send.
- [ ] DM path: `routeLeadEvents` `case 'capture_email'` writes a `lead_capture_events` row tagged `source='dm'`. Integration test confirms.
- [ ] Per-path implementation plans (A / B / C) each have:
  - Schema additions (or absence thereof)
  - Server Action / API route signatures
  - UI surfaces touched
  - Env vars required
  - Third-party prerequisites with concrete asks of the user
- [ ] Decision section ends with explicit "User must answer" bullets so Sofia / Anthony / James can resolve the open questions in one Slack thread.

---

## Decision matrix

| Dimension                                | A. DM-only                                                                                       | B. Landing-page-only                                                                                             | C. Both                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Operator workflow**                    | Configure post-email behaviour in Flow Builder Email block. Set `deliveryMode: 'customerio'      | 'webhook'`.                                                                                                      | Create a magnet record in a new `/dashboard/lead-magnets` panel: name, slug, asset URL, template. Public URL `/m/[slug]` auto-generated. | Both above. Magnet record has `dm_enabled` + `landing_enabled` toggles. |
| **Prospect workflow**                    | Reply to IG DM, hand over email, receive magnet email.                                           | Click a link (IG bio, ad CTA), land on `/m/[slug]`, fill form, receive magnet email.                             | Whichever path the prospect found. Both deduplicate on email.                                                                            |
| **Schema additions**                     | Reuse `contacts.email`, write `lead_capture_events`.                                             | New `lead_magnets` table + `lead_capture_events`.                                                                | Same as B.                                                                                                                               |
| **Public-facing pages**                  | None new.                                                                                        | `app/m/[slug]/page.tsx` + `app/m/[slug]/actions.ts`. Mobile-first form. CSP-safe.                                | Same as B.                                                                                                                               |
| **Required integrations**                | Email delivery provider (P2).                                                                    | Email delivery provider + spam protection (Cloudflare Turnstile or hCaptcha) on the public form.                 | Same as B + the magnet record table.                                                                                                     |
| **Anthony's required input**             | Asset URL, subject line, body.                                                                   | Asset URL, subject line, body, slug, headline, hero copy for the landing page.                                   | Same as B.                                                                                                                               |
| **Sofia's edit surface**                 | Email block panel (already exists, commit `80d5d98`).                                            | New `/dashboard/lead-magnets` panel.                                                                             | Both.                                                                                                                                    |
| **Spam / abuse**                         | Bot already serves real prospects through SendPulse — minimal new attack surface.                | Public form needs rate-limiting per-IP and a captcha.                                                            | Same as B.                                                                                                                               |
| **Time to first prospect-visible value** | 3–5 days (provider hookup + flow draft → published).                                             | 5–8 days (form + provider + spam protection + magnet record UI).                                                 | 7–10 days.                                                                                                                               |
| **Complexity**                           | Low                                                                                              | Medium                                                                                                           | High                                                                                                                                     |
| **Re-uses existing source-tracking**     | Yes (DM → SendPulse already tracks source).                                                      | Partial — landing page sends UTM-style params we'd map into the same `LeadSourceContext` shape.                  | Yes for both.                                                                                                                            |
| **Failure modes**                        | Email send fails → bot already promised it. Recovery: dashboard "delivery status" badge + retry. | Form submit fails → user sees an inline error, no commitment yet. Email send fails after submit → same recovery. | Both.                                                                                                                                    |

## Recommendation

**Path A (DM-only).** Reasoning grounded in Sofia's stated constraints:

1. **"Within roughly a week"** — Path A reuses the email-capture-tool flow already running in production (`src/lib/services/engine.ts` `routeLeadEvents` `case 'capture_email'`). The only new components are the delivery service + Anthony's asset. Path B requires a new public route, captcha, and a magnet-record UI before a single email goes out.
2. **First-version conservatism** — the bot already asks for emails today (commit `affaa6c` and earlier). Today's 0.4% capture rate (per `email-capture.ts` data note) is the baseline; making the email actually arrive is the highest-impact change. Add a landing page once we know the magnet content converts.
3. **Existing source-tracking covers DM** — `marketing-attribution.ts` already attributes DM-originated conversations to a campaign / material / entry-action. We can already answer "which IG creative drove this email capture?" without doing the landing-page work.
4. **Path B is mostly net-new code** — public form, captcha, mobile design, anti-abuse. Worth doing eventually for paid-ad CTAs, but not for the first lead-magnet release.
5. **Path C is the right answer in 4–6 weeks**, not 1 week. Land A first, validate the magnet content, then add B as parallel intake.

The architecture in this spec keeps the door open to B and C: the `lead_capture_events` table is channel-agnostic, and the `LeadMagnetDelivery` interface decouples the trigger from the delivery transport.

**If Sofia disagrees** — for example, if Anthony already has a high-traffic landing page in another tool (Webflow, Carrd) and the priority is sunsetting that tool — pivot to Path B. The plumbing in this spec is unchanged. The only difference is which UI surface lands first.

## "User must answer" before P2 picks this up

These open questions block P2's delivery wiring. Sofia / Anthony / James must resolve in one Slack thread before P2 starts:

- [ ] **Path:** A, B, or C? (Default recommendation: A.)
- [ ] **Asset:** does the magnet exist? If no — what's the ETA? Without a real asset the DM still cannot promise delivery.
- [ ] **Asset hosting:** Vercel Blob, Supabase Storage, Customer.io-hosted, or "we just link to a URL Anthony controls"?
- [ ] **Delivery provider:** Resend, Customer.io, Close, or SendGrid?
- [ ] **Sender identity:** the `team@vendingpreneurs.com` recommendation in `sofia-feedback-priorities.md` "Post-Email Delivery Notes" — confirm domain ownership + DKIM/SPF/DMARC setup status.
- [ ] **Reply handling:** the same doc recommends replies go to a sales inbox, not a no-reply. Confirm which inbox.
- [ ] **Live-or-draft:** is the first send going out via the existing draft-only Flow Builder config, or do we need the published-snapshot path before going live? (Today, drafts persist but don't affect live traffic — see `plans/post-email-behavior-config-tdd/plan.md` "Live Publish Follow-Up".)

## Affected files (scaffolding only — not delivery wiring)

**New files:**

- `src/lib/services/lead-capture.ts` — `recordLeadCaptureEvent`. Pure DB write.
- `src/lib/services/__tests__/lead-capture.test.ts`
- `src/lib/services/lead-magnet-delivery.ts` — `LeadMagnetDelivery` interface + `NoopMagnetDelivery` implementation.
- `src/lib/services/__tests__/lead-magnet-delivery.test.ts`
- `supabase/migrations/<ts>_lead_capture_events.sql`

**Modify:**

- `src/lib/services/engine.ts` — extend `routeLeadEvents` `case 'capture_email'` to call `recordLeadCaptureEvent({ source: 'dm', email, contactId, conversationId, attribution: leadSourceContext })`. The `leadSourceContext` is already threaded into `processMessage` via `options.leadSourceContext` (lines 80-84).
- `src/types/database.ts` — regenerated after migration.
- `src/lib/services/__tests__/engine.test.ts` — assert the lead-capture row is written when `capture_email` fires.

**Tests to add:** see above.

## Schema / migration changes

```sql
-- supabase/migrations/<TS>_lead_capture_events.sql
create type lead_capture_source as enum ('dm', 'landing_page', 'manual');

create table public.lead_capture_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source lead_capture_source not null,
  contact_id uuid references public.contacts(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  marketing_source_id uuid references public.marketing_sources(id) on delete set null,
  attribution jsonb,            -- canonical LeadSourceContext shape
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped', 'manual_followup')),
  delivery_provider text,       -- 'resend' | 'customerio' | 'close' | 'webhook' | null
  delivery_attempted_at timestamptz,
  delivery_error text,
  created_at timestamptz not null default now()
);

create index idx_lead_capture_events_email on public.lead_capture_events (lower(email));
create index idx_lead_capture_events_status on public.lead_capture_events (delivery_status);
create index idx_lead_capture_events_source on public.lead_capture_events (source, created_at desc);

alter table public.lead_capture_events enable row level security;

create policy "service_role manages lead capture events"
  on public.lead_capture_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
```

After applying:

```bash
supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts
```

## API / contract changes

```typescript
// src/lib/services/lead-capture.ts (NEW)
import 'server-only'
import { z } from 'zod'
import type { LeadSourceContext } from '@/lib/services/marketing-attribution'

export const LeadCaptureSourceSchema = z.enum(['dm', 'landing_page', 'manual'])
export type LeadCaptureSource = z.infer<typeof LeadCaptureSourceSchema>

export const RecordLeadCaptureSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  source: LeadCaptureSourceSchema,
  contactId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  marketingSourceId: z.string().uuid().optional(),
  attribution: z.unknown().optional(), // serialised LeadSourceContext
})

export type RecordLeadCaptureInput = z.infer<typeof RecordLeadCaptureSchema>

export async function recordLeadCaptureEvent(
  input: RecordLeadCaptureInput
): Promise<
  { success: true; eventId: string } | { success: false; error: string }
>
```

```typescript
// src/lib/services/lead-magnet-delivery.ts (NEW)
import 'server-only'

export interface LeadMagnetDeliveryRequest {
  eventId: string
  email: string
  recipientFirstName?: string | null
  attachmentUrl?: string | null
  attachmentFileName?: string | null
  subject: string
  body: string
}

export interface LeadMagnetDelivery {
  send(
    req: LeadMagnetDeliveryRequest
  ): Promise<
    | { success: true; providerId: string }
    | { success: false; error: string; retryable: boolean }
  >
}

/**
 * v0 implementation. Logs the request shape and returns success without
 * sending. P2 swaps this for a real provider behind the same interface.
 */
export class NoopMagnetDelivery implements LeadMagnetDelivery {
  async send(
    req: LeadMagnetDeliveryRequest
  ): Promise<{ success: true; providerId: string }> {
    console.info('[noop-magnet-delivery] would send', {
      eventId: req.eventId,
      to: req.email,
    })
    return { success: true, providerId: `noop_${req.eventId}` }
  }
}
```

## Per-path detail (build-time, beyond scaffolding)

### Path A — DM only

**Additional schema:** none beyond `lead_capture_events`.

**Additional services:**

- `src/lib/services/lead-magnet-delivery-resend.ts` (or `-customerio.ts`) — concrete `LeadMagnetDelivery` implementation. Implements P2.
- `src/lib/services/lead-magnet-job.ts` — orchestrates: read pending `lead_capture_events`, render template from `EmailTemplate` (already exists), call provider, write back `delivery_status`. Triggered after `capture_email` (synchronous in v0; queue in v1).

**Additional UI:**

- A small "Delivery status" pill on conversation detail view (`src/app/dashboard/conversations/[id]/page.tsx`) showing `pending | sent | failed`. Wireable via the existing `integration_events` join already in place.

**Env vars (path A, when P2 picks it up):**

- `RESEND_API_KEY` (or `CUSTOMERIO_SITE_ID` + `CUSTOMERIO_API_KEY`)
- `MAGNET_FROM_ADDRESS` (e.g. `team@vendingpreneurs.com`)
- `MAGNET_REPLY_TO_ADDRESS` (e.g. `sales@vendingpreneurs.com`)
- `LIVE_MAGNET_DELIVERY_ENABLED` (default `false` — flips on per provider readiness)

**Integration boundary (Resend, if chosen):** `POST https://api.resend.com/emails` with Bearer auth (`re_...` API key). Payload includes `from`, `to`, `subject`, `html`, optional `attachments[]`. Attachments accept `path` (URL) or `content` (base64). Max 40MB per email post-encoding. See [Resend send-email reference](https://resend.com/docs/api-reference/emails/send-email).

**Integration boundary (Customer.io, if chosen):** Track API base URLs `https://track.customer.io/api/v1` (US) / `https://track-eu.customer.io/api/v1` (EU). HTTP Basic auth: Site ID as username, API key as password. Two endpoints required: `PUT /customers/{id}` to identify the person by email, then `POST /customers/{id}/events` to fire a custom event the operator wires to a Customer.io campaign that delivers the magnet asset. See [Customer.io Track API reference](https://docs.customer.io/integrations/api/track/).

**Anthony's required input:** asset URL or PDF, subject line, email body (or campaign template if Customer.io owns rendering).

**Sofia's edit surface:** existing Email block panel (`block-panels/email.tsx`). Already supports subject, body, attachment metadata.

### Path B — Landing-page only

**Additional schema:**

```sql
create table public.lead_magnets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  asset_url text,
  asset_filename text,
  email_subject text not null,
  email_body text not null,
  page_headline text not null,
  page_subhead text,
  cta_label text not null default 'Send it',
  source_id uuid references public.marketing_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Additional services:**

- `src/lib/services/lead-magnets.ts` — CRUD on `lead_magnets`.
- `src/lib/services/lead-magnet-delivery-*.ts` — same as path A.

**Additional routes:**

- `src/app/m/[slug]/page.tsx` — server-rendered landing page. Reads `lead_magnets` by slug. Renders headline + subhead + a single email + name form. **No nav, no dashboard chrome.** Mobile-first.
- `src/app/m/[slug]/actions.ts` — Server Action `submitLeadCaptureAction(slug, formData)`. Steps:
  1. Validate input with Zod (`email`, optional `firstName`, `cf_token` for Turnstile).
  2. Verify Turnstile token against Cloudflare API.
  3. Look up magnet by slug (404 if missing or `status='archived'`).
  4. Call `recordLeadCaptureEvent({ source: 'landing_page', email, marketingSourceId, attribution })`.
  5. Trigger delivery (synchronous via the same provider as path A).
  6. Return `{ success: true }`. Page renders a success state.

**Additional UI:**

- `/dashboard/lead-magnets` — admin panel listing magnets, create / archive flow. Reuses `marketing-sources/page.tsx` patterns (commit `7af70f9`).

**Env vars (path B):**

- All of path A.
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile, free tier — recommended over hCaptcha for ease of setup; Cloudflare account required).
- `LANDING_PAGE_RATE_LIMIT_PER_IP_PER_HOUR` (default `5`).

**Integration boundaries:**

- Cloudflare Turnstile: server-side verify endpoint `https://challenges.cloudflare.com/turnstile/v0/siteverify`. POST `secret` + `response` (token from client). User must register the domain `insta-setter.vercel.app` (or future custom domain) in the Cloudflare dashboard.
- Email provider: same as path A.
- Vercel Blob (if chosen for asset hosting): `vercel blob put` writes a public URL the email body links to. User must enable Vercel Blob on the AIMS team scope.

**Anthony's required input:** asset, subject, body, slug ("anthony-vending-checklist"?), headline, subhead, CTA label.

**Sofia's edit surface:** new `/dashboard/lead-magnets` page.

**Public surface considerations:**

- The landing page must respect the surface label catalog (P1.01) — but it lives outside `/dashboard/*` so the badge does not apply. Add a small dev-mode-only watermark (`if (env !== 'production') ...`) so testers know it's not the live magnet during preview.
- Add `app/m/[slug]/loading.tsx` and `app/m/[slug]/not-found.tsx`.
- Set CSP headers on the landing page route to lock down third-party scripts to Cloudflare Turnstile only.

### Path C — Both

Path C = path A + path B with one cross-cutting concern: **dedup on email**. If the same prospect submits via the landing page and then DMs in (or vice versa), we want one row per `(email, lead_magnet_id)`, not two emails sent.

Add an additional unique index:

```sql
create unique index uq_lead_capture_one_send_per_email_magnet
  on public.lead_capture_events (lower(email), source)
  where delivery_status in ('pending', 'sent');
```

The DM path's delivery trigger checks for an existing successful send within the last 48 hours; if found, it suppresses delivery and writes `delivery_status='skipped'` with `delivery_error='deduplicated'`. The bot still confirms email receipt, but does not promise the asset twice.

**Recommendation against C in v0:** ship A, then add B. Path C's dedup logic is correct but easier to design once both single paths are running and we know the actual collision rate.

## Third-party prerequisites — what the user must do

This is the section P2's implementing agent reads first. Resolve before P2 starts.

### Common to all paths

- [ ] **Decision on path** (A / B / C). Default: A.
- [ ] **Asset URL** for the magnet. Hosted somewhere durable. Suggested: Vercel Blob (public), Supabase Storage (public bucket), or Customer.io-hosted asset.
- [ ] **Email provider chosen.** Options:
  - **Resend** — easiest setup. Domain DKIM/SPF wizard in their dashboard. API key as `re_...` Bearer. Pay-per-email; free tier covers low volume. Best for v0.
  - **Customer.io** — most powerful for downstream automation (drip sequences, segments). Slightly more setup; requires Site ID + API Key + a campaign authored in their UI that the API event triggers. Best if Sofia plans nurture sequences after.
  - **Close** — the sales team's CRM. Capable but not designed for marketing email; recommend against for v0.
- [ ] **Sender domain.** `vendingpreneurs.com` mailbox configured for sending: `team@vendingpreneurs.com` (recommended) or `hello@vendingpreneurs.com`. DKIM, SPF, DMARC records added to DNS. Reply-to address set (NOT a no-reply mailbox).
- [ ] **Env vars on Vercel** (AIMS team scope). Use `printf '%s' 'value' | vercel env add` per `~/.claude/CLAUDE.md`'s vercel-env rule (echo appends `\n`).
- [ ] **Sandbox vs live credentials.** Resend: separate test API key with `re_test_` prefix. Customer.io: separate workspace recommended. Path B / C: separate Turnstile site for staging.

### Path B / C only

- [ ] **Cloudflare account** (free tier OK). Register `insta-setter.vercel.app` (or future custom domain) for Turnstile.
- [ ] **Vercel Blob enabled** on the AIMS scope (if hosting assets there).
- [ ] **Public URL strategy.** `/m/[slug]` lives at `https://insta-setter.vercel.app/m/anthony-vending-checklist`. If a custom domain is wanted (`magnet.vendingpreneurs.com`), the user owns the DNS setup.

## Implementation plan (TDD) — scaffolding PR

This PR ships only the scaffolding common to A/B/C. Path-specific implementation lands in P2.

1. **RED — schema test.** Write `lead-capture.test.ts`. Assert `recordLeadCaptureEvent` validates input + writes a row. Use the existing `helpers.ts` Supabase test harness.
2. **GREEN — migration + service.** Write the migration. Apply locally. Regenerate types. Implement `lead-capture.ts`.
3. **RED — engine wiring test.** Extend `engine.test.ts` `routeLeadEvents` `case 'capture_email'` to assert a `lead_capture_events` row is inserted with `source='dm'`, the right email, contactId, conversationId, and serialised attribution.
4. **GREEN — engine.** Add the call to `recordLeadCaptureEvent` after the existing `contacts.email` update.
5. **RED — delivery interface test.** `lead-magnet-delivery.test.ts`. Assert `NoopMagnetDelivery.send` returns success and logs.
6. **GREEN — interface.** Implement.
7. **DOCS.** Update `docs/sofia-feedback-priorities.md` "Priority 1 — Anthony lead magnet path" row marker → "Decision pending; scaffolding shipped".
8. **VERIFY.** `npm run lint && npm run type-check && npm run build`.

## Test plan

- **Unit (Vitest):**
  - `lead-capture.test.ts` — schema, write, error path.
  - `lead-magnet-delivery.test.ts` — Noop returns success + payload shape.
- **Integration (Vitest + Supabase):**
  - `engine.test.ts` — `capture_email` writes the lead-capture row.
  - `route.test.ts` — webhook smoke covering the same.
- **E2E:** none for the scaffolding PR. Path B / C pull in Playwright coverage later.
- **Live verification:** none (no real email sent).

## Rollout

- **Feature flag:** none for the scaffolding (all writes are additive). The future delivery flag is `LIVE_MAGNET_DELIVERY_ENABLED`, default `false`. P2 owns flipping it.
- **Migration order:** schema first, then app code. Single PR.
- **Production safety:** the new table is additive. `recordLeadCaptureEvent` writes a row but causes no side effect (Noop delivery). If it fails, `routeLeadEvents` swallows the error in the existing try/catch — the bot's reply still ships.
- **Rollback:**
  - Code: revert PR. `lead_capture_events` table can be left in place (orphaned rows are harmless).
  - If the table itself is problematic: `drop table public.lead_capture_events cascade` — additive-only schema rule allows DROP of brand-new objects within the rollback window.

## Dependencies

- Pairs with P1.01 (limitations labels): the future `/dashboard/lead-magnets` admin page (path B / C) needs a catalog entry. Add when path B lands.
- Pairs with the Apr 24 source-tracking work (commits `7af70f9`, `2c06e41`). The `marketing_sources` + `conversation_attributions` tables are already in place; landing-page submissions write to the same `marketing_sources` registry so attribution is unified.
- The `EmailTemplate` shape from `post-email-behavior.ts` (commit `80d5d98`) is the canonical email-rendering schema. `LeadMagnetDeliveryRequest` reuses its fields.

## Risks + mitigations

- **Risk: Sofia / Anthony can't decide in time.** **Mitigation:** the scaffolding PR ships regardless. P2 starts on day 1 with whichever path Sofia picks; the table + interface are already in place.
- **Risk: `lead_capture_events` writes block the bot's reply.** **Mitigation:** the call is wrapped in the existing `routeLeadEvents` try/catch (line 361 in `engine.ts`). Failure logs to `integration_events` with `status='failed'` but never throws into the prod reply path.
- **Risk: Schema drift between `lead_capture_events` and `integration_events`.** **Mitigation:** they serve different purposes. `integration_events` is the per-tool-call audit log. `lead_capture_events` is the unified channel-agnostic capture record. Document the distinction in the migration's comment block.
- **Risk: PII handling.** **Mitigation:** `email` is normalised to lowercase server-side. Index uses `lower(email)` to dedupe consistently. No PII other than email is stored on this table; `attribution` is JSONB but we control what's serialised.
- **Risk: Path B / C's public form is abused.** **Mitigation:** scaffolding doesn't ship the form. P2 owns Turnstile + per-IP rate limit (recommend 5 submissions per IP per hour, server-side via Vercel KV or in-memory if low volume). Document in path B section above.
- **Risk: Decision drifts toward path C "for completeness" and burns 2 weeks.** **Mitigation:** the recommendation explicitly says A first. Sofia can override but needs a reason.

## Out of scope / explicit deferrals

- All actual email sending (P2).
- Any provider implementation beyond `NoopMagnetDelivery` (P2).
- The landing-page form, captcha, and admin UI (P2 path B/C).
- Magnet-record CRUD UI (P2 path B/C).
- Funnel analytics for landing pages (P5 attribution).
- Drip / nurture sequences after capture (FUTURE).
- A/B testing magnet copy or assets (FUTURE).
- TikTok / non-Instagram channel intake (FUTURE).

## PR strategy

Single PR for the scaffolding: `feat/p1-05-lead-capture-events`.

Subsequent path-specific PRs live in `plans/dm-setter-roadmap/p2-live-email-delivery/` and reference this spec as the architecture source-of-truth.

Conventional commit: `feat(lead-capture): add channel-agnostic capture event scaffolding`.

## Observability

- **Logs:** `recordLeadCaptureEvent` logs structured fields `{ event: 'lead_capture.recorded', source, has_email: boolean, has_contact: boolean }`. Never log the email itself.
- **Sentry:** add a breadcrumb in `recordLeadCaptureEvent` when the insert fails. Don't raise — `routeLeadEvents` already catches.
- **Metrics:** none in the scaffolding PR. P2 adds delivery-status counts.
- **Operator-visible status:** for now, none. P2 adds a "Delivery status" pill on the conversation detail page and a metric on the dashboard.

## Notes for the implementing agent

- This spec is **decision-shaped + scaffolding-shaped**. Do NOT extend it into delivery wiring. P2 owns that. If you find yourself implementing a Resend client or a public form, stop and ask.
- The sole code deliverables are the migration, the two new services, and the engine wire-up. Do not add UI in this PR.
- `routeLeadEvents` `case 'capture_email'` already updates `contacts.email`. Add the lead-capture call **after** the contact update so the `contactId` lookup works.
- Reference commits:
  - `80d5d98` (post-email-behavior — `EmailTemplate` shape we reuse).
  - `7af70f9` (instagram source tracking — `LeadSourceContext`, `marketing_sources`, `conversation_attributions`).
  - `2c06e41` (sources UX — operator-facing patterns).
  - `affaa6c` (inbox-first UX).
  - `228b3f4` (runtime controls — kill-switch pattern).
- Sofia and Anthony want this moving in ~1 week. The scaffolding PR is a 1–2 day landing; the rest is Path A in P2.
- Don't conflate `integration_events` with `lead_capture_events`. The former is per-Claude-tool-call audit; the latter is the unified channel-agnostic capture record.
- Do not commit any third-party API keys. The scaffolding PR has zero env vars; only P2 introduces them.
- Apply the integration-boundary rule from `conventions.md` rigorously. The "User must answer" checklist is the single asks-of-the-user surface; everything else is the agent's responsibility.
- For the `attribution` JSONB column, serialise the existing `LeadSourceContext` shape (channel / campaign / material / entryAction / triggerLabel / sourceKey / postUrl / adId). Don't invent a new shape.
- Light theme only on any UI work that lands later. Linear / Vercel / Stripe aesthetic.
- Cross-link this spec from `docs/sofia-feedback-priorities.md` post-merge to make the decision discoverable.

## Sources for third-party citations

- [Resend send-email API reference](https://resend.com/docs/api-reference/emails/send-email)
- [Customer.io Track API](https://docs.customer.io/integrations/api/track/)
- [Cloudflare Turnstile docs](https://developers.cloudflare.com/turnstile/)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
