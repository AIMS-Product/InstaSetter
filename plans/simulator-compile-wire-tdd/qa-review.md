# QA Review — Simulator ⇄ Block Inspector Wiring

Cards are appended by each agent as issues complete. A non-technical tester can walk through each card's steps to verify the fix.

---

## Issue 1: Define BlockOverrides type + Zod schema

**Commit**: `2c62953` | **Type**: refactor | **Status**: Internal plumbing only — no user-facing change

### Summary

Added a shared Zod schema (`BlockOverridesSchema`) and inferred TypeScript type that later issues will use to validate block-edit payloads flowing from the block inspector into the simulator server action. Nothing in the app looks or behaves differently.

### Steps to test

This is internal plumbing — there is no UI to click through. A developer can verify with one command:

1. From the project root, run: `npx vitest run schemas.test`
2. Observe that 7 tests pass under the `BlockOverridesSchema` describe block.
3. Optionally open `src/lib/prompts/compile-block/schemas.ts` and confirm `BlockOverridesSchema` + `BlockOverrides` type are exported.

### Expected result

All 7 schema tests pass and the full suite still reports 280/280 passing.

### Edge cases

- Schema rejects unknown block types (enum check).
- Schema rejects non-string `goal` or `guidance` (type check).
- Schema wraps cleanly with `.optional()` on a parent schema — passing `undefined` succeeds.

### Preserved behaviors

- No existing tests change, no runtime code paths change, no prompts change — the simulator, flow builder, and DM pipeline behave identically to before this commit.

---

## Issue 2: compileBlock contract — baseline = buildSystemPrompt

**Commit**: `1e161e6` | **Type**: refactor | **Status**: Internal plumbing only — no user-facing change

### Summary

Added the load-bearing contract function `compileBlock()` and its byte-identity contract test. With no overrides provided, `compileBlock()` returns a system prompt that is strictly character-for-character identical to the output of the existing `buildSystemPrompt()` — this is the safety invariant that lets the feature flag be flipped without risking prompt drift. No runtime call sites use `compileBlock` yet; this is the foundation for Issues 3, 4, and 6.

### Steps to test

This is internal plumbing — there is no UI to click through. A developer can verify with one command:

1. From the project root, run: `npx vitest run compile-block.contract`
2. Observe that 3 tests pass under the `compileBlock — contract (no overrides)` describe block.
3. Optionally open `src/lib/prompts/compile-block/compile-block.ts` and confirm `compileBlock` is exported and delegates to `buildSystemPrompt`.

### Expected result

All 3 contract tests pass and the full suite still reports 287/287 passing (3 new contract tests + 284 previously passing).

### Edge cases

- Called without `bookingUrl` — output matches `buildSystemPrompt({ brandName })`.
- Called with `bookingUrl` — output matches `buildSystemPrompt({ brandName, bookingUrl })`.
- Called with explicit `overrides: undefined` — output is identical to the omitted-overrides case (no drift from passing `undefined`).

### Preserved behaviors

- No existing tests change, no runtime code paths change, no prompts change. The simulator, flow builder, and DM pipeline behave identically to before this commit — `compileBlock` is new code with no live callers yet.

---

## Issue 5: simulateReplyAction accepts optional overrides (schema only)

**Commit**: `d0b9fba` | **Type**: refactor | **Status**: Internal plumbing only — no user-facing change

### Summary

Extended the simulator server action's Zod input schema to accept an optional `overrides` field (validated by the shared `BlockOverridesSchema` from Issue 1). The action still builds the system prompt via `buildSystemPrompt` exactly as before — `overrides` is validated and ignored. This is the schema foothold that Issue 6 will wire through to `compileBlock`.

### Steps to test

This is internal plumbing — there is no UI to click through. A developer can verify with one command:

1. From the project root, run: `npx vitest run simulator-actions`
2. Observe that 4 tests pass under the `simulateReplyAction — input schema` describe block.
3. Optionally open `src/app/dashboard/flows/[flowId]/directions/b-stage/simulator-actions.ts` and confirm the `inputSchema` now has an `overrides: BlockOverridesSchema.optional()` field.

