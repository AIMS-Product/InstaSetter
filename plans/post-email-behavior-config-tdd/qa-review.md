# QA Review: Configurable Post-Email Behavior

---

## Issue 1: Define post-email behavior config type

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

Post-email behavior now has a typed schema and safe default config. The schema accepts only supported delivery modes and next steps, requires confirmation copy, and rejects immediate-send promises when no delivery is configured.

### Steps to test

1. Run `npx vitest run src/lib/prompts/__tests__/post-email-behavior.test.ts`.
2. Confirm all schema tests pass.

### Expected result

The default config validates, while empty copy, unknown options, and no-delivery immediate-send promises are rejected.

### Edge cases

- `resourceLabel` can be `null` when no resource is live.
- `deliveryMode: none` cannot include "right now" or "within a few minutes" style promises.

### Preserved behaviors

- Safety-critical email capture mechanics are not exposed through this config.

---

## Issue 2: Make email-capture prompt accept configurable post-email behavior

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

The email-capture section now renders configurable confirmation copy and delivery context while preserving the mandatory `capture_email` and timing rules.

### Steps to test

1. Run `npx vitest run src/lib/prompts/__tests__/email-capture.test.ts src/lib/prompts/__tests__/setter-v2.test.ts`.
2. Confirm custom confirmation copy appears in the prompt.

### Expected result

Custom post-email copy is rendered, and the prompt still requires `capture_email` plus the first-or-second-message guard.

### Edge cases

- `deliveryMode: none` tells the model not to promise automatic sending.
- `deliveryMode: customerio` can include a configured resource label.

### Preserved behaviors

- Email capture remains mandatory around booking.
- Existing setter-v2 prompt structure still includes the Email Capture section.

---

## Issue 3: Add post-email behavior to Flow Builder block config

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

Email Capture blocks now include the default post-email behavior as structured `blockConfig`, alongside the existing trigger and confirmation display fields.

### Steps to test

1. Run `npx vitest run 'src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/block-sections.test.ts'`.
2. Inspect the derived Email Capture block in the test output or debugger.

### Expected result

`deriveBlock(..., 'email')` returns an Email block whose `postEmailBehavior` matches the safe default and uses `deliveryMode: none`.

### Edge cases

- Existing trigger parsing still returns primary, backup, and secondary triggers.
- The legacy `confirmationScript` remains populated for backwards display compatibility.

### Preserved behaviors

- Existing Flow Builder block derivation still returns guardrails, examples, and parsed trigger data.

---

## Issue 4: Persist post-email behavior in Flow Builder drafts

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

Draft extraction preserves custom Email Capture post-email behavior, and draft normalization backfills the safe default for older saved drafts and version snapshots.

### Steps to test

1. Run `npx vitest run 'src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts' 'src/app/dashboard/flows/[flowId]/__tests__/store.test.ts'`.
2. Confirm draft helper and hydration tests pass.

### Expected result

Custom post-email behavior survives persistence, while legacy email blocks missing the field hydrate with the safe default.

### Edge cases

- Existing suspect draft cleanup still runs.
- Bot-level global guardrails are still stripped from current flows and version snapshots.

### Preserved behaviors

- Draft schema storage shape remains based on the existing `ins_flow_drafts.state` snapshot.

---

## Issue 5: Add editable Email Capture UI for after-email behavior

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

The Email Capture panel now has editable after-email confirmation copy plus delivery mode, resource label, and next-step controls. Unsafe no-delivery immediate-send promises are surfaced as validation errors.

### Steps to test

1. Open the Flow Builder Email Capture block.
2. Edit the `After email is captured` text area.
3. Confirm the draft moves through the existing dirty/sync path.

### Expected result

The edited copy is stored in the block config, and no-delivery copy that promises immediate sending shows an error instead of being accepted.

### Edge cases

- `deliveryMode: none` displays that no automatic delivery is live.
- Existing capture triggers remain read-only and visible.

### Preserved behaviors

- The `capture_email` safety note remains visible in the hesitation response.

---

## Issue 6: Wire post-email behavior into simulator compile overrides

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

Edited Email Capture post-email behavior now flows into simulator overrides and is rendered in the Active Block Directive. Default post-email behavior is omitted to keep unchanged simulator overrides minimal.

### Steps to test

1. Run `npx vitest run 'src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-overrides.test.ts' src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`.
2. Select an Email Capture block with edited post-email copy in the Flow Builder simulator.

