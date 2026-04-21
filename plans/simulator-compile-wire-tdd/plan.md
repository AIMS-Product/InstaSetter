# TDD Plan: Simulator ⇄ Block Inspector Wiring

## Overview

The Flow Builder's block inspector lets marketers edit each block's Goal and Guidance, but those edits are React-state-only — they don't change the Claude reply produced by the simulator. This plan wires the inspector through to the simulator action via a new pure `compileBlock()` function that injects the active block's directive into the system prompt, gated behind a feature flag.

Scope is deliberately narrow:

- **Simulator only** — no impact on live Instagram DM traffic.
- **Goal + Guidance only** — examples/captures/branches/triggers are deferred.
- **No DB persistence** — edits flow through React state → Server Action params; `ins_flow_versions` is v2 work.
- **Feature-flagged** — `NEXT_PUBLIC_FLOW_COMPILE=true` opts in; default off reproduces current behaviour byte-for-byte.

The load-bearing invariant is a **contract test**: with flag off (or no overrides), `compileBlock()` returns a system prompt byte-identical to `buildSystemPrompt()`. This is how we stop drift between the legacy engine and the new compiler.

## Issue Count

9 issues across 5 dependency waves.

## Dependency Graph

```
Wave 1: Issue 1
Wave 2: Issue 2 → Issue 3 → Issue 4   (sequential, same file)
Wave 3: Issue 5 → Issue 6              (sequential, same file)
Wave 4: Issue 7
Wave 5: Issue 8, Issue 9               (parallel — different files)
```

---

## Issue 1: Define BlockOverrides type + Zod schema

### Context

The simulator action currently accepts `{ brand, messages }`. We need to extend it to optionally carry the user's in-flight edits to the active block's Goal/Guidance. A shared type + Zod schema keeps the client, server action, and compile function aligned.

### Behavior to test

When `BlockOverridesSchema` parses a valid object with `activeBlockType` and optional `goal`/`guidance` strings, then it returns `{success: true, data}` with the fields preserved; when it parses an object with extra fields or wrong types, then it rejects.

### Acceptance criteria

- [ ] Schema accepts `{ activeBlockType: 'opening' }` alone (no overrides)
- [ ] Schema accepts `{ activeBlockType: 'opening', goal: 'Ask for city' }`
- [ ] Schema rejects `{ activeBlockType: 'not-a-block' }` (enum check)
- [ ] Schema rejects `{ activeBlockType: 'opening', goal: 123 }` (type check)
- [ ] Schema accepts absent `BlockOverrides` entirely (whole object is optional on parent schema)

### Test sketch

```typescript
import { BlockOverridesSchema } from '../schemas'

describe('BlockOverridesSchema', () => {
  it('accepts activeBlockType alone', () => {
    const r = BlockOverridesSchema.safeParse({ activeBlockType: 'opening' })
    expect(r.success).toBe(true)
  })

  it('accepts activeBlockType with goal override', () => {
    const r = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      goal: 'Ask for city',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.goal).toBe('Ask for city')
  })

  it('rejects unknown block type', () => {
    const r = BlockOverridesSchema.safeParse({ activeBlockType: 'bogus' })
    expect(r.success).toBe(false)
  })

  it('rejects non-string goal', () => {
    const r = BlockOverridesSchema.safeParse({
      activeBlockType: 'opening',
      goal: 123,
    })
    expect(r.success).toBe(false)
  })
})
```

### Files

- CREATE: `src/lib/prompts/compile-block/schemas.ts` — `BlockOverridesSchema` + type export
- CREATE: `src/lib/prompts/compile-block/__tests__/schemas.test.ts` — schema test

### Dependencies

- Blocked by: none
- Blocks: Issue 2, Issue 5

### Type

feature

---

## Issue 2: compileBlock with no overrides is byte-identical to buildSystemPrompt

### Context

This is the **contract test** — the single load-bearing invariant of the whole wiring effort. If `compileBlock(undefined)` ever diverges from `buildSystemPrompt()`, the feature flag becomes unsafe to flip and the whole effort is compromised. This issue establishes that invariant first, before any overrides are added.

