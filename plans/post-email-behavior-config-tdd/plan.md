# TDD Plan: Configurable Post-Email Behavior

## Overview

The Email Capture block currently exposes the post-email confirmation behavior in the Flow Builder, but the actual copy is hardcoded in `src/lib/prompts/sections/email-capture.ts` and rendered read-only in the block panel. This plan moves the safe, operator-owned parts of post-email behavior into persisted Flow Builder config while keeping the safety-critical mechanics in code.

Scope is deliberately staged:

- **Draft first** - Sofia can edit the behavior in Flow Builder and the draft persists in `ins_flow_drafts`.
- **Simulator first** - edited post-email behavior changes simulator output before it affects live Instagram traffic.
- **Live later** - the live SendPulse/Claude engine keeps using the hardcoded prompt until published-flow config is wired into `processInboundMessage`.
- **Safety rules stay hardcoded** - `capture_email`, no early email ask, no asking during unresolved objections, and no false delivery promise remain code-owned.

The load-bearing invariant is that operator config can change the post-email wording without weakening email capture rules or making the bot promise to send resources that are not configured.

## Issue Count

8 issues across 5 dependency waves.

## Dependency Graph

```text
Wave 1: Issue 1
Wave 2: Issue 2 -> Issue 3
Wave 3: Issue 4 -> Issue 5
Wave 4: Issue 6, Issue 7
Wave 5: Issue 8
```

---

## Issue 1: Define post-email behavior config type

### Context

We need a small typed config object for the parts of post-email behavior an operator can safely control. This should not expose the mandatory `capture_email` tool behavior or global timing rules.

### Behavior to test

When the schema parses valid post-email config, it preserves confirmation copy, delivery mode, resource label, and next step. When fields are invalid or unsafe, it rejects them.

### Acceptance criteria

- [ ] Schema accepts a valid default config.
- [ ] Schema requires a non-empty `confirmationMessage`.
- [ ] Schema accepts `deliveryMode: 'none' | 'manual' | 'customerio' | 'close' | 'webhook'`.
- [ ] Schema accepts `resourceLabel: null` when no asset is live.
- [ ] Schema accepts `nextStep: 'summary' | 'booking' | 'nurture' | 'human_review'`.
- [ ] Schema rejects unknown delivery modes and next steps.
- [ ] Default copy must not contain "right now" or "within a few minutes" when `deliveryMode` is `none`.

### Test sketch

```typescript
import {
  DEFAULT_POST_EMAIL_BEHAVIOR,
  PostEmailBehaviorSchema,
} from '../post-email-behavior'

describe('PostEmailBehaviorSchema', () => {
  it('accepts the default config', () => {
    expect(
      PostEmailBehaviorSchema.safeParse(DEFAULT_POST_EMAIL_BEHAVIOR).success
    ).toBe(true)
  })

  it('rejects empty confirmation copy', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      confirmationMessage: '',
    })
    expect(result.success).toBe(false)
  })

  it('prevents immediate-send promises when nothing is configured to send', () => {
    const result = PostEmailBehaviorSchema.safeParse({
      ...DEFAULT_POST_EMAIL_BEHAVIOR,
      deliveryMode: 'none',
      confirmationMessage: "Got it, I'll send that right now.",
    })
    expect(result.success).toBe(false)
  })
})
```

### Files

- CREATE: `src/lib/prompts/post-email-behavior.ts`
- CREATE: `src/lib/prompts/__tests__/post-email-behavior.test.ts`

### Dependencies

- Blocked by: none
- Blocks: Issues 2, 3, 4

### Type

feature

---

## Issue 2: Make email-capture prompt accept configurable post-email behavior

### Context

`buildEmailCapture()` currently hardcodes the confirmation loop. It should accept an optional `postEmailBehavior` object and render the configured confirmation message while preserving the locked rules.

### Behavior to test

