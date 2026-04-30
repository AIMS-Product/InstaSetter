# P4.02 — Simulator active-block highlight · QA review

Manual checks before marking the PR `Tests-passing`.

## Functional smoke

- [ ] Open `/dashboard/flows/ig-organic-dm` with no block selected.
- [ ] Open the simulator.
- [ ] Send `Hey, I'm in Dallas and looking for side income. How does this work?`.
  - Expect: canvas highlight follows the reply (qualifier / opening tint).
- [ ] Send `Sounds good, send me the link.`
  - Expect: a `book_call` tool call OR the booking URL substring lights `Send the booking link`.
  - Expect: legend pill above the canvas reads `Currently replying as · Send the booking link`.
  - Expect: sim-float chip in the simulator header reads `Currently replying as Send the booking link`
    while the reply is pending; reverts to `Send the booking link selected` (or `Flow-wide draft`) when idle.
- [ ] Click the legend pill → the inspector selects `Send the booking link`.
- [ ] Open the inspector for that block → "Active" indicator pill is visible next to the block title.

## Visual

- [ ] Active treatment respects light theme (no neon, no dark mode trickery).
- [ ] Pulse animation is subtle (1.6s ease-in-out, opacity 0.4 → 1).
- [ ] No emoji indicators anywhere in the active treatment.
- [ ] Selected block treatment unchanged (3px outline + accent border).
- [ ] When a block is BOTH selected AND active, the selected outline wins for border.

## A11y

- [ ] DevTools → emulate `prefers-reduced-motion: reduce`. Pulse stops; static border + stripe stay.
- [ ] Legend pill is keyboard-reachable and has aria-label `Currently replying as <label>. Click to edit this step.`.
- [ ] Active indicator pill on the inspector is non-interactive but readable to a screen reader.

## Regression guard

- [ ] `npx vitest run src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/active-block.test.ts`
- [ ] `npx vitest run src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/active-block-legend.test.tsx`
- [ ] `npx vitest run src/app/dashboard/flows/[flowId]/__tests__/store.test.ts`
- [ ] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — must stay green.
- [ ] `npm run lint && npm run type-check`.

## Stack-coordination

- [ ] PR base is `feat/p4-base`.
- [ ] PR body notes `inspector.tsx`, `store.tsx`, `sim-float.tsx`, `canvas.tsx` overlap with P4.03 (#10) and P4.05 (#11) and that a rebase is expected before merge.
