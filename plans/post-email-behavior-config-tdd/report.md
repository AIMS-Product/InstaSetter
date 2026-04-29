# TDD Report: Configurable Post-Email Behavior

Status: Complete.

## Issues Completed

1. Define post-email behavior config type
2. Make email-capture prompt accept configurable post-email behavior
3. Add post-email behavior to Flow Builder block config
4. Persist post-email behavior in Flow Builder drafts
5. Add editable Email Capture UI for after-email behavior
6. Wire post-email behavior into simulator compile overrides
7. Keep live engine hardcoded until published config is available
8. Document live-publish follow-up path
9. Fix preview draft save pending loop
10. Add configurable sent email template and attachment metadata

## Test Files Added Or Changed

- `src/lib/prompts/__tests__/post-email-behavior.test.ts`
- `src/lib/prompts/__tests__/email-capture.test.ts`
- `src/lib/prompts/__tests__/setter-v2.test.ts`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/block-sections.test.ts`
- `src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts`
- `src/app/dashboard/flows/[flowId]/__tests__/store.test.ts`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/email-panel.test.tsx`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-overrides.test.ts`
- `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
- `src/lib/services/__tests__/engine.test.ts`

## Source Files Changed

- `src/lib/prompts/post-email-behavior.ts`
- `src/lib/prompts/sections/email-capture.ts`
- `src/app/dashboard/flows/[flowId]/types.ts`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-sections.ts`
- `src/app/dashboard/flows/[flowId]/draft-persistence.ts`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/email.tsx`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/block-config-panel.tsx`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/inspector.tsx`
- `src/app/dashboard/flows/[flowId]/store.tsx`
- `src/app/dashboard/flows/[flowId]/flow-draft-sync.tsx`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/canvas.tsx`
- `src/app/dashboard/flows/[flowId]/directions/b-stage/simulator-overrides.ts`
- `src/lib/prompts/compile-block/schemas.ts`
- `src/lib/prompts/compile-block/compile-block.ts`
- `plans/post-email-behavior-config-tdd/plan.md`

## Verification

- `npx vitest run src/lib/prompts/__tests__/post-email-behavior.test.ts src/lib/prompts/__tests__/email-capture.test.ts src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts 'src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/email-panel.test.tsx' 'src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts' 'src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-overrides.test.ts'` - passed, 6 files / 72 tests.
- `npm run type-check` - passed.
- `npm test` - passed, 40 files / 403 tests after adding email template and attachment coverage.
- `git diff --check` - passed.
- In-app browser QA at `http://localhost:3000/dashboard/flows/ig-organic-dm` - passed. Email Capture selection opens the inspector, Runtime Details shows the post-email controls plus the new email subject, body, attachment file name, and attachment URL fields. A fresh reload resolves to `Draft: Unpublished edits · Saved` with no fresh console errors.

## QA Review

Manual QA cards are in `plans/post-email-behavior-config-tdd/qa-review.md`.

## Commits

No commits were requested or created.