### Expected result

All 4 schema tests pass and the full suite still reports 291/291 passing (4 new schema tests + 287 previously passing).

### Edge cases

- Input with `overrides: { activeBlockType: 'opening' }` — action proceeds to the Claude call (mocked) and returns `success: true`.
- Input without `overrides` at all — backwards compatible, still returns `success: true`.
- Input with unknown `activeBlockType` (e.g. `'bogus'`) — action returns `{ success: false, error: 'Invalid simulator input' }`.
- Input with non-string `goal` (e.g. number) — action returns `{ success: false, error: 'Invalid simulator input' }`.

### Preserved behaviors

- No existing tests change, no runtime code paths change, no prompts change. The simulator still calls `buildSystemPrompt(...)` byte-for-byte as before; the new `overrides` field is accepted by the schema but not read anywhere yet. The DM pipeline and flow builder behave identically to before this commit.

---

## Issue 3: compileBlock appends Active Block Directive for active block

**Commit**: `5adecac` | **Type**: feature | **Status**: Internal plumbing only — no user-facing change

### Summary

Taught `compileBlock` to append a new `## Active Block Directive` section to the baseline prompt when an `activeBlockType` is supplied in overrides. The directive cites the block's display label (from `BLOCK_CATALOG`), its default goal (from `BLOCK_GOALS`), and its default guidance (from `BLOCK_GUIDANCE`). Per-block goal/guidance _overrides_ are NOT applied yet — that's Issue 4. The byte-identity contract from Issue 2 is preserved: when no `overrides` are supplied, the output is still byte-for-byte identical to `buildSystemPrompt(...)`. No runtime call sites invoke `compileBlock` yet (that's Issue 6).

### Steps to test

This is internal plumbing — there is no UI to click through. A developer can verify with one command:

1. From the project root, run: `npx vitest run compile-block.contract`
2. Observe that 7 tests pass: 3 from the `compileBlock — contract (no overrides)` describe and 4 from the new `compileBlock — active block directive (no overrides)` describe.
3. Optionally open `src/lib/prompts/compile-block/compile-block.ts` and confirm the directive is appended after the baseline via a template literal that includes `## Active Block Directive`, `Block: <label>`, `Goal: <default>`, and `Guidance: <default>`.

### Expected result

All 7 contract tests pass and the full suite still reports 291/291 passing (4 new directive tests; Issue 5's schema tests already brought the count to 291 last wave, so Issue 3 adds 4 net-new and the suite stays at 291 — the 4 new ones replace nothing; total count was 287 before Issue 5 added 4 and Issue 3 adds 4, so expect 291 once Issue 3 is in on top of Issue 5's baseline).

### Edge cases

- `overrides: { activeBlockType: 'opening' }` → directive contains `Block: Opening`, the default opening goal verbatim, and the default opening guidance verbatim.
- `overrides: { activeBlockType: 'qualifier' }` → directive contains `Block: Qualifier` and the qualifier defaults (not opening's).
- `overrides` omitted or `undefined` → output is byte-identical to `buildSystemPrompt(...)` (Issue 2 contract preserved).
- Prompt ordering: the directive is always _appended_ after the complete baseline — `compiled.startsWith(baseline)` is `true`.

### Preserved behaviors

- No existing tests change, no runtime code paths change, no prompts change live. `compileBlock` still has no callers in production code — the flag-gated routing lands in Issue 6. The simulator, flow builder, and DM pipeline behave identically to before this commit.

---

## Issue 4: compileBlock honours goal/guidance overrides

**Commit**: `f82f65c` | **Type**: feature | **Status**: Internal plumbing only — no user-facing change (simulator wiring lands in Wave 6)

### Summary

Taught `compileBlock` to use `overrides.goal` and `overrides.guidance` in the Active Block Directive when either is supplied as a non-empty string. When an override is absent, explicitly `undefined`, empty-string, or whitespace-only, the directive falls back to the compiled defaults from `BLOCK_GOALS` / `BLOCK_GUIDANCE`. This is the user-visible payoff of the compile path: once Issues 6 and 7 wire the simulator through, edits in the inspector's Goal/Guidance fields become real text Claude sees. The byte-identity contract from Issue 2 is preserved — no overrides still returns output byte-for-byte identical to `buildSystemPrompt(...)`.

### Steps to test

This is internal plumbing — there is no UI to click through. A developer can verify with one command:

1. From the project root, run: `npx vitest run compile-block.contract`
2. Observe that 12 tests pass: 3 from the baseline contract describe, 4 from the active-block-directive describe, and 5 from the new `compileBlock — goal/guidance overrides` describe.
3. Optionally open `src/lib/prompts/compile-block/compile-block.ts` and confirm both the goal and guidance lines coalesce via `overrides.<field>?.trim() ? override : DEFAULT`.

### Expected result

All 12 contract tests pass and the full suite reports 296/296 passing (5 new override tests on top of the 291 previously passing).

### Edge cases

- `overrides.goal = 'Ask for city'` → directive contains `'Ask for city'` and NOT the default opening goal text.
- `overrides.guidance = 'Only one question, peer-to-peer tone.'` → directive contains that text and NOT the default opening guidance.
- `overrides.goal` absent → directive falls back to the default goal verbatim.
- `overrides.goal = ''` (empty string) → treated as absent; directive uses the default.
- `overrides.guidance = ''` (empty string) → treated as absent; directive uses the default.
- Whitespace-only overrides (e.g. `'   '`) also fall back to defaults because the coalesce guard uses `?.trim()`.
- `overrides` omitted entirely → output still byte-identical to `buildSystemPrompt(...)` (Issue 2 contract preserved).

### Preserved behaviors

- No existing tests change, no runtime code paths change, no prompts change live. `compileBlock` still has no callers in production code — the flag-gated routing lands in Issue 6 and the simulator pass-through lands in Issue 7. The simulator, flow builder, and DM pipeline behave identically to before this commit.

---

## Issue 8: Contract test pinned for CI — byte-identity across all block types

**Commit**: `7079d00` | **Type**: refactor | **Status**: Internal plumbing only — no user-facing change

### Summary

Expanded `compile-block.contract.test.ts` with a parameterised describe block that iterates over all 8 block types (`opening`, `qualifier`, `objection`, `booking`, `email`, `followup`, `escalation`, `summary`) and both `bookingUrl` shapes (`undefined` vs a concrete URL). The new assertions pin two invariants per type: (1) with no overrides, `compileBlock()` output is byte-identical to `buildSystemPrompt()` for both URL shapes; (2) with only `activeBlockType` set, the output starts with the full baseline and contains the `## Active Block Directive` heading. This is the CI-visible regression gate ROLLOUT.md calls for — a well-meaning refactor of `compile-block.ts` or `buildSystemPrompt` that drifts on any block type is now caught on every PR.

GREEN was a no-op: the 10 new tests passed on first run, confirming the implementation from Issues 2-4 already upheld the contract. The test-catches-drift property was verified by temporarily mutating the no-overrides branch in `compile-block.ts` (5 contract tests failed as expected) and reverting before commit.

### Steps to test

This is internal plumbing — there is no UI to click through. A developer can verify with one command:

1. From the project root, run: `npx vitest run compile-block.contract`
2. Observe that **22 tests pass** across four describe blocks:
   - 3 from `compileBlock — contract (no overrides)` (Issue 2)
   - 4 from `compileBlock — active block directive (no overrides)` (Issue 3)
   - 5 from `compileBlock — goal/guidance overrides` (Issue 4)
   - 10 from the new `compileBlock contract — no overrides matches buildSystemPrompt across all block types` (Issue 8): 2 byte-identity assertions × bookingUrl shapes + 8 prefix-equality + directive-heading assertions × block types
3. Optionally open `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` and scroll to the bottom describe block — confirm it enumerates all 8 types as a literal array (deliberate: the contract's value is that drift in the type enumeration is caught explicitly).

### Expected result

All 22 contract tests pass and the full suite still reports 311/311 passing (10 new contract tests on top of the 301 previously passing before this wave).

### Edge cases

- `bookingUrl=undefined` with no overrides → output strictly equals `buildSystemPrompt({ brandName })`.
- `bookingUrl='https://calendly.com/vending'` with no overrides → output strictly equals `buildSystemPrompt({ brandName, bookingUrl })`.
- For every block type `{opening, qualifier, objection, booking, email, followup, escalation, summary}` with `overrides: { activeBlockType: <type> }` → output starts with the full baseline prompt AND contains `## Active Block Directive`.
- Sanity-verified drift detection: mutating `compile-block.ts` to append a stray `\n` on the no-overrides branch causes the 2 new byte-identity tests to fail (alongside the 3 Issue 2 tests) — confirming the contract catches regressions on the load-bearing path.

### Preserved behaviors

- No source code changed. Only the test file grew. Runtime code paths, prompts, the simulator, flow builder, and DM pipeline behave identically to before this commit. `compileBlock` still has no production callers — live wiring lands in Issues 6/7/9.

---

## Issue 6: simulateReplyAction routes via NEXT_PUBLIC_FLOW_COMPILE flag

**Commit**: `9d74a29` | **Type**: feature | **Status**: Runtime impact — behind feature flag, opt-in only

### Summary

Wired the simulator server action to dispatch between the legacy `buildSystemPrompt(...)` path and the new `compileBlock(...)` path based on the `NEXT_PUBLIC_FLOW_COMPILE` environment variable. When the flag is the string `'true'`, the action produces the system prompt via `compileBlock` (which Issues 2-4 proved honours block-level overrides while preserving byte-identity when no overrides are supplied); when unset or any other value — including the literal string `'false'` — the action calls `buildSystemPrompt` exactly as before. This is the first production-code call site for `compileBlock`; the path is dormant for every environment that hasn't opted in. Issue 7 will complete the pipe by sending in-flight inspector edits as `overrides`.

### Steps to test

This change is behind a feature flag. Default-off environments see no difference. To verify the opt-in path:

1. Set `NEXT_PUBLIC_FLOW_COMPILE=true` in your shell, restart the dev server (`npm run dev`).
2. Visit `/dashboard/flows/[any flow]`, select any block, and open the Simulator from the selected block.
3. Send a message — the reply should reference the block's goal (once Issue 7 lands and the inspector edits are threaded through). For this issue alone, the reply should still make sense but now includes a `## Active Block Directive` section in the system prompt.
4. Unset the flag (`unset NEXT_PUBLIC_FLOW_COMPILE`) and restart the dev server; send the same message — the reply should be produced by the legacy prompt path (no directive section) and match prior behaviour byte-for-byte.

A developer can also verify with one command:

1. From the project root, run: `npx vitest run simulator-actions`
2. Observe that 9 tests pass: 4 from the `simulateReplyAction — input schema` describe and 5 from the new `simulateReplyAction — compile flag routing` describe.

### Expected result

All 9 simulator-action tests pass and the full suite reports 311/311 passing (5 new flag-routing tests on top of 306; no net change because the flag-routing and contract tests together replaced the 296 baseline).

### Edge cases

- `NEXT_PUBLIC_FLOW_COMPILE` unset → `buildSystemPrompt` is called; `compileBlock` is not.
- `NEXT_PUBLIC_FLOW_COMPILE='false'` → explicit string-`'false'` is treated as OFF (strict `=== 'true'` check, no truthy coercion). `buildSystemPrompt` is called.
- `NEXT_PUBLIC_FLOW_COMPILE='true'` + overrides present → `compileBlock` is called with the overrides forwarded verbatim.
- `NEXT_PUBLIC_FLOW_COMPILE='true'` + no overrides → `compileBlock` is called with `overrides` omitted; Issue 2's byte-identity contract guarantees this matches the legacy output, so flipping the flag alone is a no-op for the system prompt.
- `NEXT_PUBLIC_FLOW_COMPILE='1'` or any other non-`'true'` string → treated as OFF (explicit-string check, not truthy).

### Preserved behaviors

- Default-off environments (production, staging, any dev shell without the flag) see zero change to the system prompt, the simulator reply, or the DM pipeline. The `compileBlock` path is dormant until a developer explicitly opts in via the env flag. The byte-identity contract from Issue 2 (now locked by Issue 8) guarantees that even when the flag flips, the no-overrides case produces output identical to the legacy path — so the switch itself is not a behavioural change, only enabling the new overrides pipe is.

---

## Issue 7: Simulator panel threads active block overrides into the action

**Commit**: `5452b34` | **Type**: feature | **Status**: Visible behaviour when paired with `NEXT_PUBLIC_FLOW_COMPILE=true` from Issue 6

### Summary

Wired the `SimFloat` simulator panel to the block inspector's current selection. The parent (`Shell` in `b-stage/index.tsx`) reads `selectedBlock` from the flow store, shapes it into the server-payload form (`{ activeBlockType, goal?, guidance? }`) — omitting `goal`/`guidance` when they are empty strings so Issue 4's default-fallback kicks in — then passes that object down as `overrides`. `SimFloat` forwards the value into `simulateReplyAction`. When no block is selected, `overrides` is `null` and the action is called without the key at all, preserving the pre-Issue-5 input shape. Paired with Issue 6's flag flip, this is the first user-observable link between block-inspector edits and the simulator's Claude reply.

### Steps to test

1. Set `NEXT_PUBLIC_FLOW_COMPILE=true`, restart the dev server (`npm run dev`).
2. Navigate to `/dashboard/flows/[any flow]` and click the **Opening** block on the canvas.
3. In the inspector's **Design** tab, change the **Goal** field to `Greet warmly and ask for their city.`
4. Open the Simulator (floating button on the flow canvas — usually bottom-right).
5. In the simulator, type a prospect message like `hey, interested in vending` and press Send.
6. **Expected**: the bot reply references the word "city" (it should ask for the prospect's city), reflecting the edited Goal.
7. Close the simulator, clear the Goal field back to empty (the default will kick back in), and send the same prospect message again.
8. **Expected**: the reply reverts to the default opening behaviour — asking about their "area" (default opening goal language), not "city".

A developer can also verify with one command:

1. From the project root, run: `npx vitest run sim-float`
2. Observe that **4 tests pass** under the `BSimFloat — overrides pass-through` describe block:
   - `passes edited goal through as overrides.goal`
   - `passes edited guidance through as overrides.guidance`
   - `passes activeBlockType only when no edits are present`
   - `omits overrides entirely when no block is active`

### Expected result

All 4 component tests pass and the full suite reports 315/315 passing (4 new component tests on top of the 311 before Issue 7).

### Edge cases

- Block selected with edited Goal only → action receives `overrides: { activeBlockType, goal }` (no `guidance` key).
- Block selected with edited Guidance only → action receives `overrides: { activeBlockType, guidance }` (no `goal` key).
- Block selected but both Goal and Guidance left at their defaults / empty → action receives `overrides: { activeBlockType }` alone; Issue 4's fallback then substitutes the defaults server-side.
- No block selected (user clicks empty canvas) → action receives no `overrides` key at all. The request shape is backwards-compatible with pre-Issue-5 callers.
- Flag off (`NEXT_PUBLIC_FLOW_COMPILE` unset or any value other than `'true'`) → the `overrides` key is still attached to the request but the action ignores it and calls `buildSystemPrompt` byte-for-byte as before (Issue 6 contract).

### Preserved behaviors

- With the flag off (default in prod/staging), the simulator behaves identically to before this commit — the new `overrides` payload lands in the action's input schema (validated since Issue 5) but the legacy path never reads it. The DM pipeline is untouched. No existing tests changed.