### Behavior to test

When `compileBlock()` is called with no `BlockOverrides` argument (or with `undefined`), then the returned string equals `buildSystemPrompt({ brandName, bookingUrl })` character-for-character for every brand + bookingUrl combination the test iterates over.

### Acceptance criteria

- [ ] `compileBlock({ brand: 'VendingPreneurs' })` === `buildSystemPrompt({ brandName: 'VendingPreneurs' })`
- [ ] `compileBlock({ brand: 'VendingPreneurs', bookingUrl: 'https://x.y' })` === `buildSystemPrompt({ brandName: 'VendingPreneurs', bookingUrl: 'https://x.y' })`
- [ ] `compileBlock({ brand: 'VendingPreneurs', overrides: undefined })` === `buildSystemPrompt(...)` (explicit undefined)
- [ ] Byte comparison — not trimmed, not normalised — strict equality

### Test sketch

```typescript
import { compileBlock } from '../compile-block'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'

const BRAND = 'VendingPreneurs'
const URL = 'https://calendly.com/x'

describe('compileBlock — contract (no overrides)', () => {
  it('matches buildSystemPrompt byte-for-byte without bookingUrl', () => {
    expect(compileBlock({ brand: BRAND })).toBe(
      buildSystemPrompt({ brandName: BRAND })
    )
  })

  it('matches buildSystemPrompt byte-for-byte with bookingUrl', () => {
    expect(compileBlock({ brand: BRAND, bookingUrl: URL })).toBe(
      buildSystemPrompt({ brandName: BRAND, bookingUrl: URL })
    )
  })

  it('explicit undefined overrides is identical to omitted overrides', () => {
    expect(
      compileBlock({ brand: BRAND, bookingUrl: URL, overrides: undefined })
    ).toBe(buildSystemPrompt({ brandName: BRAND, bookingUrl: URL }))
  })
})
```

### Files

- CREATE: `src/lib/prompts/compile-block/compile-block.ts` — `compileBlock({brand, bookingUrl, overrides?})` initial implementation: delegates to `buildSystemPrompt` when overrides absent
- CREATE: `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — the byte-identity test

### Dependencies

- Blocked by: Issue 1
- Blocks: Issue 3, Issue 8

### Type

feature

---

## Issue 3: compileBlock appends Active Block Directive when activeBlockType is set

### Context

When the user is editing a specific block in the inspector, the simulator should make Claude aware of that block's current goal/guidance — otherwise edits are invisible to Claude. Appending an "Active Block Directive" section preserves the rest of the prompt unchanged and is the least-invasive way to inject block-scoped context.

### Behavior to test

When `compileBlock()` is called with `overrides: { activeBlockType: 'opening' }` and no goal/guidance overrides, then the returned string equals `buildSystemPrompt(...)` plus an appended `## Active Block Directive` section that cites the _default_ goal and guidance for `opening` (pulled from `BLOCK_GOALS`/`BLOCK_GUIDANCE`).

### Acceptance criteria