When `buildEmailCapture()` receives no config, output remains backwards-compatible with the safe default. When it receives valid config, the `Confirmation Loop` section uses that copy and includes delivery context without removing mandatory `capture_email` instructions.

### Acceptance criteria

- [ ] No-config output contains the safe default confirmation copy.
- [ ] Custom `confirmationMessage` appears in the `Confirmation Loop` section.
- [ ] `capture_email` instruction is still present for all configs.
- [ ] "Never ask for email as the first or second message" remains present.
- [ ] `deliveryMode: none` copy does not promise automatic sending.
- [ ] `deliveryMode: customerio` can mention the configured `resourceLabel`.

### Test sketch

```typescript
import { buildEmailCapture } from '../sections/email-capture'

describe('buildEmailCapture post-email behavior', () => {
  it('renders custom confirmation copy', () => {
    const prompt = buildEmailCapture('https://booking.test', {
      confirmationMessage:
        "Got it, I've saved that email for the call details.",
      resourceLabel: null,
      deliveryMode: 'none',
      nextStep: 'summary',
    })

    expect(prompt).toContain(
      "Got it, I've saved that email for the call details."
    )
    expect(prompt).toContain('Always call the capture_email tool')
  })
})
```

### Files

- UPDATE: `src/lib/prompts/sections/email-capture.ts`
- UPDATE: `src/lib/prompts/__tests__/setter-v2.test.ts`
- CREATE or UPDATE: focused tests for `buildEmailCapture`

### Dependencies

- Blocked by: Issue 1
- Blocks: Issues 4, 7

### Type

feature

---

## Issue 3: Add post-email behavior to Flow Builder block config

### Context

The Email Capture block currently parses hardcoded prompt text into `EmailConfig`. We need to add a structured `postEmailBehavior` field to `EmailConfig` and seed it from defaults.

### Behavior to test

When `deriveBlock(brand, 'email')` runs, the returned Email Capture block has a valid `postEmailBehavior` object with safe default copy.

### Acceptance criteria

- [ ] `EmailConfig` includes `postEmailBehavior`.
- [ ] `deriveBlock(..., 'email')` returns default post-email behavior.
- [ ] Existing trigger parsing still works.
- [ ] Existing confirmation script can remain for backwards display compatibility or be mapped from `postEmailBehavior.confirmationMessage`.

### Test sketch

```typescript
import { deriveBlock } from '../block-sections'

it('email block includes post-email behavior config', () => {
  const block = deriveBlock('VendingPreneurs', 'email')
  expect(block.blockConfig.kind).toBe('email')
  if (block.blockConfig.kind === 'email') {
    expect(block.blockConfig.postEmailBehavior.confirmationMessage).toContain(
      'saved'
    )
    expect(block.blockConfig.postEmailBehavior.deliveryMode).toBe('none')
  }
})
```

### Files

- UPDATE: `src/app/dashboard/flows/[flowId]/types.ts`
- UPDATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/block-sections.ts`
- UPDATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/block-sections.test.ts`

### Dependencies

- Blocked by: Issue 1
- Blocks: Issues 4, 5

### Type

feature

---

## Issue 4: Persist post-email behavior in Flow Builder drafts

### Context

Anything operator-owned and expected to survive reloads must be database-backed. The first persistence target should be the existing `ins_flow_drafts.state` JSON snapshot, not a new table.

### Behavior to test

When a draft containing edited post-email behavior is extracted, normalized, saved, loaded, and hydrated, the config is preserved.

### Acceptance criteria

- [ ] `extractPersistedFlowDraft()` preserves `email.blockConfig.postEmailBehavior`.
- [ ] `normalizePersistedFlowDraft()` backfills defaults for older drafts missing the field.
- [ ] `FLOW_DRAFT_SCHEMA` is bumped if needed.
- [ ] Hydration does not drop post-email behavior.
- [ ] Existing suspect draft cleanup still works.

### Test sketch

