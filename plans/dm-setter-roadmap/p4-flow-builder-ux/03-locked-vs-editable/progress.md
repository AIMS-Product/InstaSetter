# P4.03 — Locked vs editable rule indicators · progress

Branch: `feat/p4-03-locked-vs-editable`. Sibling tracking files for the
spec at `plans/dm-setter-roadmap/p4-flow-builder-ux/03-locked-vs-editable.md`.

## Architecture

The Flow Builder previously had three inconsistent lock signals: a static
`<LockPill />` in block panels, a `Lock` icon + source path in the guardrails
drawer, and a one-off "Fixed" pill in the bot-page persona drawer. None of
them told the operator _why_ the field was locked or where the change
request should go.

This spec introduces a typed lock catalog (`src/lib/dashboard/flow-builder-locks.ts`)
that classifies every locked surface as either `safety` (compliance/legal —
permanent) or `admin` (engineering-only today, could become editable). The
existing `LockPill` is extended (additively) with an optional `id` prop. When
the prop is set the pill becomes a click-target that opens a popover with
the catalog tooltip and, for admin locks, an "Ask James" escalation.

The catalog is also exposed via the labels module (`FLOW_BUILDER_LABELS.locks`)
so downstream specs (P4.04 warnings, P4.05 rationale) read every lock-related
operator string from one entry point.

## Lock catalog (23 entries — `safety` vs `admin`)

| Id                            | Kind   | Reason                                          |
| ----------------------------- | ------ | ----------------------------------------------- |
| `opening.usCanadaGate`        | safety | US/Canada-only is a compliance gate.            |
| `opening.outOfAreaScript`     | safety | Decline copy must stay warm + consistent.       |
| `qualifier.list`              | admin  | Adding/removing qualifiers needs engineering.   |
| `qualifier.order`             | admin  | Order is research-tuned (location first).       |
| `qualifier.thresholds`        | admin  | Hot/warm/cold scoring criteria.                 |
| `objection.handlers`          | admin  | Library of handler types and openers.           |
| `objection.followUps`         | admin  | Per-handler follow-up lines.                    |
| `objection.structure`         | admin  | Acknowledge → probe → respond flow.             |
| `booking.linkPattern`         | admin  | URL template the bot pastes.                    |
| `booking.reengagement`        | admin  | Silent-window timing + max sends.               |
| `email.captureEmailTool`      | safety | `capture_email` MUST fire after email received. |
| `email.timingFloor`           | safety | No email ask in first/second message.           |
| `email.captureTriggers`       | admin  | Three trigger windows are admin-locked.         |
| `escalation.requiredTriggers` | admin  | Conditions for human handoff.                   |
| `escalation.captureMethod`    | safety | HUMAN_AGENT tag is compliance-driven.           |
| `summary.requiredFields`      | admin  | Required generate_summary fields.               |
| `summary.triggerWords`        | admin  | Keywords that force summary call.               |
| `followup.timing`             | admin  | Hours after the call before follow-up.          |
| `followup.outcomes`           | admin  | One touch only, then let it rest.               |
| `bot.persona.body`            | admin  | **Borderline — flagged for Sofia.** Voice copy. |
| `bot.persona.namelessRule`    | safety | The bot must never claim a name.                |
| `bot.messageConstraints`      | admin  | Word counts and formatting limits.              |
| `guardrails.global`           | safety | Cross-conversation safety rules.                |

### Borderline classifications flagged for Sofia

- **`bot.persona.body`** — currently `admin` (operators may eventually edit
  voice copy). If Sofia thinks brand voice should never leave engineering
  hands it can be promoted to `safety`. The classification is one-line code
  change.

## Log

- **TDD red.** Created `__tests__/flow-builder-locks.test.ts` asserting
  unique ids, valid kinds, escalation/kind correlation, banned substring
  scan, every catalog id referenced by a `src/app/dashboard` source file.
  Failure on the drift-guard test confirmed the RED.
- **TDD green — catalog.** Created `src/lib/dashboard/flow-builder-locks.ts`
  exporting `FLOW_BUILDER_LOCKS` (23 entries, frozen), `LOCK_KINDS`,
  `LockEntry`, `getLock`, `getLockBySourceHint`. All catalog tests pass.
- **TDD red — popover.** Created `src/components/ui/__tests__/lock-popover.test.tsx`
  asserting render-on-open, Escape-to-close, outside-click-to-close,
  catalog-aware content, escalation visible only on admin locks.
- **TDD green — popover.** Created `src/components/ui/lock-popover.tsx`
  (~190 lines, light theme, `role="dialog"` + focus management). All popover
  tests pass.
