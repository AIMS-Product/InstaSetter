# Simulator ⇄ Block Inspector Wiring — Report

**Date**: 2026-04-21
**Scope**: Wire the Flow Builder simulator to honour in-flight block edits (Goal, Guidance) via a pure `compileBlock()` function, gated behind `NEXT_PUBLIC_FLOW_COMPILE`. No impact on live Instagram DM traffic.
**Outcome**: ✅ Complete — 9/9 issues landed across 7 waves. Full suite green; production build clean.

---

## What this was

Before this plan, editing a block's Goal in the inspector updated React state but never reached Claude — the simulator always compiled its system prompt from `buildSystemPrompt()` with no block context. This was the observed failure when the user typed "Ask for city" into the Opening block's Goal and the bot still replied "What area are you in?".

The fix is narrow and non-invasive:

- A new pure function `compileBlock({ brand, bookingUrl?, overrides? })` that, with no overrides, returns byte-identical output to `buildSystemPrompt()` (the "contract").
- With `overrides.activeBlockType` set, it appends an `## Active Block Directive` section naming the block and its goal/guidance.
- With `overrides.goal` or `overrides.guidance` truthy, those strings replace the defaults in that directive.
- The simulator server action routes to `compileBlock()` when `NEXT_PUBLIC_FLOW_COMPILE === 'true'`, otherwise keeps the legacy path.
- The client (`sim-float.tsx`) threads the currently-selected block's live inspector state into the action call.

## Commits landed (13 total — 9 feature + 4 plan-doc syncs)

| #   | Commit    | Title                                                                                |
| --- | --------- | ------------------------------------------------------------------------------------ |
| 1   | `2c62953` | feat(flow-builder): add BlockOverrides Zod schema                                    |
| 2   | `1e161e6` | feat(flow-builder): add compileBlock contract — baseline = buildSystemPrompt         |
| 3   | `5adecac` | feat(flow-builder): compileBlock appends Active Block Directive for active block     |
| 4   | `f82f65c` | feat(flow-builder): compileBlock honours goal/guidance overrides                     |
| 5   | `d0b9fba` | refactor(flow-builder): extend simulator action schema with optional block overrides |
| 6   | `9d74a29` | feat(flow-builder): simulator action routes via NEXT_PUBLIC_FLOW_COMPILE flag        |
|     | `a744c14` | chore(plan): record landed hash for Issue 6                                          |
| 7   | `5452b34` | feat(flow-builder): sim-float threads active block overrides into simulator action   |
|     | `2b53ce4` | chore(plan): record landed hash for Issue 7                                          |
| 8   | `7079d00` | test(flow-builder): lock compileBlock contract across all block types                |
| 9   | `1922588` | test(flow-builder): end-to-end smoke — edited goal reaches Claude system prompt      |
|     | `f0b2c68` | chore(plan): record landed hash for Issue 9                                          |

## Verification

- **Tests**: 319 passed / 319 total across 35 files (`npx vitest run`).
- **Contract**: `compile-block.contract.test.ts` now has 22 tests covering 8 block types × 2 bookingUrl shapes. Sanity-checked via temporary mutation — contract catches drift.
- **End-to-end**: `simulator-actions.test.ts` has 13 tests including 4 that drive the full chain `simulateReplyAction → compileBlock → Anthropic SDK system string`. Sanity-checked via temporary mutation.
- **Type check**: `tsc --noEmit` reports one error — `src/lib/prompts/__tests__/setter-v2.test.ts:221` (`/location.*AND.*motivation/is` — the `s` regex flag). Pre-existing: commit `8832ee34` (2026-04-15), predates this plan.
- **Build**: `npm run build` completes cleanly; all routes generate.
- **Pre-commit hooks**: every commit passed husky + lint-staged + eslint + prettier. No `--no-verify` bypasses.

## Pipeline shape

| Wave | Issues | Parallel? | Duration         |
| ---- | ------ | --------- | ---------------- |
| 1    | 1      | -         | single-agent     |
| 2    | 2, 5   | yes       | 2-agent parallel |
| 3    | 3      | -         | single-agent     |
| 4    | 4      | -         | single-agent     |
| 5    | 6, 8   | yes       | 2-agent parallel |
| 6    | 7      | -         | single-agent     |
| 7    | 9      | -         | single-agent     |

Two agents (Issue 1, Issue 5) had to be nudged to finish their commit phase — flagged as a pattern for future fix-cycle guidance but caught and resolved within the same wave.

## Safety invariants respected

Per `docs/flow-builder/ROLLOUT.md`:

- ✅ **Additive-only**: new files under `src/lib/prompts/compile-block/`; existing files got narrow additions (import + optional schema field + flag branch + props).
- ✅ **Feature-flagged**: `NEXT_PUBLIC_FLOW_COMPILE` defaults to off. Unset or `'false'` → unchanged legacy behaviour.
- ✅ **Contract test mandatory**: 22 assertions in `compile-block.contract.test.ts` run on every PR.
- ✅ **Zero prod DM impact**: no changes to `src/lib/services/engine.ts`, webhook handlers, or any path the real Instagram DM pipeline touches.
- ✅ **Byte-identity on the legacy path**: contract proves it.

## How to flip it on

```bash
# .env.local
NEXT_PUBLIC_FLOW_COMPILE=true
```

Restart dev server. Select a block, edit its Goal, open the simulator, send a message — reply reflects the edit. Unset the flag, restart — legacy behaviour returns.

## Out of scope (deferred to v2)

- DB persistence (`ins_flow_versions`, `ins_feature_flags`).
- Live DM runtime cutover (Week 7 ROLLOUT work).
- Overrides for captures, branches, triggers, examples.
- Server-side flag reads (needed before any prod cutover).

## Next commands

- **Manual UAT**: see the cards in `plans/simulator-compile-wire-tdd/qa-review.md`.
- **Browser QA**: `/qa-browser plans/simulator-compile-wire-tdd/qa-review.md` to automate.
- **Pre-existing tsc error**: separate cleanup — `setter-v2.test.ts:221` uses the `s` regex flag; bump `tsconfig.json`'s `target` to ES2018+ or change the test to use `[\s\S]`.
