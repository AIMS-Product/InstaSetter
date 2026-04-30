# P1.04 — QA Review Checklist

## Unit / integration

- [ ] `npm run test -- src/lib/prompts/__tests__/brand-guardrails.test.ts`
- [ ] `npm run test -- src/lib/prompts/__tests__/setter-v2.test.ts`
- [ ] `npm run test -- src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
- [ ] `npm run test -- src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts`
- [ ] `npm run test -- src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/guardrails-panel.test.tsx`
- [ ] `npm run test -- src/lib/services/__tests__/brand-guardrails-resolver.test.ts`
- [ ] `npm run test -- src/lib/services/__tests__/engine.test.ts`
- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run build`

## Manual / browser

- [ ] Open Flow Builder → Bot tab → Brand Guardrails panel renders
- [ ] Locked persona phrases render above the editable list with `LockPill`
- [ ] Empty state copy mentions hardcoded persona phrases still apply
- [ ] "Add a forbidden phrase" appends a row, focus moves to phrase input
- [ ] Editing the phrase text persists via `update_bot` reducer action
- [ ] Delete row removes it, count updates ("N of 50 phrases used")
- [ ] Reload page → previously-saved phrases still present
- [ ] Reserved-term warning surfaces on `passive income` not present in default reserved list (only `booking`/`call`/`masterclass`/`email` warn)
- [ ] Counter reads "0 of 50 phrases used" by default

## Live verification

- [ ] `LIVE_BRAND_GUARDRAILS_ENABLED=true` (default): empty list → bot prompt unchanged.
- [ ] With one phrase wired through (manual stub of resolver), prompt contains the section.
- [ ] Out-of-scope: full publish-path wiring is deferred (resolver returns `[]` v0).

## Regressions to confirm absent

- [ ] `compileBlock(<no overrides>)` byte-identical to `buildSystemPrompt()` for every block type
- [ ] Existing block panels (Email / Booking) still render unchanged
- [ ] No new env var requirement breaks dev (flag has a default)
