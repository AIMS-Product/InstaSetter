# P1.03 Skeptical Playbook — QA Review

Manual / browser verification checklist for reviewers.

## Tool registration

- [ ] `request_human_review` shows up in `TOOLS` array in `src/lib/services/claude.ts`
- [ ] `KNOWN_TOOLS` set in `src/lib/services/engine.ts` includes the new tool
- [ ] `routeLeadEvents` includes a `case 'request_human_review'` branch

## Prompt section

- [ ] Open `scripts/test-prompt.ts` output (live Sonnet 4.6) and confirm assembled prompt contains `## Skeptical / Adversarial Playbook`
- [ ] Confirm three modes: answer-in-depth, keep-qualifying, escalate
- [ ] Confirm contract test (`compile-block.contract.test.ts`) green

## Migration

- [ ] `supabase db reset` applies cleanly with no errors
- [ ] `conversation_human_review_pauses` table exists with RLS enabled
- [ ] Active-pause partial index `idx_human_review_pauses_active` exists
- [ ] `supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts` produces a clean diff (table additions only)

## Engine behaviour

- [ ] Inbound triggering `request_human_review` writes a row in `conversation_human_review_pauses`
- [ ] Conversation row updated to `status = 'flagged'`
- [ ] Subsequent inbound on the same conversation short-circuits with `skipped: 'human_review_paused'`
- [ ] Inbound message is still stored even when paused (so the human has full context)

## Dashboard

- [ ] Conversation detail page shows the pause banner with reason + severity
- [ ] Banner uses light theme (Linear/Stripe aesthetic), not alarmist
- [ ] `role="status"` + `aria-live="polite"` set on the banner
- [ ] Resume button submits a Server Action, conversation status returns to `active`
- [ ] Inbox row shows a `Needs human` chip when a pause is active
- [ ] Filter for `flagged` status surfaces paused conversations

## Rollout safety

- [ ] Webhook still returns 200 even when pause write fails (fire-and-forget)
- [ ] Per-flow global pause continues to wrap per-conversation pauses
- [ ] No regression on existing prompt sections / tools
