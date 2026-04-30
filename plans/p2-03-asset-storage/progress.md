# P2.03 — Durable email-attachment asset storage

**Spec:** `plans/dm-setter-roadmap/p2-live-email-delivery/03-asset-storage.md` (lives in sibling worktree)
**Branch:** `feat/p2-03-asset-storage`
**PR target:** `feat/sofia-roadmap`
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385213712780

## Phase log

| #   | Step                                                                      | Status | Commit                                                               |
| --- | ------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| 1   | RED — service tests for email-assets                                      | DONE   | feat(email-assets): add service tests (stub)                         |
| 2   | GREEN — migration `20260502010000_ins_email_assets.sql`                   | DONE   | feat(schema): add ins_email_assets table                             |
| 3   | GREEN — `src/lib/services/email-assets.ts` service                        | DONE   | feat(email-assets): durable Supabase Storage service                 |
| 4   | RED — extend post-email-behavior schema tests for discriminated union     | DONE   | test(post-email-behavior): cover stored-asset shape                  |
| 5   | GREEN — widen `EmailAttachmentSchema` to discriminated union              | DONE   | refactor(schema): widen EmailAttachmentSchema to discriminated union |
| 6   | GREEN — extend `compileBlock` to async + branch on `kind`                 | DONE   | feat(compile-block): async stored-asset signed URL resolution        |
| 7   | GREEN — extend `compile-block.contract.test.ts` (legacy + stored fixture) | DONE   | test(compile-block): cover stored-asset variant                      |
| 8   | GREEN — Server Actions in `actions.ts` + tests                            | DONE   | feat(actions): upload + archive + list email asset actions           |
| 9   | GREEN — `email-asset-uploader.tsx` + RTL tests                            | DONE   | feat(ui): file-drop uploader in Email Capture inspector              |
| 10  | GREEN — wire uploader into `email.tsx`                                    | DONE   | feat(ui): integrate uploader into Email Capture panel                |
| 11  | Verify `npm run type-check`, `npm test`                                   | DONE   | —                                                                    |

## Notes

- Migration timestamp `20260502010000` reserved per execution-protocol.md §a (P2 reserved range; second slot in phase since P2.02 owns `20260502000000`).
- `compileBlock` is now async — only caller is `simulator-actions.ts`, which is already async. Tests updated accordingly.
- Magic-byte sniff hand-rolled (PDF, PNG, JPEG, ZIP) — no new deps.
- Bucket creation is manual on the Supabase dashboard (or via SQL editor). Documented in `## Third-party prerequisites` of the spec; included setup SQL in the migration as a separate `bucket-setup.sql` script for the user to run.