- [ ] Output starts with the exact current `buildSystemPrompt()` output (prefix-equal)
- [ ] Output ends with a section containing heading `## Active Block Directive`
- [ ] Directive section contains `Block: Opening`
- [ ] Directive section contains the default `BLOCK_GOALS.opening` text verbatim
- [ ] Directive section contains the default `BLOCK_GUIDANCE.opening` text verbatim
- [ ] When `activeBlockType: 'qualifier'`, directive uses `qualifier` defaults (not opening's)

### Test sketch

```typescript
import { compileBlock } from '../compile-block'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'

const BRAND = 'VendingPreneurs'

describe('compileBlock — active block directive (no overrides)', () => {
  it('appends a directive section to the baseline prompt', () => {
    const baseline = buildSystemPrompt({ brandName: BRAND })
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled.startsWith(baseline)).toBe(true)
    expect(compiled).toContain('## Active Block Directive')
    expect(compiled).toContain('Block: Opening')
  })

  it('uses the default goal for the selected block type', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'opening' },
    })
    expect(compiled).toContain(
      'Greet warmly, detect initial interest, and ask for location as the first qualifier.'
    )
  })

  it('uses qualifier defaults when activeBlockType is qualifier', () => {
    const compiled = compileBlock({
      brand: BRAND,
      overrides: { activeBlockType: 'qualifier' },
    })
    expect(compiled).toContain('Block: Qualifier')
    expect(compiled).toContain('Collect at least two of five qualifiers')
  })
})
```

### Files

- MODIFY: `src/lib/prompts/compile-block/compile-block.ts` — append directive when `activeBlockType` present; pull defaults from `BLOCK_GOALS`/`BLOCK_GUIDANCE` in `block-sections.ts`
- MODIFY: `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — add this describe block (same file so we don't fragment the contract)

### Dependencies

- Blocked by: Issue 2
- Blocks: Issue 4

### Type

feature

---

## Issue 4: compileBlock uses override.goal and override.guidance when provided

### Context

The whole point of the feature: edits in the inspector reach Claude. This issue turns overrides into actual prompt changes.

### Behavior to test

When `compileBlock()` is called with `overrides: { activeBlockType: 'opening', goal: '...', guidance: '...' }`, then the Active Block Directive uses the provided override strings instead of `BLOCK_GOALS`/`BLOCK_GUIDANCE`; when an override field is absent or empty-string, then the directive falls back to the default.

### Acceptance criteria

- [ ] When `overrides.goal = 'Ask for city'`, directive contains `'Ask for city'` and NOT the default opening goal
- [ ] When `overrides.guidance = 'Only one question'`, directive contains `'Only one question'` and NOT the default opening guidance
- [ ] When `overrides.goal` is absent, directive falls back to the default
- [ ] When `overrides.goal = ''` (empty string), directive falls back to the default (treat empty as absent)
- [ ] Contract test from Issue 2 still passes (overrides-absent path unchanged)

### Test sketch

```typescript
describe('compileBlock — goal/guidance overrides', () => {
  it('replaces default goal with override.goal', () => {
    const compiled = compileBlock({
      brand: 'VendingPreneurs',
      overrides: { activeBlockType: 'opening', goal: 'Ask for city' },
    })
    expect(compiled).toContain('Ask for city')
    expect(compiled).not.toContain(
      'Greet warmly, detect initial interest, and ask for location'
    )
  })

  it('falls back to default goal when override.goal is empty string', () => {
    const compiled = compileBlock({
      brand: 'VendingPreneurs',
      overrides: { activeBlockType: 'opening', goal: '' },
    })
    expect(compiled).toContain('Greet warmly, detect initial interest')
  })

  it('replaces default guidance with override.guidance', () => {
    const compiled = compileBlock({
      brand: 'VendingPreneurs',
      overrides: {
        activeBlockType: 'opening',
        guidance: 'Only one question, peer-to-peer tone.',
      },
    })
    expect(compiled).toContain('Only one question, peer-to-peer tone.')
  })
})
```

### Files

- MODIFY: `src/lib/prompts/compile-block/compile-block.ts` — apply override values when truthy; retain defaults otherwise
- MODIFY: `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — override describe block

### Dependencies

- Blocked by: Issue 3
- Blocks: Issue 6

### Type

feature

---

## Issue 5: simulateReplyAction accepts optional activeBlockType + blockOverrides input

### Context

The server action's input schema needs the new fields before the compile path can be wired. This issue is input-validation only — behaviour stays unchanged for now (the new fields are accepted and ignored).

### Behavior to test

When `simulateReplyAction` is called with extended input `{ brand, messages, overrides: { activeBlockType, goal, guidance } }`, then Zod parsing succeeds and the function executes (returning the same reply it would without overrides); when called with malformed overrides, then it returns `{ success: false, error: 'Invalid simulator input' }`.

### Acceptance criteria

- [ ] Action accepts input with `overrides: { activeBlockType: 'opening' }` and returns `success: true`
- [ ] Action accepts input WITHOUT `overrides` (backwards compatible) and returns `success: true`
- [ ] Action returns `{ success: false, error: 'Invalid simulator input' }` when `overrides.activeBlockType` is an unknown enum
- [ ] Action returns `{ success: false, error: 'Invalid simulator input' }` when `overrides.goal` is a number

### Test sketch

```typescript
import { simulateReplyAction } from '../simulator-actions'

// Mock Anthropic SDK at module level so we don't hit the real API.
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end_turn',
      }),
    },
  })),
}))

describe('simulateReplyAction — input schema', () => {
  it('accepts overrides.activeBlockType', async () => {
    const r = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening' },
    })
    expect(r.success).toBe(true)
  })

  it('rejects unknown block type', async () => {
    const r = await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'bogus' },
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toBe('Invalid simulator input')
  })
})
```

### Files

- MODIFY: `src/app/dashboard/flows/[flowId]/directions/b-stage/simulator-actions.ts` — extend `inputSchema` with `overrides: BlockOverridesSchema.optional()` [boundary: third-party — Anthropic SDK]
- CREATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-actions.test.ts` — schema + happy-path test with mocked SDK

### Dependencies

- Blocked by: Issue 1
- Blocks: Issue 6

### Type

refactor

---

## Issue 6: simulateReplyAction uses compileBlock behind NEXT_PUBLIC_FLOW_COMPILE flag

### Context

With the compile function proven and the input schema extended, this issue flips the switch. The flag is read at action invocation (so dev can toggle by restarting with env set) and defaults to off — meaning the change is a no-op in every environment that hasn't opted in.

### Behavior to test

When `NEXT_PUBLIC_FLOW_COMPILE=true` and the input includes `overrides`, then the system prompt sent to Claude is produced by `compileBlock()`; when the flag is absent/false, then the system prompt is produced by `buildSystemPrompt()` (legacy path, byte-identical to today).

### Acceptance criteria

- [ ] Flag off → `buildSystemPrompt` spy is called; `compileBlock` spy is NOT called
- [ ] Flag on + overrides present → `compileBlock` spy is called with the overrides
- [ ] Flag on + NO overrides → `compileBlock` spy is called with `overrides: undefined` (which must still produce byte-identical output per Issue 2's contract)
- [ ] Explicit `NEXT_PUBLIC_FLOW_COMPILE=false` is treated as off (not truthy string check)

### Test sketch

```typescript
import * as compileBlockModule from '@/lib/prompts/compile-block/compile-block'
import * as setterV2 from '@/lib/prompts/setter-v2'

describe('simulateReplyAction — compile flag routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses buildSystemPrompt when flag is off', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'false'
    const buildSpy = vi.spyOn(setterV2, 'buildSystemPrompt')
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')
    await simulateReplyAction({
      brand: 'X',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening' },
    })
    expect(buildSpy).toHaveBeenCalled()
    expect(compileSpy).not.toHaveBeenCalled()
  })

  it('uses compileBlock when flag is on', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'true'
    const compileSpy = vi.spyOn(compileBlockModule, 'compileBlock')
    await simulateReplyAction({
      brand: 'X',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: { activeBlockType: 'opening', goal: 'Ask for city' },
    })
    expect(compileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: expect.objectContaining({ goal: 'Ask for city' }),
      })
    )
  })
})
```

### Files

- MODIFY: `src/app/dashboard/flows/[flowId]/directions/b-stage/simulator-actions.ts` — read `process.env.NEXT_PUBLIC_FLOW_COMPILE === 'true'`, branch to `compileBlock` or `buildSystemPrompt` [boundary: third-party — env]
- MODIFY: `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-actions.test.ts` — add flag-routing describe block

### Dependencies

- Blocked by: Issue 4, Issue 5
- Blocks: Issue 7, Issue 9

### Type

feature

---

## Issue 7: Simulator panel sends active block's edited goal/guidance to the action

### Context

Client plumbing: the `sim-float.tsx` simulator panel needs to know which block is currently selected in the inspector and what its in-flight goal/guidance values are, then pass them in the action call. Without this, the server action always receives no overrides and the UX remains broken.

### Behavior to test

When the user has the Opening block selected with an edited goal and opens the simulator, then the `simulateReplyAction` call includes `overrides: { activeBlockType: 'opening', goal: '<edited text>', guidance: '<edited text>' }`; when no block is selected, then `overrides` is omitted entirely.

### Acceptance criteria

- [ ] With a selected block and edited goal, action call args contain `overrides.goal` equal to the edited value
- [ ] With a selected block and edited guidance, action call args contain `overrides.guidance` equal to the edited value
- [ ] With a selected block but no edits, `overrides` includes `activeBlockType` and omits `goal`/`guidance` (or sends empty strings which Issue 4 treats as absent)
- [ ] With no selected block, action is called without an `overrides` key

### Test sketch

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimFloat } from '../sim-float'

const actionSpy = vi.fn().mockResolvedValue({
  success: true,
  data: { replyText: 'ok', toolCalls: [], truncated: false },
})
vi.mock('../simulator-actions', () => ({
  simulateReplyAction: (...args) => actionSpy(...args),
}))

describe('SimFloat — overrides pass-through', () => {
  it('sends edited goal as overrides.goal', async () => {
    render(
      <SimFloat
        brand="VendingPreneurs"
        activeBlock={{ type: 'opening', goal: 'Ask for city', guidance: '' }}
      />
    )
    await userEvent.type(
      screen.getByPlaceholderText(/type as prospect/i),
      'hello'
    )
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(actionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: expect.objectContaining({
          activeBlockType: 'opening',
          goal: 'Ask for city',
        }),
      })
    )
  })

  it('omits overrides when no block is active', async () => {
    render(<SimFloat brand="VendingPreneurs" activeBlock={null} />)
    await userEvent.type(screen.getByPlaceholderText(/type/i), 'hi')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    const lastCall = actionSpy.mock.calls[actionSpy.mock.calls.length - 1]?.[0]
    expect(lastCall).not.toHaveProperty('overrides')
  })
})
```

