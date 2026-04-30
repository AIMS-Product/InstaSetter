# P1.02 — Softer pre-booking rapport step (QA review)

Manual / live verification checklist. Run this before merging the PR.

## Automated guards (must pass before manual QA)

- [ ] `npx vitest run` — full suite green (last run: 419/419 ✓).
- [ ] `npm run type-check` — clean.
- [ ] `npm run lint` — 0 errors.
- [ ] `compile-block.contract.test.ts` — green (34/34 ✓).

## Live prompt verification (Sonnet 4.6)

Run with `ANTHROPIC_API_KEY` set in `.env.local`:

```bash
npx tsx scripts/test-prompt.ts pre-booking-rapport-asked
npx tsx scripts/test-prompt.ts pre-booking-rapport-skipped
npx tsx scripts/test-prompt.ts pre-booking-rapport-ignored
```

Each scenario should print `(N/N checks passed)` for all checks. If any check fails, inspect the response and tune either the rapport question copy in `pre-booking-step.ts` or the regex in the scenario check.

### Rapport-asked path

- [ ] Bot does NOT send the booking link in the rapport turn.
- [ ] Bot asks ONE rapport-style question (interest / motivation).
- [ ] Single message, under 600 chars.

### Rapport-skipped path (Sofia's "Dallas, got 7K" case)

- [ ] Bot sends booking link immediately.
- [ ] Mirrors back at least one qualifier (Dallas / 7K / steady).
- [ ] Does NOT ask a fresh rapport question before the link.

### Rapport-ignored path

- [ ] Bot sends booking link in the message after the unanswered rapport question.
- [ ] Does NOT re-ask the rapport question (no looping).
- [ ] Mirrors known qualifiers.

## Existing scenarios — regression check

Run the full prompt-test suite to confirm no other scenarios regressed:

```bash
npx tsx scripts/test-prompt.ts
```

- [ ] All pre-existing scenarios still pass (cold-open, qualification-flow, objection-no-capital, objection-needs-to-think, email-capture-post-booking, trust-concern, third-party-fraud, message-format, name-glaze-past, off-topic-pitch).

## Production safety

- [ ] Confirm `LIVE_PRE_BOOKING_STEP_ENABLED` is added to Vercel env vars (production / preview / development), default `true`.
- [ ] Confirm rollback path works locally: set `LIVE_PRE_BOOKING_STEP_ENABLED=false` in `.env.local`, run a unit test that compiles the prompt, verify the rapport bridge section disappears and the "VERY NEXT message" wording returns.
- [ ] Per-flow runtime pause (`flow_runtime_controls`) remains the nuclear option from the dashboard — verified unchanged.

## Sign-off

- [ ] Snapshot diff for `compile-block.contract.test.ts` reviewed by James — confirmed only the rapport-bridge section + GATE 1 wording tweak appear.
- [ ] Asana subtask updated to `Tests-passing` once CI green, then `Merged` after PR squash.
