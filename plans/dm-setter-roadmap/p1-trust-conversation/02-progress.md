# P1.02 — Softer pre-booking rapport step (progress)

**Branch:** `feat/p1-02-softer-pre-booking`
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385213878616

## TDD log

### RED → GREEN: pre-booking-resolver

- Created `src/lib/services/__tests__/pre-booking-resolver.test.ts` — 4 tests covering env-flag handling, default behaviour, disabled clone, and immutability of the default constant.
- Added `LIVE_PRE_BOOKING_STEP_ENABLED` env flag + `isLivePreBookingStepEnabled()` accessor to `src/lib/config.ts`.
- Created `src/lib/services/pre-booking-resolver.ts` — single seam for the live engine; future P2 work swaps the body for a published-config lookup. The brand argument is accepted but unused today.

### Schema

- Created `src/lib/prompts/pre-booking-step.ts` (Zod schema + `DEFAULT_PRE_BOOKING_STEP`). The default question is "What got you interested in vending?" — Sofia's canonical example from the Apr 29 walkthrough.

### RED → GREEN: decision-routing

- Created `src/lib/prompts/__tests__/decision-routing.test.ts` — 9 tests covering disabled-byte-identical (legacy preserved), enabled rapport-bridge section, GATE 1 wording relaxation, ordering relative to GATE 2, custom question/skipWhen passthrough, no-loop instruction, "regardless of prospect answer" instruction.
- Updated `src/lib/prompts/sections/decision-routing.ts` to accept the optional `preBookingStep` arg. GATE 1 directive is conditional: legacy "VERY NEXT message" wording when bridge is disabled, "Two qualifiers + one rapport bridge = booking link" wording when enabled. New `### Rapport Bridge` section appended between GATE 1 and GATE 2 only when enabled.

### Wire: setter-v2

- Added `preBookingStep?: PreBookingStep` to `BuildSystemPromptOptions`, defaults to `DEFAULT_PRE_BOOKING_STEP`. Threaded into `buildDecisionRouting`.
- Extended `src/lib/prompts/__tests__/setter-v2.test.ts` with two new tests: rapport-bridge-present-by-default and disabled-reverts-to-legacy.

### Wire: engine

- Imported `resolveLivePreBookingStep` in `src/lib/services/engine.ts`. `processMessage` now resolves the active step via the seam and threads it into `buildSystemPrompt`.
- Updated `src/lib/services/__tests__/engine.test.ts` to mock `isLivePreBookingStepEnabled` and assert that `buildSystemPrompt` is called with `preBookingStep: { enabled: true, ... }` by default.

### Contract test

- The contract test (`src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`) stays green: `compileBlock(default)` and `buildSystemPrompt(default)` both default to `DEFAULT_PRE_BOOKING_STEP`, so they remain byte-identical. Added one explicit fixture asserting the default rapport bridge is present in the compiled baseline.

### Live verification scenarios

- Added `pre-booking-rapport-asked`, `pre-booking-rapport-skipped`, and `pre-booking-rapport-ignored` scenarios to `scripts/test-prompt.ts`.
- Updated `scripts/test-prompt.ts` `loadPrompt()` to thread `DEFAULT_PRE_BOOKING_STEP` into `buildDecisionRouting` so the live runner mirrors what the engine compiles.

## Verification status

- [x] `npx vitest run` — 419/419 tests pass across 42 files.
- [x] `npm run type-check` — clean.
- [x] `npm run lint` — 0 errors, pre-existing warnings only (16 unused-var warnings in scripts/ + one intentional `_brandName` future-seam in pre-booking-resolver).
- [x] Contract test (`compile-block.contract.test.ts`) — 34/34 pass; default path still byte-identical to `buildSystemPrompt`.
- [ ] Live `scripts/test-prompt.ts` runs against Sonnet 4.6 — to be executed before merge with `ANTHROPIC_API_KEY` from `.env.local`.

## Default rapport question

```
"What got you interested in vending?"
```

Skip-when guidance:

> The prospect has already shared a clear motivation, story, or specific goal — for example, they have spent 4+ replies sharing context, volunteered a story, or asked a substantive question that demonstrates engagement.

## Rollback

Set `LIVE_PRE_BOOKING_STEP_ENABLED=false` in Vercel env vars and redeploy. Within ~1 minute every new conversation reverts to the legacy "VERY NEXT message" wording — byte-for-byte identical to pre-PR.

## Files touched

**New:**

- `src/lib/prompts/pre-booking-step.ts`
- `src/lib/services/pre-booking-resolver.ts`
- `src/lib/services/__tests__/pre-booking-resolver.test.ts`
- `src/lib/prompts/__tests__/decision-routing.test.ts`

**Modified:**

- `src/lib/config.ts` — added `isLivePreBookingStepEnabled()`
- `src/lib/prompts/sections/decision-routing.ts` — added `preBookingStep` arg + Rapport Bridge section
- `src/lib/prompts/setter-v2.ts` — threaded `preBookingStep` through assembler
- `src/lib/prompts/__tests__/setter-v2.test.ts` — 2 new assertions
- `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — 1 new fixture
- `src/lib/services/engine.ts` — call resolver, thread to prompt
- `src/lib/services/__tests__/engine.test.ts` — mock + assertion
- `scripts/test-prompt.ts` — load step, add 3 rapport scenarios
