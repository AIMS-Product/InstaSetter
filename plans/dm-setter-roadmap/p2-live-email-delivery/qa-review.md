# P2.01 — Pick post-email channel + sender — QA Review

---

## Step 1: RED test for `sendTransactionalEmail` shim

**Status**: Fixed | **Type**: test scaffolding

### Summary

`src/lib/services/__tests__/email-provider.test.ts` asserts the typed contract: `sendTransactionalEmail()` resolves with `{ success: false, error: 'NOT_CONFIGURED', retryable: false }` for any input shape, never throws (even with malformed input cast through `unknown`), and returns a typed `SendTransactionalEmailResult` discriminated union that callers can narrow on.

### Steps to test

1. Run `npx vitest run src/lib/services/__tests__/email-provider.test.ts`.

### Expected result

All 5 assertions green; test never fails because the shim is intentionally stubbed.

### Edge cases covered

- Fully-formed input (with attachment, replyTo, metadata).
- Minimal input (no optional fields).
- Attachment explicitly set to `null`.
- Malformed input cast through `unknown` does not throw.
- Discriminated-union narrowing: `success: true` branch carries `providerMessageId`; `success: false` branch carries `error` + `retryable`.

---

## Step 2: GREEN — `email-provider.ts` shim

**Status**: Fixed | **Type**: scaffold

### Summary

`src/lib/services/email-provider.ts` exports the typed `EmailAttachmentInput`, `SendTransactionalEmailInput`, `SendTransactionalEmailResult` interfaces and a `sendTransactionalEmail` function that returns `{ success: false, error: 'NOT_CONFIGURED', retryable: false }`. No third-party SDK is imported (Resend integration is owned by P2.04). The shim opens with `import 'server-only'` so it cannot be transitively bundled into client code.

### Steps to test

1. Run `npm run type-check`.
2. Run `npx vitest run src/lib/services/__tests__/email-provider.test.ts`.

### Expected result

Types compile; tests pass; no runtime crash on import.

### Edge cases / preserved behaviours

- The `idempotencyKey` field is required at the type level — callers cannot forget it. This protects P2.04's eventual `Idempotency-Key` header path.
- `attachment` accepts `null` explicitly (not just `undefined`) so caller code can pass an explicit "no attachment" signal across branches.
- The shim has zero side effects — calling it does not log, mutate state, or fail.

---

## Step 3: REFACTOR — `getEmailProviderConfig()` Zod slice

**Status**: Fixed | **Type**: config scaffold

### Summary

`src/lib/config.ts` adds a `getEmailProviderConfig()` getter that returns a Zod-validated object with `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_FROM_ADDRESS`, `RESEND_FROM_DISPLAY_NAME`, `RESEND_REPLY_TO`, all currently optional/nullable so missing vars do not crash unrelated routes. The slice mirrors the existing `sendpulseEnvSchema` / `anthropicEnvSchema` pattern.

### Steps to test

1. Run `npx vitest run src/lib/__tests__/config.test.ts`.

### Expected result

`getEmailProviderConfig()` returns all-null when env empty; never throws.
Existing `getServerConfig`, `getSendPulseConfig`, etc. remain unaffected (slice isolation invariant).

### Edge cases covered

- All env vars empty → all fields null, no throw.
- All env vars populated → values returned verbatim.
- `RESEND_FROM_ADDRESS` set to `not-an-email` → throws Zod error (partial config with malformed values fails closed; consistent with how the rest of `config.ts` validates).
- Slice isolation: getter does not require unrelated env vars (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BRAND_NAME`).

---

## Step 4: vitest.config.ts — `server-only` alias

**Status**: Fixed | **Type**: test infra

### Summary

Adding `import 'server-only'` to `email-provider.ts` (per spec API/contract block) requires Vitest to resolve the package. `server-only` is bundled inside Next.js (`node_modules/next/dist/compiled/server-only/`) rather than as a top-level dependency, so the import fails at vite's static analysis. The fix: alias `server-only` to Next's empty stub via `require.resolve('next/dist/compiled/server-only/empty.js')` in `vitest.config.ts`. Using `require.resolve` rather than a hardcoded path makes the alias work both inside the git worktree (whose `node_modules/` is empty and falls through to the parent) and from the main checkout.

### Steps to test

1. Run `npx vitest run` (full suite).

### Expected result

41 / 41 test files pass; 412 / 412 tests pass.

### Edge cases / preserved behaviours

- The empty-stub aliasing is benign — production builds do not see this config; Next.js's own bundler handles `server-only` at build time as before.
- No other tests' import behaviour changes.

---

## Step 5: docs sync

**Status**: Fixed | **Type**: docs

### Summary

`docs/sofia-feedback-priorities.md` lines 64-73 record the chosen sender (Resend / `team@vendingpreneurs.com` / `Anthony from VendingPreneurs` / Reply-To `sales@vendingpreneurs.com`).
`plans/dm-setter-roadmap/p2-live-email-delivery/decision.md` carries the one-page rationale and citations.

### Steps to test

1. Read `decision.md`.
2. Read updated `docs/sofia-feedback-priorities.md`.
3. Confirm both name Resend and the verified sender.

### Expected result

Decision is locked; downstream specs (P2.02–P2.05) have a hard contract to build against.

---

## Acceptance-criteria roll-up

- [x] `decision.md` exists with chosen provider, runner-up, rationale (3 bullets each), date, doc URLs + fetched-on date.
- [x] `src/lib/services/email-provider.ts` exports `sendTransactionalEmail` returning `{ success: false, error: 'NOT_CONFIGURED', retryable: false }`.
- [x] `src/lib/services/__tests__/email-provider.test.ts` covers the not-configured stub + never-throws contract.
- [x] `src/lib/config.ts` declares the chosen provider's env vars in a `getEmailProviderConfig()` Zod slice with all fields optional/nullable.
- [x] `docs/sofia-feedback-priorities.md` updated with the chosen provider in Sender / Reply-To section.
- [ ] Third-party prerequisites done by James (DNS records on `vendingpreneurs.com`, `sales@vendingpreneurs.com` provisioned, Resend account + Pro upgrade) — handed off, tracked in `decision.md`.

## Pre-commit gates

- `npm run type-check` — passed.
- `npm test` — 41 files / 412 tests pass.
- Pre-commit hooks (husky + lint-staged + eslint + prettier + tsc) execute without `--no-verify`.