- **WIRE — `LockPill` + `PanelCard`.** Extended `block-panels/shared.tsx`:
  - `LockPill` accepts `id?: LockId` (catalog) or `kind?: 'safety' | 'admin'`
    (override). Default kind is `safety` for legacy callsites.
  - `LockPill` renders as a `<button>` with `aria-haspopup="dialog"`,
    `aria-expanded` reflecting popover state, and an `aria-label` derived
    from the catalog entry's `surface`.
  - `PanelCard` accepts `lockId?: LockId`. When set, the title-row LockPill
    is catalog-aware. The legacy `locked={true}` boolean still renders the
    grey safety pill.
- **WIRE — block panels.** Replaced every `<PanelCard ... locked>` and
  `<LockPill />` with a catalog-aware variant:
  - `opening.tsx`: `opening.usCanadaGate` (supported markets card +
    inline pill), `opening.outOfAreaScript` (decline-script card).
  - `qualifier.tsx`: `qualifier.list` (main card), `qualifier.order`
    (per-entry pill when `q.locked`), `qualifier.thresholds` (thresholds
    card).
  - `objection.tsx`: `objection.structure` (response-structure card),
    `objection.handlers` (handlers card), `objection.followUps`
    (per-handler follow-up pill).
  - `booking.tsx`: `booking.linkPattern` (booking link copy card),
    `booking.reengagement` (re-engagement card + reminder script pill).
  - `email.tsx`: `email.captureTriggers` (capture triggers card),
    `email.timingFloor` (action-slot pill), `email.captureEmailTool`
    (hesitation-script footer pill).
  - `escalation.tsx`: `escalation.requiredTriggers` (when-to-escalate card),
    `escalation.captureMethod` (capture-method footer pill).
  - `summary.tsx`: `summary.requiredFields` (required-fields card),
    `summary.triggerWords` (trigger-words footer pill).
  - `followup.tsx`: `followup.timing` (timing card), `followup.outcomes`
    (branch-outcomes footer pill).
- **WIRE — guardrails panel.** Restructured the disclosure header so the
  LockPill (`guardrails.global`) sits beside the disclosure button instead
  of nested inside another button. Per-row admin locks resolve via
  `getLockBySourceHint(g.source)` so guardrails parsed from
  `message-constraints.ts` show the `bot.messageConstraints` admin pill
  with escalation copy.
- **WIRE — bot page.** `related-pages/page-bot.tsx` `PersonaPanel` now
  resolves a lock id per persona section: `identity` →
  `bot.persona.namelessRule` (safety), `messageLength` →
  `bot.messageConstraints` (admin), every other locked section →
  `bot.persona.body` (admin). The disclosure trigger and the LockPill are
  siblings — no nested-button violation.
- **TEST — labels catalog update.** Extended the existing labels test to
  expect six sub-records (added `locks`) and added a sub-test asserting
  the `safety` / `admin` pill labels, the popover heading, and that
  `FLOW_BUILDER_LABELS.locks.catalog` references the lock module.
- **TEST — integration.** Added
  `directions/b-stage/__tests__/lock-pill-integration.test.tsx` rendering
  every relevant block panel and asserting the catalog ids resolve as
  expected (safety vs admin, escalation present only on admin entries).

## Verification

- `npm run lint` → 0 errors (15 pre-existing warnings unrelated to this branch)
- `npm run type-check` → exit 0
- `npm run build` → success
- `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`
  → 33/33 pass (the load-bearing safety guard)
- `npx vitest run src/lib/dashboard/__tests__/flow-builder-locks.test.ts`
  → 11/11 pass
- `npx vitest run src/lib/dashboard/__tests__/flow-builder-labels.test.ts`
  → 23/23 pass (3 new locks-sub-record assertions)
- `npx vitest run src/components/ui/__tests__/lock-popover.test.tsx`
  → 6/6 pass
- `npx vitest run src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/lock-pill-integration.test.tsx`
  → 7/7 pass
- `npx vitest run` (full suite) → 451/451 pass

## Coordination note

This branch stacks on `feat/p4-base` (P4.01). P4.04 (warnings + rollback)
depends on this catalog to decide which fields warrant a warning modal —
P4.04 must merge after P4.03. P4.02 and P4.05 are independent.

The `LockPill` extension is fully additive: every existing callsite
(none remain after this PR's sweep) would continue to render the legacy
grey pill if a future caller forgets the `id` prop. All catalog ids are
literal `LockId` values so a typo surfaces at type-check, not at runtime.