### Files

- MODIFY: `src/app/dashboard/flows/[flowId]/directions/b-stage/sim-float.tsx` — accept `activeBlock` prop, thread into action call
- MODIFY: the parent component that renders `SimFloat` (inspector or flow-page) to pass the current selection — find via grep for `<SimFloat`
- CREATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/sim-float.test.tsx` — prop-pass test

### Dependencies

- Blocked by: Issue 6
- Blocks: Issue 9

### Type

feature

---

## Issue 8: Contract test locked into the CI-visible test suite

### Context

The byte-identity contract from Issue 2 is the single invariant that keeps this feature safe. It needs a stable, discoverable location and to run on every PR — otherwise a well-meaning refactor can silently break it. This issue is the "mandatory regression gate" that ROLLOUT.md calls for.

### Behavior to test

The contract test exists at `compile-block.contract.test.ts`, is included by Vitest's default glob (so `npm run test` runs it), and asserts `compileBlock(omit overrides)` === `buildSystemPrompt(...)` across all 8 block types' implicit default paths.

### Acceptance criteria

- [ ] Test file lives at `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
- [ ] `npm run test -- compile-block.contract` discovers and runs the test
- [ ] Test iterates over all 8 block types and asserts byte-identity with no overrides
- [ ] Test iterates over `{bookingUrl: undefined}` and `{bookingUrl: 'https://x.y'}` cases
- [ ] Test fails if any block type's default path diverges from `buildSystemPrompt`

