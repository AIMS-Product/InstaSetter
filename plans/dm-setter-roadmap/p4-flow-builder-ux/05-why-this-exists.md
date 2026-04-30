# [P4.05] Decide the fate of the "Why this exists" rationale panel

**Status:** open
**Phase:** 4 — Flow Builder operator UX
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385389843530
**Owner:** unassigned
**Depends on:** none
**Blocks:** none directly. Decision feeds into a possible doc-only follow-up.
**Risk:** low (presentation only, instrumentation-driven decision)
**Rough size:** S (under a day to ship the variants + flag; the _decision_ itself takes a week of Sofia's usage)

> **This is a DECISION-frame spec, not a build-frame spec.**
> The deliverable is not "make the panel better" — it's "instrument three states + define the signal that closes the decision." The implementing agent ships the experiment harness; James + Sofia close the loop.

## Problem

From `docs/sofia-feedback-priorities.md`, Priority 3, fifth row:

> **Decide whether `Why this exists` is useful** — "The section may help explain the system, but could also add clutter." → "Keep, collapse, rename, or hide based on Sofia's first independent review."

Today the Flow Builder has two distinct "Why" surfaces:

1. **`RationaleBanner`** (`src/app/dashboard/flows/[flowId]/directions/b-stage/rationale-banner.tsx`) — appears inside the `Design` tab of the inspector, wrapped in a `CollapsibleSection` titled `Why This Exists` (`inspector.tsx` lines 257-259). Closed by default. Lists 2-4 insights from analyzed conversations + an optional stat (e.g. "3,619 analyzed conversations" — `block-sections.ts` lines 50-65).
2. **`Rationale` block** inside `PromptReader` (`src/app/dashboard/flows/[flowId]/directions/b-stage/prompt-reader.tsx` lines 82-157, mounted at line 247). Rendered as a sticky aside above the prompt body. Shows the same `stat` + `insights`, accessible only via "View prompt" button.

The data behind both is the same `SectionRationale` type (`block-sections.ts` lines 27-30) — the rationale is computed once, displayed twice with different styling.

Today's commit `b47f464 fix(flow-builder): strip engineering jargon from customer-facing copy` didn't touch this; the panel-name copy already reads in plain English and isn't a P0 trust-leak.

The genuine question is: **does the rationale panel earn its real-estate?**

Three arguments for keeping it:

- Operators new to the system understand _why_ a step exists, which builds trust before they edit.
- The "3,619 analyzed conversations" stat anchors the bot's behaviour in real evidence.
- A non-technical user can explain the bot to their boss using the rationale text.

Three arguments for hiding it:

- It's clutter on a screen that's already dense (canvas + inspector + simulator).
- An operator who has internalized why each block exists doesn't need it on every view.
- The same content lives in `PromptReader` already — it's a duplicate surface.

Sofia's exact words from the walkthrough:

> The section may help explain the system, but could also add clutter.

That's not a "remove it" or "keep it". It's "I don't know yet; I need to use it."

The only honest way to close this is to **ship instrumentation that captures Sofia's real behaviour and let her decide once she's used the workspace independently.**

## Goal — frame as a DECISION

Define the experiment that closes this question.

The **deliverable from the implementing agent** is:

1. A feature flag that gates three variants of the rationale presentation.
2. Lightweight client-side instrumentation that records which variant is rendered and whether the operator engaged with it.
3. A short document (`docs/flow-builder/rationale-decision.md`) that names the success signal and the deadline.

The **deliverable from Sofia + James (out of scope for this spec, but defined here)** is:

- One week of independent Flow Builder usage with the default variant set to `B (collapsed)`.
- A 15-minute review at the end of that week that compares the three variants against the success signal.
- A merged decision PR that switches the flag default to the winning variant, deletes the losing variants' code paths, and updates `docs/flow-builder/rationale-decision.md` with the closing notes.

## Variants

**Simplification rationale (Codex review, 2026-04-29):** the original draft of this spec proposed three variants — `always_on`, `collapsed`, `hidden`. The middle `collapsed` variant added no new signal: it is _today's_ behaviour, the baseline against which the experiment runs. It also added a third code path, a third instrumentation bucket, and a third decision branch — overbuilt for one user (Sofia) on a one-week loop. The decision space is binary: "show it always" vs "remove the inspector duplicate". Today's collapsed-by-default state is captured by leaving the flag unset in dev and shipping `hidden` to prod when we're ready. Two variants are enough.

The implementing agent ships **two variants**, switchable by the flag `NEXT_PUBLIC_FLOW_RATIONALE`:

| Variant | Flag value           | Inspector treatment                                                       | PromptReader treatment                                                 | Notes                                                                               |
| ------- | -------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `A`     | `'always_on'`        | `RationaleBanner` is rendered EXPANDED by default inside the `Design` tab | `Rationale` aside is rendered as today                                 | Maximum visibility. Risk: clutter.                                                  |
| `B`     | `'hidden'` (default) | `RationaleBanner` is NOT rendered in the inspector                        | `Rationale` aside is rendered as today (kept as the dedicated surface) | Removes the inspector duplication. The `PromptReader` aside still carries the data. |

The `Rationale` aside in `PromptReader` is **kept in both variants**. The reasoning lives there; we're only experimenting with the inspector duplicate.

**Choice of default:** `hidden`. The conservative call defaults to less clutter; if Sofia misses the inspector banner, she opens `PromptReader` (one click) and we see `rationale.prompt_reader_opened` rise in the instrumentation, which is itself a signal to flip back to `always_on`.

## Non-goals

- No new content. Insights and stats stay as-is from `block-sections.ts` `SECTION_RATIONALES`.
- No rewrite of the rationale system. The copy is good; the question is _placement_.
- No A/B test infrastructure. We ship a flag + simple per-session instrumentation; the decision is human-driven, not statistical.
- No removal of the `Rationale` aside in `PromptReader`. That surface is the canonical home for the data; the experiment is only about the inspector duplicate.
- No localization.

## Functional requirements

1. New env var `NEXT_PUBLIC_FLOW_RATIONALE` validated via `src/lib/config.ts` Zod schema. Accepts `'always_on' | 'hidden'`. Default `'hidden'`.
2. The inspector reads the flag and chooses the rationale rendering:
   - `always_on`: `RationaleBanner` mounted inside an expanded `CollapsibleSection` (set `defaultOpen={true}`).
   - `hidden`: `RationaleBanner` is not rendered. The `CollapsibleSection` wrapper is also not rendered (no empty heading).
3. `PromptReader` is unchanged across both variants.
4. Instrumentation hook (`useRationaleInstrumentation`) records the following events to a new `src/lib/services/rationale-events.ts` (in-memory + `console.debug` in dev, no DB writes for v0):
   - `rationale.variant_loaded` — fires once per inspector mount with `{ variant, blockType }`.
   - `rationale.expanded` — when the operator clicks the section header (only meaningful in `always_on`; the user can collapse the section locally even though the variant default is open).
   - `rationale.collapsed` — when the operator collapses the section.
   - `rationale.prompt_reader_opened` — when the operator clicks "View prompt" (proxy for "I needed the deeper context"; useful as a comparator).
5. A single dev-only debug surface (`/dashboard/flows/[flowId]/?debug=rationale` query param) shows the latest event counts in a small overlay so QA can verify instrumentation fires correctly.
6. A documentation file `docs/flow-builder/rationale-decision.md` outlines:
   - The three variants and the flag values.
   - The success signal (defined below in "Decision criteria").
   - The deadline (calendar date).
   - Sofia's expected feedback prompts.
   - The path to closing the decision (delete two variants, merge the chosen one, update the file with the outcome).
7. The flag is read client-side only; the rationale data itself remains server-rendered. No SSR mismatch.

## Decision criteria — the signal that closes the loop

The decision is closed when **at least one** of these signals is unambiguous after one week of Sofia's independent usage:

- **Signal 1 — engagement.** With `always_on` enabled in dev, if `rationale.expanded` minus `rationale.collapsed` (net opens) is positive across the week, the panel is being used: keep `always_on`.
- **Signal 2 — explicit feedback.** Sofia says "yes, I used it" or "no, I never opened it" in the dedicated DM Setter Slack channel.
- **Signal 3 — prompt-reader fallback.** If `rationale.prompt_reader_opened` is much higher than `rationale.expanded` (5× or more) under `always_on`, the inspector duplicate is redundant and `hidden` wins.

If none of the three signals are unambiguous at the end of the week, ship `hidden` to prod — the conservative call: less clutter, the data is still in `PromptReader`. Document the call in `rationale-decision.md`.

The author of the closing PR (James, with Sofia's input) writes the decision in plain English in `docs/flow-builder/rationale-decision.md` and merges the cleanup PR.

## Acceptance criteria for the EXPERIMENT (ships as P4.05)

- [ ] `src/lib/config.ts` extended with `NEXT_PUBLIC_FLOW_RATIONALE: z.enum(['always_on', 'hidden']).default('hidden')`.
- [ ] `src/app/dashboard/flows/[flowId]/directions/b-stage/inspector.tsx` (lines 257-259) reads the flag and switches between the two renderings.
- [ ] When `hidden`, the `<CollapsibleSection title="Why This Exists">` wrapper is also omitted (no empty heading).
- [ ] When `always_on`, the `CollapsibleSection`'s `defaultOpen` is `true`. (Note: today's `CollapsibleSection` API at `inspector.tsx` lines 105-187 already takes `defaultOpen?: boolean`.)
- [ ] `src/lib/services/rationale-events.ts` exports `recordRationaleEvent(event)` and `useRationaleInstrumentation()` hook. Implementation is a `useEffect` + a debounced ref counter; no DB writes.
- [ ] Hook is mounted in `inspector.tsx`'s `DesignTab` (where the rationale lives). Records the four events listed in FR4.
- [ ] `?debug=rationale` query param renders a small overlay (top-right) showing event counts. Hidden in production.
- [ ] `docs/flow-builder/rationale-decision.md` exists with:
  - The two variants and flag values.
  - The four event names.
  - The decision criteria (verbatim from above).
  - A "Decision" section left empty for the closing PR.
- [ ] Component test (`__tests__/inspector-rationale.test.tsx`) covers:
  - `always_on` renders the rationale expanded.
  - `hidden` does not render any rationale wrapper.
- [ ] Both variants pass the existing inspector tests; no regressions.
- [ ] Compile-block contract test stays green.

## Acceptance criteria for the DECISION (closed in a follow-up PR by James + Sofia)

These are NOT shipped by the implementing agent — they're the closing loop the spec defines:

- [ ] After one week of Sofia's independent usage on the live dashboard, the team reviews the three signals.
- [ ] A short note ("Decision: kept variant X because Y") is added to `docs/flow-builder/rationale-decision.md`.
- [ ] A cleanup PR removes the unwinning variants from `inspector.tsx`, removes `NEXT_PUBLIC_FLOW_RATIONALE` from `config.ts`, deletes `rationale-events.ts` (or downgrades it to a no-op stub if other callers exist), and removes the debug overlay.
- [ ] The cleanup PR runs the full test suite and the compile-block contract test.

## Affected files (for the EXPERIMENT)

**New files:**

- `docs/flow-builder/rationale-decision.md` — decision doc, dated 2026-04-29 (today), with empty "Decision" section.
- `src/lib/services/rationale-events.ts` — instrumentation helper.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/inspector-rationale.test.tsx` — component test for the three variants.

**Modify:**

- `src/lib/config.ts` — add `NEXT_PUBLIC_FLOW_RATIONALE` to the Zod schema.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/inspector.tsx` — flag-aware rendering at lines 257-259, instrumentation hook in `DesignTab`. Touches the existing `CollapsibleSection` `defaultOpen` flow.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/rationale-banner.tsx` — optional: emit a callback prop on toggle so the instrumentation hook can listen. (Alternative: instrumentation watches a ref in the inspector and infers from DOM events. Prefer explicit callback.)

**Tests to add:**

- `__tests__/inspector-rationale.test.tsx` — three-variant rendering.
- `__tests__/rationale-events.test.ts` — counter dedup, hook lifecycle.

**No files removed by the experiment PR.** The cleanup PR removes them after the decision is closed.

## Coordination with sibling tasks

This task is the most independent of the five P4 tasks:

- **`01-label-simplification.md`** — keeps "Why this step exists" copy unchanged (P4.01's table marks it _italic_/keep). No collision.
- **`02-active-block-highlight.md`** — independent. The active highlight is on the canvas; the rationale is in the inspector.
- **`03-locked-vs-editable.md`** — independent. Lock pills don't overlap with rationale rendering.
- **`04-warnings-rollback.md`** — independent.

The only file this spec touches that another spec also touches is `inspector.tsx` (every spec in P4 touches it in some way). The change in this spec is a small flag-driven branch around lines 257-259 — it should rebase cleanly over P4.01, P4.02, and P4.03.

## Schema / migration changes

**None.** The instrumentation is in-memory; no DB writes.

If the closing PR decides we want persistent telemetry, add a follow-up migration. v0 is intentionally lightweight — the goal is fast feedback, not analytics-grade event tracking.

## API / contract changes

```typescript
// src/lib/config.ts (extension)
NEXT_PUBLIC_FLOW_RATIONALE: z.enum(['always_on', 'hidden']).default('hidden')
```

```typescript
// src/lib/services/rationale-events.ts
export type RationaleVariant = 'always_on' | 'hidden'

export type RationaleEvent =
  | {
      type: 'rationale.variant_loaded'
      variant: RationaleVariant
      blockType: string
    }
  | { type: 'rationale.expanded'; blockType: string }
  | { type: 'rationale.collapsed'; blockType: string }
  | { type: 'rationale.prompt_reader_opened'; blockType: string }

export function recordRationaleEvent(event: RationaleEvent): void
export function getRationaleEventCounts(): Record<
  RationaleEvent['type'],
  number
>
export function useRationaleInstrumentation(args: {
  variant: RationaleVariant
  blockType: string
}): void
```

```tsx
// src/app/dashboard/flows/[flowId]/directions/b-stage/rationale-banner.tsx (extension)
interface RationaleBannerProps {
  rationale: string[]
  stat?: string
  /** New: notified on toggle. */
  onToggle?: (open: boolean) => void
  /** New: drives initial open state. */
  defaultOpen?: boolean
}
```

The wrapping `CollapsibleSection` in `inspector.tsx` already has `defaultOpen` semantics — we expose it through the rationale banner so the parent can drive the variant.

## Third-party prerequisites

None.

## Implementation plan (TDD)

1. **RED — config test.** Extend the existing `src/lib/__tests__/config.test.ts` (or create one) with a Zod parse test asserting the two accepted values + the default.
2. **GREEN — config.** Add the env var to `config.ts`.
3. **RED — instrumentation test.** `__tests__/rationale-events.test.ts`: assert `recordRationaleEvent` increments the right counter; the hook fires `variant_loaded` once per mount; counter dedup on identical events fired in the same tick.
4. **GREEN — instrumentation.** Implement `rationale-events.ts`.
5. **RED — variant test.** `__tests__/inspector-rationale.test.tsx` mounts `BInspector` (or `DesignTab`) with each variant flag, asserts: `always_on` renders an open rationale; `hidden` renders no rationale wrapper.
6. **GREEN — variant wiring.** Update `inspector.tsx` to read the flag and adjust the `CollapsibleSection` mounting. Add the instrumentation hook.
7. **WIRE — debug overlay.** Add the `?debug=rationale` overlay (a small fixed-position div reading `getRationaleEventCounts()`).
8. **DOCS.** Author `docs/flow-builder/rationale-decision.md` with the two variants table, the four event names, the decision criteria (lifted from this spec verbatim), and an empty "Decision" section dated 2026-05-06 (one week from today's Apr 29 ship).
9. **VERIFY.**
   - `npm run lint && npm run type-check && npm run build`.
   - Run focused tests:
     ```
     npx vitest run src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/inspector-rationale.test.tsx
     npx vitest run src/lib/services/__tests__/rationale-events.test.ts
     npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts
     ```
   - Manual: in dev, set `NEXT_PUBLIC_FLOW_RATIONALE=hidden` in `.env.local`, refresh the workspace, click through every block. Confirm no `Why This Exists` heading. Repeat with `always_on`.
   - With `?debug=rationale`, confirm the overlay shows event counts incrementing.

## Test plan

- **Unit (Vitest):**
  - `__tests__/rationale-events.test.ts` — counter, dedup, hook lifecycle.
  - `__tests__/config.test.ts` (extension) — env var validation.
- **Integration (Vitest + Supabase):** none.
- **Component (Vitest + RTL):**
  - `__tests__/inspector-rationale.test.tsx` — three-variant rendering.
- **E2E (Playwright):** optional. If a flow-builder e2e exists, add `tests/e2e/rationale-variants.spec.ts` that toggles the flag via a test-only env override and asserts the right variant renders.
- **Live verification:** as in step 9 above.
- **Compile-block contract:** must stay green. The flag does not enter the prompt.

## Rollout

- **Feature flag:** `NEXT_PUBLIC_FLOW_RATIONALE` in `.env.local` and on Vercel for prod.
  - **Dev default:** `'hidden'` (the spec default; flip to `'always_on'` locally for the experiment week).
  - **Prod default:** `'hidden'` at first deploy. The closing PR may flip prod to `'always_on'` if Sofia's signal points there.
- **Migration order:** none.
- **Production safety:** zero impact at deploy time. Flipping the flag changes only the inspector rendering for new sessions. The `Rationale` aside in `PromptReader` is unchanged.
- **Rollback:** revert the PR or set `NEXT_PUBLIC_FLOW_RATIONALE=hidden` (the default).

## Dependencies

- None upstream.
- The closing PR depends on Sofia's independent usage week.

## Risks + mitigations

- **Risk:** the experiment never closes — Sofia uses the workspace once and we lose the signal. **Mitigation:** the deadline in `rationale-decision.md` is one week from ship. James puts a calendar reminder. If no signal at deadline, prod stays on `hidden` (the conservative default — already shipped at flag default).
- **Risk:** the instrumentation events leak to operators or feel like "Big Brother" telemetry. **Mitigation:** events are in-memory only, never persisted, never sent to a server. `console.debug` only fires in dev. Document this in `rationale-decision.md`.
- **Risk:** the flag adds permanent code complexity if the closing PR is delayed. **Mitigation:** the spec mandates the closing PR removes the unwinning variants. If it slips, the conservative default still works.
- **Risk:** the variants disagree about the `PromptReader` rationale aside, and a future agent removes the aside thinking it's part of the experiment. **Mitigation:** the spec explicitly preserves the `PromptReader` rationale across both variants. The closing PR's diff is bounded to `inspector.tsx`, `rationale-banner.tsx`, `config.ts`, and `rationale-events.ts` — never `prompt-reader.tsx`.
- **Risk:** Sofia uses both surfaces and likes them both — no clear signal. **Mitigation:** that's a valid outcome. Closing PR keeps `hidden` (the conservative shipped default) and documents the inconclusive result.
- **Risk:** the `?debug=rationale` overlay leaks to a customer demo. **Mitigation:** the overlay only renders when the URL has the debug query param; never on by default. Document in code comment.

## Out of scope / explicit deferrals

- Persistent telemetry (writing events to Supabase / PostHog). This is intentionally lightweight; if the closing PR wants real analytics, that's a follow-up task.
- A/B testing infrastructure. We're not measuring conversion rates; we're letting Sofia tell us.
- Renaming the rationale data structure (`SectionRationale`, `block-sections.ts` lines 27-30). Stays as-is.
- Per-block rationale toggling (e.g. show on Qualifier but hide on Summary). v1 is global.
- Editor UX for marketers to add/edit rationale text. The rationale is hand-curated in `block-sections.ts` and stays that way.

## PR strategy

**Stacked against `feat/p4-base` (P4.01).** This spec touches `inspector.tsx` (line 257-259) and `rationale-banner.tsx`, both of which P4.01 also touches in the catalog wiring. Open against `feat/p4-base`; rebase onto `main` once that base merges. See [`plans/dm-setter-roadmap/execution-protocol.md`](../execution-protocol.md).

Branch: `feat/p4-05-rationale-experiment`. Base: `feat/p4-base`.

A second PR for the closing decision: `chore/p4-05-close-rationale-decision`. Authored by James + Sofia after the week-long observation.

Conventional commits:

- `feat(flow-builder): rationale variant flag with always_on and hidden`
- `feat(flow-builder): instrument rationale engagement events`
- `docs(flow-builder): rationale decision framework`
- (closing PR) `chore(flow-builder): close rationale decision and remove unused variants`

## Observability

- **Logs:** `console.debug` in dev only. No production logs.
- **Sentry breadcrumbs:** none.
- **Metrics:** in-memory counters reachable via `getRationaleEventCounts()`. Not aggregated across sessions.
- **Operator-visible status:** none in the default UI. The `?debug=rationale` overlay is dev-only.

## Notes for the implementing agent

- This is a DECISION-frame spec. **Do not optimize for "the panel is now better"** — optimize for "the experiment runs cleanly and the data is there to close the decision in one week." The simplest correct thing is the right thing.
- Reference: `~/.claude/CLAUDE.md` `feedback_no_week_labels.md` — never use "Week N" in operator-facing copy. The decision deadline is a date, not a week label.
- Reference commit `b47f464` for the precedent of "ship copy + framing changes that respect Sofia's vocabulary."
- The `RationaleBanner` is currently always wrapped in a `CollapsibleSection` at `inspector.tsx` lines 257-259. The hidden variant must skip _both_ the banner and the wrapper — otherwise the operator sees a `Why This Exists` heading with empty contents.
- The `Rationale` aside in `PromptReader` (`prompt-reader.tsx` lines 82-157, mounted line 247) is **out of scope** — never touch it. The experiment is only about the inspector duplicate.
- `useRationaleInstrumentation` should be defensive: idempotent on remount, no leaks if the inspector unmounts mid-event.
- The `?debug=rationale` overlay is a one-component `read URLSearchParams` plus a fixed-position pill. Keep it under 30 lines.
- Light theme + Linear/Vercel/Stripe aesthetic. The debug overlay can be intentionally drab — it's not customer-facing.
- The closing PR should also update `docs/sofia-feedback-priorities.md` Priority 3 row 5 with the outcome. That's the one place where Sofia's feedback queue is canonically tracked.
- The instrumentation hook fires once per inspector mount via the `useEffect` lifecycle. Watch for double-fire in React Strict Mode dev — assert in the test that mounting + unmounting + remounting yields exactly one `variant_loaded` per "real" mount cycle (use `act` + cleanup).
- If the spec implementer finds that `RationaleBanner` already handles its own toggle state (it does — `rationale-banner.tsx` line 13 `const [open, setOpen] = useState(false)`), they may wire instrumentation by passing `onToggle` from the inspector to the banner. Keeps state ownership with the banner; instrumentation is just a notification.
- Avoid premature abstraction. Don't generalize `rationale-events.ts` into a "telemetry" library. Keep it scoped to this experiment so the closing PR's deletion is a single-file diff.
- The `docs/flow-builder/rationale-decision.md` file should be ~40-60 lines: the two variants, the four event names, the three signals, the deadline, the closing path, and an empty "Decision" section. Concrete, terse, ready for Sofia to read after a week.
- When in doubt, default to `hidden`. The `Rationale` aside in `PromptReader` already gives operators a clean, dedicated home for the data; the inspector duplicate exists today mostly because it was easy to add, not because it earned its real-estate.
