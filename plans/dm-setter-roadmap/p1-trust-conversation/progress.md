# P1.05 Anthony lead magnet path — progress log

Branch: `feat/p1-05-anthony-magnet`
Spec: `plans/dm-setter-roadmap/p1-trust-conversation/05-anthony-magnet.md`
PR target: `feat/sofia-roadmap`

This is a **decision + scaffolding** PR. The actual delivery wiring (provider
hookup, real send, dashboard pill) is owned by P2.04. The scaffolding lands
here so P2 starts day-one against a stable interface and table.

## Step-by-step

### 1. Setup

- [x] Read spec, conventions, execution-protocol, AGENTS.md, CLAUDE.md
- [x] Created branch `feat/p1-05-anthony-magnet` from `origin/feat/sofia-roadmap`
- [x] Mapped repo: `engine.ts` `routeLeadEvents` `case 'capture_email'`,
      `marketing-attribution.ts` `LeadSourceContext`, existing migrations,
      `lead-event.ts` (distinct from `lead_capture_events`),
      `createTableAwareMockClient` test harness
- [x] Reserved migration timestamp `20260501010000` (Phase 1 block, second
      slot — P1.03 holds `20260501000000` if it ships first)

### 2. RED — schema test

- [x] `src/lib/services/__tests__/lead-capture.test.ts`
  - Schema cases: lowercase + trim normalisation, malformed email reject,
    unknown source reject, all three source enums accepted, non-uuid
    contactId reject, optional attribution accepted as unknown
  - Behaviour cases: writes a row with the validated payload (with valid
    UUIDs + serialised attribution), validation failure short-circuits
    before insert, supabase error returns failure (never throws),
    missing optional ids serialise to null

### 3. GREEN — migration + service

- [x] `supabase/migrations/20260501010000_lead_capture_events.sql`
      (additive; `if not exists` guards on type, table, indexes, policy;
      RLS enabled; service-role-only policy)
- [x] `src/types/database.ts` — manually patched (table types + enum)
      pending the next `supabase gen types typescript` run after the migration
      applies
- [x] `src/lib/services/lead-capture.ts` — `recordLeadCaptureEvent`
      (Zod-validated, normalises email, structured logs, never throws)

### 4. RED — engine wiring test

- [x] `src/lib/services/__tests__/engine-route.test.ts` — two new cases:
  1. `writes a lead_capture_events row tagged source=dm when capture_email
fires with valid uuids` — asserts insert payload contains `source:'dm'`,
     normalised email, threaded `attribution` from `leadSourceContext`
  2. `still updates contact email when leadSourceContext is absent` —
     proves the capture write happens even without attribution context

### 5. GREEN — engine wire-up

- [x] `src/lib/services/engine.ts`
  - Added optional `RouteLeadEventsOptions` carrying `leadSourceContext`
  - `case 'capture_email'` now calls `recordLeadCaptureEvent` after the
    existing `contacts.email` update so `contactId` is already in place
  - `processMessage` Step 10 threads its in-scope `leadSourceContext`
    through to `routeLeadEvents`
  - Failure remains non-blocking: the existing per-call try/catch + the
    `.catch(() => {})` at the call site still swallow any throw

### 6. RED — delivery interface test

- [x] `src/lib/services/__tests__/lead-magnet-delivery.test.ts` — covers:
  - Returns success without sending; never throws
  - `providerId` derives from `eventId` for traceability
  - Result includes `delivered:false` + `reason:'noop'` so dashboards can
    distinguish recorded-vs-shipped
  - Logs structured info but does NOT log the recipient email
  - Conforms to the `LeadMagnetDelivery` interface

### 7. GREEN — interface + Noop impl

- [x] `src/lib/services/lead-magnet-delivery.ts` — `LeadMagnetDelivery`
      interface + `NoopMagnetDelivery` class. `send()` returns
      `{ success: true, providerId, delivered: false, reason: 'noop' }` per
      the spec's "Process > 3" rule.

### 8. VERIFY

- [x] `npm run type-check` — clean
- [x] `npx vitest run` — 420/420 tests pass (28 new across 3 files)
- [x] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — 33/33 green
- [x] `npm run lint` — 0 errors (pre-existing warnings unchanged)
- [x] `npm run build` — green
- [ ] `supabase db reset` against the new migration — deferred to the
      implementing-agent's pre-push smoke (no local Supabase session in
      this worktree)

## Files changed

**New:**

- `supabase/migrations/20260501010000_lead_capture_events.sql`
- `src/lib/services/lead-capture.ts`
- `src/lib/services/lead-magnet-delivery.ts`
- `src/lib/services/__tests__/lead-capture.test.ts`
- `src/lib/services/__tests__/lead-magnet-delivery.test.ts`
- `plans/dm-setter-roadmap/p1-trust-conversation/progress.md`
- `plans/dm-setter-roadmap/p1-trust-conversation/qa-review.md`

**Modified:**

- `src/lib/services/engine.ts` — wire `recordLeadCaptureEvent` into
  `routeLeadEvents`; thread `leadSourceContext` through from
  `processMessage`
- `src/lib/services/__tests__/engine-route.test.ts` — two new cases
- `src/types/database.ts` — `lead_capture_events` row/insert/update +
  `lead_capture_source` enum (manual patch pending CLI regen)

## Decision

Recommendation: **Path A (DM-only)** — see spec §"Recommendation" for the
full reasoning. Path A reuses the running `capture_email` flow, has zero
new public surface, and reaches first-prospect-visible value in 3-5 days
once a delivery provider is picked. Path B (landing page) is the right
follow-up once the DM-only magnet is validating; Path C (both) is a
4-6-week ask, not a 1-week ask.

The scaffolding in this PR is path-agnostic — `lead_capture_events` is
channel-tagged via `source enum`, and `LeadMagnetDelivery` decouples the
trigger from the transport. P2 can pivot to B or C without touching this
PR.
