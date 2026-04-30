# P1.05 — Manual QA review

Branch: `feat/p1-05-anthony-magnet`
Spec: `plans/dm-setter-roadmap/p1-trust-conversation/05-anthony-magnet.md`

This PR is **scaffolding only** — no UI changes, no live email send. The
manual checklist below verifies that the new plumbing is wired correctly
and the existing live traffic path is unchanged.

## Pre-merge sanity (no browser needed)

- [ ] `supabase db reset` runs cleanly against
      `supabase/migrations/20260501010000_lead_capture_events.sql`. The
      `lead_capture_events` table appears with three indexes and a
      service-role-only RLS policy.
- [ ] `npm run type-check && npm run lint && npm run build` — all green
      against the latest commit on this branch.
- [ ] `npx vitest run` — 420 tests pass.
- [ ] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
      — 33/33 green (the sacred guard).

## Schema spot-check

- [ ] After `supabase db reset`:
      `\d public.lead_capture_events`
      shows columns `id`, `email`, `source`, `contact_id`,
      `conversation_id`, `marketing_source_id`, `attribution`,
      `delivery_status`, `delivery_provider`, `delivery_attempted_at`,
      `delivery_error`, `created_at`.
- [ ] `\d public.lead_capture_events` shows three indexes:
      `idx_lead_capture_events_email` (lower(email)),
      `idx_lead_capture_events_status` (delivery_status),
      `idx_lead_capture_events_source` (source, created_at desc).
- [ ] RLS is `enabled` and the only policy is
      `service_role manages lead capture events`.
- [ ] `lead_capture_source` enum has exactly three values:
      `dm`, `landing_page`, `manual`.

## Live-traffic regression check (CRITICAL)

The bot must reply identically to today. The new code only adds an
extra row write after the existing `contacts.email` update.

- [ ] Send a test inbound DM that triggers `capture_email`. The bot
      reply text is unchanged. The `contacts.email` field updates as
      before.
- [ ] After the same test, `select * from public.lead_capture_events`
      shows one row with `source='dm'`, `delivery_status='pending'`,
      `delivery_provider IS NULL`, `delivery_attempted_at IS NULL`.
- [ ] Force a failure by giving the engine a malformed inbound (no
      email but `capture_email` fires) — the bot reply still ships, the
      `contacts.email` update is skipped (no email value), AND no
      `lead_capture_events` row is written. The route never throws.

## Surface-area sanity

- [ ] No new dashboard UI surfaces in this PR (decision-spec invariant).
- [ ] No new env vars added to `src/lib/config.ts`. The future
      `LIVE_MAGNET_DELIVERY_ENABLED` flag is owned by P2.04.
- [ ] No third-party API keys committed. `NoopMagnetDelivery` does not
      require any.

## Persona / surface invariants

- [ ] The bot persona has not changed (no name leaks, US/Canada gating
      intact). Compile-block contract test green proves this.
- [ ] No "Week N" labels surfaced anywhere in display copy.
- [ ] `LeadMagnetDelivery.send` never throws; it returns `success:true`
      with `delivered:false, reason:'noop'` for the v0 implementation.

## Pending blockers (P2 cannot ship without these)

- [ ] **Path** — A, B, or C? Default recommendation: A.
- [ ] **Asset** — does the magnet exist? ETA?
- [ ] **Asset hosting** — Vercel Blob / Supabase Storage / external?
- [ ] **Delivery provider** — Resend / Customer.io / Close / SendGrid?
- [ ] **Sender identity** — `team@vendingpreneurs.com` confirmation +
      DKIM/SPF/DMARC status?
- [ ] **Reply handling** — which inbox receives replies?
- [ ] **Live-or-draft** — first send via existing draft-only Flow
      Builder, or wait for the published-snapshot path?