### Test sketch

```typescript
import { compileBlock } from '../compile-block'
import { buildSystemPrompt } from '@/lib/prompts/setter-v2'
import type { BlockType } from '@/app/dashboard/flows/[flowId]/types'

const TYPES: BlockType[] = [
  'opening',
  'qualifier',
  'objection',
  'booking',
  'email',
  'followup',
  'escalation',
  'summary',
]
const URLS = [undefined, 'https://calendly.com/vending']

describe('compileBlock contract — no overrides matches buildSystemPrompt', () => {
  for (const bookingUrl of URLS) {
    it(`matches baseline with bookingUrl=${bookingUrl ?? 'undefined'}`, () => {
      const baseline = buildSystemPrompt({
        brandName: 'VendingPreneurs',
        ...(bookingUrl ? { bookingUrl } : {}),
      })
      expect(
        compileBlock({
          brand: 'VendingPreneurs',
          ...(bookingUrl ? { bookingUrl } : {}),
        })
      ).toBe(baseline)
    })
  }
})
```

### Files

- MODIFY: `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — consolidate the contract assertions (may overlap with Issue 2; merge if file was already created there)

### Dependencies

- Blocked by: Issue 2
- Blocks: Issue 9

### Type

refactor

---

## Issue 9: End-to-end smoke — edited goal in inspector changes the simulator reply

### Context

Functional closure. Issues 1-8 prove the machinery; this one proves the user-visible behaviour. It's the test the original prospect case would have failed ("ask for city" in UI → reply still says "area"). We don't hit the real Claude API — we spy on the `anthropic.messages.create` call and assert the system prompt contains the edited text when the flag is on.

### Behavior to test

When `NEXT_PUBLIC_FLOW_COMPILE=true`, the user edits the Opening block's goal to `"Greet warmly and ask for their city."`, and then sends a message through the simulator, then the `system` string in the Claude API call contains the edited goal; when the flag is off, then the system string does NOT contain the edited goal (it uses the hardcoded default).

### Acceptance criteria

- [ ] Flag on + edited goal → Anthropic SDK called with `system` containing the edited goal text
- [ ] Flag on + edited goal → Anthropic SDK called with `system` containing `## Active Block Directive`
- [ ] Flag off + edited goal → Anthropic SDK called with `system` NOT containing the edited goal text
- [ ] Flag off + edited goal → Anthropic SDK called with `system` NOT containing `## Active Block Directive`