### Expected result

The simulator compile override includes the edited confirmation copy, and no-overrides compilation still matches `buildSystemPrompt()`.

### Edge cases

- Default Email Capture post-email behavior is not emitted as an override.
- Empty capture, route, and trigger override fallbacks still render as before.

### Preserved behaviors

- The no-overrides compile contract remains byte-identical to the baseline system prompt.

---

## Issue 7: Keep live engine hardcoded until published config is available

**Commit**: `not committed` | **Type**: safety | **Status**: Fixed

### Summary

The live inbound engine still builds prompts from code-owned `buildSystemPrompt()` inputs only. A regression test verifies it does not query `ins_flow_drafts` or pass draft post-email behavior into live prompt construction.

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/engine.test.ts`.
2. Confirm the live inbound prompt-building regression test passes.

### Expected result

Live Instagram traffic remains unaffected by draft Flow Builder post-email config until a published snapshot path is explicitly implemented.

### Edge cases

- Contact context, prior summaries, and lead source context still flow into `buildSystemPrompt()`.
- Draft config is not loaded through the Supabase `ins_flow_drafts` table.

### Preserved behaviors

- Existing process-message pipeline behavior remains unchanged.

---

## Issue 8: Document live-publish follow-up path

**Commit**: `not committed` | **Type**: docs | **Status**: Fixed

### Summary

The plan now documents the draft-versus-simulator-versus-live split and calls out the future published snapshot and rollback requirements.

### Steps to test

1. Read `plans/post-email-behavior-config-tdd/plan.md`.
2. Find the `Live Publish Follow-Up` section.

### Expected result

The docs make clear that draft config is saved and simulator-visible, but live traffic requires a reviewed published snapshot path before using edited post-email behavior.

### Edge cases

- The note preserves the current out-of-scope boundary for Customer.io, Close, and actual email sending.
- Rollback is explicitly required for future live post-email behavior.

### Preserved behaviors

- This issue changes documentation only.

---

## Issue 9: Fix preview draft save pending loop

**Commit**: `not committed` | **Type**: regression | **Status**: Fixed

### Summary

The in-app preview exposed a draft sync render loop where setting `pending` from the save effect retriggered the same effect and kept the badge stuck on a pending state. The save effect now keys off the serialized draft payload and reads the current draft from a ref, so sync status updates do not schedule another save.

### Steps to test

1. Open `http://localhost:3000/dashboard/flows/ig-organic-dm`.
2. Select the Email Capture block.
3. Open Runtime Details.
4. Reload the page after the draft sync settles.

### Expected result

The Email Capture inspector opens, Runtime Details shows the after-email controls, and the badge resolves to `Draft: Unpublished edits · Saved` without new maximum-update-depth console errors.

### Edge cases

- Selecting a block should open the inspector from the canvas, not only focus the node.
- Draft status changes should not dirty the draft or create another save cycle.

### Preserved behaviors

- Draft save debounce and remote save action remain unchanged.
- Existing dirty-versus-published labeling still appears as `Unpublished edits` until the flow is published.

---

## Issue 10: Add configurable sent email template and attachment metadata

**Commit**: `not committed` | **Type**: feature | **Status**: Fixed

### Summary

The Email Capture Runtime Details panel now includes an `Email to send` section for operator-owned email subject, body, and optional attachment metadata. The configuration is schema-validated, persisted in Flow Builder drafts, and included in simulator prompt overrides while live delivery remains behind the existing publish/integration boundary.

### Steps to test

1. Open `http://localhost:3000/dashboard/flows/ig-organic-dm`.
2. Select the Email Capture block.
3. Open Runtime Details.
4. Edit `Email subject`, `Email body`, `Attachment file name`, and `Attachment URL`.

### Expected result

The edited email template is accepted when subject/body are non-empty and attachment metadata has a valid file name plus URL. The draft save badge should settle back to `Saved`.

### Edge cases

- Legacy drafts missing the email template are backfilled with the default subject/body and no attachment.
- Attachment metadata is optional, but incomplete attachment metadata is rejected.
- Default email template copy is brand-neutral so custom-brand prompts do not leak `VendingPreneurs`.

### Preserved behaviors

- The bot still must call `capture_email` immediately after receiving the address.
- Live Instagram traffic still does not use draft email-template config until a published delivery integration is explicitly wired.
