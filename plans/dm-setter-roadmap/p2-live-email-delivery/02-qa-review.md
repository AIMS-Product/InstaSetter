# P2.02 — QA review

Manual + browser checks for the published-flow snapshot path. Run before flipping the per-brand flag in production.

## Pre-cutover smoke (flag OFF, default)

- [ ] Open `/dashboard/flows/ig-organic-dm` and verify the new **Publish** + **History** buttons render in the header next to **Preview replies**.
- [ ] Open the History dialog with no rows ever published — empty state reads "No published versions yet."
- [ ] Edit the Email Capture confirmation copy in the inspector. Confirm the existing draft-saved indicator still flashes "saving / saved".
- [ ] Click Publish. Add a note. Confirm.
- [ ] Open History — see v1 with the **Active** chip, the timestamp, the note, and the actor (today: `system:dashboard` because Supabase Auth is not yet wired through the dashboard).
- [ ] Tail Sentry for the publish call — no errors thrown.
- [ ] Reopen the editor in another tab — no client-side regression on store hydration.

## Concurrent publish race (manual)

- [ ] Open two tabs of the editor pointed at the same brand/flow.
- [ ] Trigger publish from both within ~5 seconds of each other.
- [ ] Confirm both publishes succeed and the version_number advances by 2 (no duplicate, no skip).
- [ ] If a Postgres `23505` is logged for the loser, confirm it falls back to a single retry (Server Action returns `{ success: false, error: ... }` on persistent conflict — operator clicks Publish again and v3 lands cleanly).

## Cutover smoke

- [ ] In Supabase SQL Editor, insert: `insert into ins_feature_flags (key, scope, scope_id, enabled, updated_by) values ('email_delivery.use_published_snapshot', 'brand', 'VendingPreneurs', true, 'james@example.com')`.
- [ ] Wait up to 60s for in-process flag caches to expire. (Or restart the Vercel deploy for instant propagation.)
- [ ] Send a test inbound DM via the SendPulse sandbox or Instagram. Verify a NEW conversations row is created with `flow_version_id = <published_version_id>`.
- [ ] Confirm the bot's confirmation copy on email-capture turns matches the published version (not the draft).
- [ ] Edit the confirmation copy in the editor (draft only). Send another inbound. The live conversation MUST still see the published copy, not the in-progress draft.
- [ ] Republish v2. Send a fresh test DM with a NEW contact. Verify the new conversation reads v2 — and the conversation already in flight stays on v1 until it completes.

## Rollback smoke

- [ ] Publish v2 with intentionally broken copy (e.g. confirmation: "DO NOT SHIP — testing rollback").
- [ ] Verify a fresh conversation receives the broken copy.
- [ ] Open History → click **Rollback to v1**. Confirm the dialog closes and the active chip moves to v1.
- [ ] Verify a new fresh conversation receives v1's copy.
- [ ] Verify the in-flight v2 conversation continues on v2 (in-flight pinning is never bypassed).

## Pre-cutover carve-out (this is the safety story)

- [ ] BEFORE flipping the flag: insert/update a `conversations` row with `status='active'`, `flow_version_id = NULL`. (You can scrape one from the production inbox.)
- [ ] Flip the flag ON for the brand.
- [ ] Send a follow-up message on that contact. Verify:
  - The pre-existing conversation reuses (no fresh row created).
  - `findOrCreateActiveConversation` does NOT back-fill `flow_version_id`.
  - The bot's reply uses the **default** code-owned confirmation copy, NOT the published snapshot.
- [ ] This is the most important manual check in the suite. If this fails, ROLLOUT.md safety invariant #7 is violated.

## Rollback (kill switch)

- [ ] Disable the flag: `update ins_feature_flags set enabled = false where key = 'email_delivery.use_published_snapshot' and scope_id = 'VendingPreneurs'`.
- [ ] Within 60s, confirm the next inbound message creates a conversation with `flow_version_id = NULL` (or reuses an existing row unchanged) and the prompt is byte-identical to pre-cutover.
- [ ] Confirm in `ins_feature_flags_audit` that the disable was logged with `action='paused-manual'`.

## Observability

- [ ] Verify the Server Action logs include `event: 'flow.publish'` (or rollback) with brand, flowId, versionId, versionNumber, actor.
- [ ] Verify Sentry captures `flow.publish.failed` if the RPC errors (smoke by temporarily revoking `service_role` execute on `ins_publish_flow` in a staging branch).
- [ ] Confirm `ins_flow_publish_log` rows match the audit chain (v1 publish → v2 publish → rollback row pointing at the new v3 with `action='rollback'`).

## Compile-block contract

- [ ] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — must pass byte-identical.
- [ ] `npx vitest run` — full suite green.
- [ ] `npx tsc --noEmit` — clean.

## Sign-off

- [ ] Sofia / James reviewed the publish UX and confirmed the confirmation dialog warning ("affects new conversations starting from now") is clear enough to publish without anxiety.
- [ ] Operator runbook update queued: "to enable the published-snapshot path for a new brand, insert a row into `ins_feature_flags` with `key='email_delivery.use_published_snapshot'`, `scope='brand'`, `scope_id=<brand-name>`, `enabled=true`."
