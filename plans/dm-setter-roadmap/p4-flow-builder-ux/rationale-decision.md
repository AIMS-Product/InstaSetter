# Rationale-panel decision (P4.05)

**Status:** open — experiment shipped, decision pending Sofia's independent usage.
**Shipped:** 2026-04-29
**Decision deadline:** 2026-05-06 (one week from ship)
**Owners:** James (closing PR), Sofia (signal source).
**Asana:** https://app.asana.com/1/44898890502301/project/1213921869970968/task/1214385389843530

This file frames a single product question — does the inspector duplicate of the rationale panel earn its real-estate? — and locks the deadline by which we close it.

---

## Context

The Flow Builder has two surfaces that show the same `SectionRationale` data:

1. **Inspector banner** — `RationaleBanner` mounted under a `CollapsibleSection` titled "Why this step exists" inside the Design tab of the inspector (`src/app/dashboard/flows/[flowId]/directions/b-stage/inspector.tsx`).
2. **Prompt-reader aside** — `Rationale` aside above the prompt body in `PromptReader` (`prompt-reader.tsx` lines 82-157), opened via the inspector's "View prompt" button.

The data behind both is identical. The question is whether the inspector duplicate is useful or whether it's clutter on a screen that already carries a canvas, an inspector, and a simulator.

Sofia's words from the Apr 29 walkthrough (`docs/sofia-feedback-priorities.md`):

> The section may help explain the system, but could also add clutter.

That's not "remove it" or "keep it" — it's "I don't know yet; I need to use it." The honest path is to ship the experiment and let Sofia's real usage settle the call.

---

## Variants

The flag `NEXT_PUBLIC_FLOW_RATIONALE` toggles between two variants. The third variant from the original draft (`collapsed`) was dropped during the 2026-04-29 spec patch — it added no signal beyond the baseline and tripled the surface area for one user on a one-week loop.

| Variant | Flag value           | Inspector treatment                                                                                               | PromptReader treatment                                                     |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `A`     | `'always_on'`        | Rationale section is mounted EXPANDED inside the Design tab. The wrapper toggle records `expanded` / `collapsed`. | Aside renders as today.                                                    |
| `B`     | `'hidden'` (default) | Rationale section is NOT rendered. No empty heading.                                                              | Aside renders as today — operators still reach the data via "View prompt". |

The `Rationale` aside in `PromptReader` is **kept across both variants**. The experiment is only about the inspector duplicate.

**Choice of default:** `hidden`. The conservative call defaults to less clutter; if Sofia misses the inspector banner, "View prompt" is one click away and `prompt_reader_opened` will rise — which is itself a signal to flip to `always_on`.

---

## Instrumentation

In-memory counters only. **Never sent over the wire, never persisted.** Counters reset on hard refresh by design.

| Event                            | When it fires                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `rationale.variant_loaded`       | Once per inspector mount per `{variant, blockType}` pair. Re-renders with identical args do NOT double-fire.                        |
| `rationale.expanded`             | The `always_on` wrapper section is opened (operator action only — the default-open mount is not counted).                           |
| `rationale.collapsed`            | The `always_on` wrapper section is collapsed.                                                                                       |
| `rationale.prompt_reader_opened` | Operator clicks "View prompt" in the inspector header (or the inline "↗ View Persona" action). Proxy for "I needed deeper context". |

**Read counters via:** `getRationaleEventCounts()` from `src/lib/services/rationale-events.ts`.

**Live debug overlay:** in dev only, append `?debug=rationale` to the workspace URL. A small fixed-position pill in the top-right corner shows the four counters and updates every second. Both gates (`NODE_ENV === 'development'` AND query param) must pass — the overlay never appears in production.

---

## Decision criteria — the signal that closes the loop

The decision is closed when **at least one** of these three signals is unambiguous after one week of Sofia's independent usage:

1. **Engagement.** With `always_on` enabled, if `rationale.expanded - rationale.collapsed` (net opens) is positive across the week, the panel is being used. → Keep `always_on`.
2. **Explicit feedback.** Sofia says "yes, I used it" or "no, I never opened it" in the DM Setter Slack channel.
3. **Prompt-reader fallback.** If `rationale.prompt_reader_opened` is much higher than `rationale.expanded` (5× or more) under `always_on`, the inspector duplicate is redundant. → Ship `hidden`.

If none of the three signals are unambiguous at the deadline, ship `hidden` to prod — the conservative call: less clutter, the data is still in `PromptReader`. Document the tie in the Decision section below.

### Sofia's expected feedback prompts

To collect the explicit-feedback signal, James drops these in the Slack DM Setter channel during the experiment week:

- "Did the 'Why this step exists' panel help when you opened a block?"
- "Did you click 'View prompt' to find out what the bot would actually say?"
- "If we removed the inspector panel and kept the same data only inside 'View prompt', would you miss it?"

---

## Closing the loop

When the decision criteria are met (or the deadline passes), James (with Sofia's input) opens **`chore/p4-05-close-rationale-decision`** that:

1. Adds a "Decision" entry to this file (verbatim plain English: "kept variant X because Y").
2. Removes the unwinning variant's code path from `inspector.tsx`.
3. Removes `NEXT_PUBLIC_FLOW_RATIONALE` from `src/lib/config.ts`.
4. Deletes `src/lib/services/rationale-events.ts` and the debug overlay (`rationale-debug-overlay.tsx`).
5. Removes the `onToggle` prop from `CollapsibleSection` if no other caller uses it.
6. Updates `docs/sofia-feedback-priorities.md` Priority 3 row 5 with the outcome.
7. Runs the full Vitest suite + the compile-block contract test.

The closing PR is bounded: `inspector.tsx`, `config.ts`, `rationale-events.ts`, `rationale-debug-overlay.tsx`, `index.tsx`, this file, the sofia-feedback doc. **Never** `prompt-reader.tsx` — that surface is the canonical home for the data and stays in both variants.

---

## Risks & guardrails

- **The experiment never closes.** The deadline above is a hard gate. If 2026-05-06 arrives without a clear signal, prod stays on `hidden` (the shipped default) and the closing PR runs anyway to remove the experimental flag.
- **The instrumentation feels like Big Brother.** It is not. Events are in-memory only, never sent to a server, and `console.debug` only fires in dev. This file is the only place the events are documented.
- **The flag adds permanent code complexity if the closing PR slips.** The conservative default still works — production sees `hidden` until the closing PR lands. Code complexity is bounded to a single `if` in `DesignTab` plus the `rationale-events` service.
- **A future agent removes the `Rationale` aside thinking it's part of this experiment.** It's not. This file and the closing PR's diff scope explicitly preserve `prompt-reader.tsx` across both variants.

---

## Decision

> _Empty until the closing PR lands. The closing author writes here in plain English: which variant was kept, what signal closed the call, and what the inconclusive scenarios looked like (if any)._

(End of file.)