```typescript
import {
  extractPersistedFlowDraft,
  normalizePersistedFlowDraft,
} from '../draft-persistence'

it('preserves email post-email behavior in persisted drafts', () => {
  const draft = buildDraftWithPostEmailCopy('Custom confirmation')
  const persisted = extractPersistedFlowDraft(draft)
  const email = persisted.flow.nodes.find((node) => node.id === 'email')
  expect(email?.blockConfig?.kind).toBe('email')
  if (email?.blockConfig?.kind === 'email') {
    expect(email.blockConfig.postEmailBehavior.confirmationMessage).toBe(
      'Custom confirmation'
    )
  }
})
```

### Files

- UPDATE: `src/app/dashboard/flows/[flowId]/draft-persistence.ts`
- UPDATE: `src/app/dashboard/flows/[flowId]/__tests__/flow-helpers.test.ts`
- UPDATE: `src/app/dashboard/flows/[flowId]/__tests__/store.test.ts`

### Dependencies

- Blocked by: Issues 1, 2, 3
- Blocks: Issue 5

### Type

feature

---

## Issue 5: Add editable Email Capture UI for after-email behavior

### Context

The Flow Builder currently renders the confirmation loop with `ReadOnlyText`. Sofia needs a safe editable field for the post-email message, plus visible context about whether anything is actually being sent.

### Behavior to test

When the Email Capture panel renders, the post-email confirmation field is editable. Editing it dispatches a block config update and marks the draft dirty.

### Acceptance criteria

- [ ] Email Capture panel shows an editable `After email is captured` text area.
- [ ] Panel shows delivery mode, resource label, and next step controls.
- [ ] `deliveryMode: none` shows copy that no automatic delivery is live.
- [ ] Saving is handled by existing draft sync after state changes.
- [ ] The old read-only confirmation loop is removed or clearly replaced.
- [ ] Invalid immediate-send promises are blocked or surfaced as validation errors.