### Test sketch

```typescript
const createSpy = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'ok' }],
  stop_reason: 'end_turn',
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: createSpy },
  })),
}))

describe('end-to-end — edited goal reaches Claude', () => {
  it('flag on: edited goal appears in system prompt', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'true'
    await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: {
        activeBlockType: 'opening',
        goal: 'Greet warmly and ask for their city.',
      },
    })
    const { system } = createSpy.mock.calls.at(-1)![0]
    expect(system).toContain('Greet warmly and ask for their city.')
    expect(system).toContain('## Active Block Directive')
  })

  it('flag off: edited goal does NOT appear in system prompt', async () => {
    process.env.NEXT_PUBLIC_FLOW_COMPILE = 'false'
    createSpy.mockClear()
    await simulateReplyAction({
      brand: 'VendingPreneurs',
      messages: [{ role: 'user', content: 'hi' }],
      overrides: {
        activeBlockType: 'opening',
        goal: 'Greet warmly and ask for their city.',
      },
    })
    const { system } = createSpy.mock.calls.at(-1)![0]
    expect(system).not.toContain('Greet warmly and ask for their city.')
    expect(system).not.toContain('## Active Block Directive')
  })
})
```

### Files

- MODIFY: `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-actions.test.ts` — add end-to-end describe block [boundary: third-party — mocked Anthropic SDK]

### Dependencies

- Blocked by: Issue 6, Issue 7, Issue 8
- Blocks: none

### Type

feature

---

## Out of scope (deferred)

- **DB persistence** (`ins_flow_versions`, `ins_feature_flags`) — Week 5-6 work per ROLLOUT.md.
- **Live DM runtime cutover** — Week 7 work; requires shadow mode + per-brand gating.
- **Overrides for captures, branches, triggers, examples** — v2 of the compiler.
- **Server-side flag read** (instead of env var) — needed before the first prod cutover, but not for the simulator path.
- **Clearing the "Unsaved changes" pill** after revert/save — separate UX concern.
