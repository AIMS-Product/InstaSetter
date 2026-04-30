# P4.04 — Warnings + version history / rollback — QA review

Manual verification checklist for the implementing operator. Run each
case once after the migration lands, the new tables are present, and
`NEXT_PUBLIC_FLOW_VERSIONS=true` is set in the dev environment.

## Setup

- [ ] `supabase db reset` runs cleanly with the new migration.
- [ ] `select count(*) from public.ins_flow_draft_versions;` returns 0.
- [ ] `select count(*) from public.ins_flow_draft_audit;` returns 0.
- [ ] Visit `/dashboard/flows/ig-organic-dm` with the flag off.
      Workspace behaves exactly as before (no warning chip, no modal).
- [ ] Set `NEXT_PUBLIC_FLOW_VERSIONS=true` in `.env.local`. Reload.

## Case 1 — Low-impact-only edit autosaves silently

- [ ] Edit a low-impact field (e.g. add an example to the Opening
      block). No modal appears.
- [ ] After ~400ms the save status pill shows "Saved".
- [ ] No new row in `ins_flow_draft_versions`.
- [ ] No new row in `ins_flow_draft_audit` (autosave-only tracking is
      filtered when no high-impact fields change — see service code).

## Case 2 — High-impact-only edit holds and prompts

- [ ] Open the Email block panel. Edit the post-email confirmation
      message.
- [ ] Modal opens within ~400ms. Heading: "Confirm a high-impact
      change". Confirm button is disabled until a non-empty reason is
      typed.
- [ ] Type a reason ("updated copy"). Click Save.
- [ ] Toast: "High-impact change saved and version recorded."
- [ ] `ins_flow_draft_versions` shows one new row with the typed reason.
- [ ] `ins_flow_draft_audit` shows a `manual_save` row referencing it.

## Case 3 — High-impact discard reverts to last saved

- [ ] Change the post-email confirmation message again.
- [ ] When the modal appears, click "Discard change".
- [ ] Toast: "Reverted the high-impact change."
- [ ] The post-email confirmation shows the previous saved value.
- [ ] `ins_flow_draft_versions` has no new row.
- [ ] `ins_flow_draft_audit` has a new `discard_modal` row.

## Case 4 — Mixed-state save (low + high simultaneously)

- [ ] Edit the post-email confirmation AND add an example to the
      Opening block in the same session.
- [ ] On the autosave tick, the low-impact save runs (Opening example
      persists in `ins_flow_drafts.state`).
- [ ] Modal still opens for the held high-impact field.
- [ ] Confirm with a reason. Both saves are now persisted; the new
      version row captures the full snapshot.

## Case 5 — Tab-close while held

- [ ] Edit the post-email confirmation. Wait for the modal to appear.
- [ ] Try to close the browser tab. The browser shows a "leave site?"
      prompt.
- [ ] Confirm leaving. Reload the page.
- [ ] The post-email confirmation shows the previous saved value
      (the held high-impact change was dropped).
- [ ] Low-impact edits made earlier in the same session remain saved.

## Case 6 — Versions tab + Restore

- [ ] Open the Versions / Release-status tab.
- [ ] The "Saved versions" section lists rows from
      `ins_flow_draft_versions` (latest first).
- [ ] Click "Restore" on the oldest version.
- [ ] Modal appears in "restore" mode. Confirm without a reason.
- [ ] Workspace state hydrates from the restored snapshot.
- [ ] Toast: "Restored draft to v<n>".
- [ ] `ins_flow_draft_versions` has two new rows (one
      `restore_pre_snapshot` of the previous current state, one fresh
      copy of the restored state).
- [ ] `ins_flow_draft_audit` has matching `restore_pre_snapshot` and
      `restore` rows.

## Case 7 — Restore idempotency

- [ ] Click Restore on the same version a second time with the same
      reason. The system does not duplicate the audit / version rows.

## Compile-block contract

- [ ] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
      remains 33/33 green.

## Accessibility

- [ ] Modal traps focus (Tab + Shift+Tab loop within the dialog).
- [ ] Escape closes the modal via Discard.
- [ ] Textarea is auto-focused when the modal opens.
- [ ] Warning chip announces via `role="status"` to assistive tech.
- [ ] Light theme palette matches the rest of the workspace.