### Test sketch

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('edits post-email confirmation copy', async () => {
  render(<EmailPanel config={config} onChange={onChange} />)

  await userEvent.clear(screen.getByLabelText(/after email is captured/i))
  await userEvent.type(
    screen.getByLabelText(/after email is captured/i),
    "Got it, I've saved that email."
  )

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      postEmailBehavior: expect.objectContaining({
        confirmationMessage: "Got it, I've saved that email.",
      }),
    })
  )
})
```

### Files

- UPDATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/block-panels/email.tsx`
- UPDATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/block-config-panel.tsx`
- UPDATE: `src/app/dashboard/flows/[flowId]/store.tsx`
- CREATE or UPDATE: component tests for EmailPanel

### Dependencies

- Blocked by: Issues 3, 4
- Blocks: Issue 6

### Type

feature

---

## Issue 6: Wire post-email behavior into simulator compile overrides

### Context

Before live traffic can use this config, the simulator should prove it. The selected Email Capture block's post-email behavior should be included in simulator overrides and appended into the compiled prompt.

### Behavior to test

When the selected block is Email Capture and its post-email behavior differs from the baseline, simulator overrides include it. `compileBlock()` renders it into the Active Block Directive or section override.

### Acceptance criteria

- [ ] `buildSimulatorOverrides()` includes changed post-email behavior for the email block.
- [ ] Unchanged default post-email behavior is omitted from overrides.
- [ ] `BlockOverridesSchema` validates the post-email override.
- [ ] `compileBlock()` includes custom post-email copy.
- [ ] No-overrides contract remains byte-identical to `buildSystemPrompt()`.

### Test sketch

```typescript
it('passes edited post-email behavior through simulator overrides', () => {
  const overrides = buildSimulatorOverrides({
    selectedBlock: emailBlockWithCustomPostEmail,
    brand: 'VendingPreneurs',
    triggers: [],
  })

  expect(overrides?.postEmailBehavior?.confirmationMessage).toBe(
    "Got it, I've saved that email."
  )
})
```

### Files

- UPDATE: `src/lib/prompts/compile-block/schemas.ts`
- UPDATE: `src/lib/prompts/compile-block/compile-block.ts`
- UPDATE: `src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
- UPDATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/simulator-overrides.ts`
- UPDATE: `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-overrides.test.ts`

### Dependencies

- Blocked by: Issue 5
- Blocks: Issue 8

### Type

feature

---

## Issue 7: Keep live engine hardcoded until published config is available

### Context

The live engine currently calls `buildSystemPrompt()` directly. We should explicitly test that this feature does not silently alter live Instagram traffic before the publish pipeline is ready.

### Behavior to test

When `processInboundMessage()` builds the prompt, it does not load draft Flow Builder config. It continues using the current code-owned prompt unless a future published config is explicitly supplied.

### Acceptance criteria

- [ ] No draft table lookup is added to live inbound processing.
- [ ] Existing `processInboundMessage` prompt-building tests still pass.
- [ ] The plan/doc clearly labels live wiring as later work.
- [ ] No production behavior depends on unreviewed draft config.

### Files

- UPDATE: `src/lib/services/__tests__/engine.test.ts` if necessary
- UPDATE: `docs/sofia-feedback-priorities.md` or this plan if implementation notes change

### Dependencies

- Blocked by: Issue 2
- Blocks: Issue 8

### Type

safety

---

## Issue 8: Document live-publish follow-up path

### Context

Draft persistence is not the same as production config. We need to capture the later production architecture before anyone assumes Sofia's draft edits are live.

### Behavior to test

Docs should make the split explicit: draft config is saved in `ins_flow_drafts`, simulator uses draft config, live engine requires a published snapshot path before using it.

### Acceptance criteria

- [ ] Add a short implementation note to the plan or Flow Builder docs.
- [ ] Explain draft versus published versus live engine behavior.
- [ ] Note that a future migration should create immutable published snapshots if existing draft versions are not enough.
- [ ] Note rollback requirement for live post-email behavior.

### Files

- UPDATE: `plans/post-email-behavior-config-tdd/plan.md`
- OPTIONALLY UPDATE: `docs/flow-builder/FUTURE.md`

### Dependencies

- Blocked by: Issues 6, 7

### Type

docs

---

## Out Of Scope For This Plan

- Customer.io integration.
- Close CRM lead status badges.
- Actually sending emails, lead magnets, or prep resources.
- Making draft edits affect live Instagram traffic.
- Full prompt section replacement for every Flow Builder block.
- New immutable published-flow database tables.

## Live Publish Follow-Up

This TDD slice deliberately stops at draft persistence and simulator compile
overrides. The draft post-email behavior is saved in `ins_flow_drafts.state`,
and the simulator can use that draft value to prove prompt behavior before
production rollout. The live SendPulse/Claude inbound engine still builds its
system prompt from code-owned defaults through `processMessage()` and
`buildSystemPrompt()`.

Before live Instagram traffic can use operator-edited post-email behavior, the
publish path needs an explicit reviewed snapshot boundary. A future migration
should either promote the relevant draft version into an immutable published
snapshot or add a separate published-flow config table with versioned rows. That
live snapshot must support rollback, so post-email copy can be reverted with the
same confidence as any other production prompt change.

## Verification Gates

Run focused tests first:

```bash
npx vitest run src/lib/prompts/__tests__/post-email-behavior.test.ts
npx vitest run src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/block-sections.test.ts
npx vitest run src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/simulator-overrides.test.ts
npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts
```

Then run broader gates:

```bash
npm run build
```

If UI changes are made, also verify manually in the Flow Builder:

1. Open the Email Capture block.
2. Edit the after-email confirmation copy.
3. Confirm the draft status moves to pending/saved.
4. Reload the page and confirm the edited copy persists.
5. Run the simulator with the Email Capture block selected and confirm the custom post-email behavior influences the reply.
