# P2.01 — Pick post-email channel + sender — Progress

| Step | Title                                                     | Status | RED | GREEN | REFACTOR | Commit |
| ---- | --------------------------------------------------------- | ------ | --- | ----- | -------- | ------ |
| 1    | RED: write `email-provider.test.ts` (NOT_CONFIGURED stub) | DONE   | YES |       |          |        |
| 2    | GREEN: write `email-provider.ts` shim                     | DONE   |     | YES   |          |        |
| 3    | REFACTOR: add `getEmailProviderConfig()` Zod slice        | DONE   |     |       | YES      |        |
| 4    | Extend `config.test.ts` to cover `getEmailProviderConfig` | DONE   | YES | YES   |          |        |
| 5    | Land `decision.md` memo                                   | DONE   |     |       |          |        |
| 6    | Update `docs/sofia-feedback-priorities.md` sender block   | DONE   |     |       |          |        |

## Notes

- Branch: `feat/p2-01-pick-channel`
- Worktree: `/Users/jamesaims/Desktop/Development/InstaSetter/.claude/worktrees/agent-a56907e4a91ef2a99`
- This spec is decision-record + scaffold only. No third-party SDK is installed (`resend` / `svix` defer to P2.04 per spec line 14).
- `vitest.config.ts` was extended with a `server-only` alias because the worktree's `node_modules/` is empty and Vitest cannot otherwise resolve `import 'server-only'`. The alias points to Next.js's bundled empty stub via `require.resolve('next/dist/compiled/server-only/empty.js')`, which works from both the worktree and the main checkout.
- Resend send + webhook docs spot-checked via WebFetch (April 2026):
  - `POST https://api.resend.com/emails`, Bearer token auth.
  - Attachment cap: 40MB per email after base64 encoding (confirmed).
  - `Idempotency-Key` header documented, 24h expiry, ≤256 chars (confirmed).
  - All six subscribed event types — `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` — are documented in the official event-types page.

## Test runs

- `npx vitest run src/lib/services/__tests__/email-provider.test.ts` — 5 / 5 pass (GREEN).
- `npx vitest run src/lib/__tests__/config.test.ts src/lib/services/__tests__/email-provider.test.ts` — 16 / 16 pass.
- Full suite: 41 files / 412 tests pass (was 40 / 403 at HEAD `80d5d98`; +9 new tests this branch).
- `npm run type-check` — passed.
