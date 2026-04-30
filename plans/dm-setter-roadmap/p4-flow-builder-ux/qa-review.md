# P4.05 — Manual QA checklist

Verify the rationale-panel experiment ships cleanly. Run all of these against `npm run dev` before merging the PR.

---

## Setup

1. From the worktree: `npm run dev`
2. Open `http://localhost:3000/dashboard/flows/lg-organic-dm`
3. Confirm the workspace loads without console errors.

---

## Variant: `always_on`

Set `NEXT_PUBLIC_FLOW_RATIONALE=always_on` in `.env.local`, restart `npm run dev`.

- [ ] Click any block on the canvas (e.g. Opening). The inspector opens on the right.
- [ ] Inside the inspector's **Design** tab, "Why this step exists" appears as the third section (after Goal + Step instructions).
- [ ] The section is **expanded by default** — supporting insights are visible without an extra click.
- [ ] Click the section header — it collapses, chevron flips to right.
- [ ] Click again — it re-expands, chevron flips to down.
- [ ] Click a different block — the rationale section is again expanded by default.
- [ ] Click **"View prompt"** in the inspector header. The PromptReader opens. The Rationale aside is visible above the prompt body.

## Variant: `hidden`

Set `NEXT_PUBLIC_FLOW_RATIONALE=hidden` (or remove the line — `hidden` is the default), restart `npm run dev`.

- [ ] Click any block. The inspector opens.
- [ ] Inside the **Design** tab, "Why this step exists" is **NOT** visible. There is **no empty heading**.
- [ ] The section ordering goes Goal → Step instructions → Examples → Data Capture → Runtime Details. No gap, no empty wrapper.
- [ ] Click **"View prompt"** in the header. The Rationale aside is visible above the prompt body — same data, same layout as in `always_on`.

## Misconfigured flag

Set `NEXT_PUBLIC_FLOW_RATIONALE=collapsed` (a removed value), restart `npm run dev`.

- [ ] Workspace loads without crash.
- [ ] The inspector falls back to `hidden` behaviour (no rationale section).
- [ ] Console shows the Zod parse error from `getFlowRationaleVariant()` only when `getFlowRationaleVariant()` is called directly (e.g. via the test). The inspector's `readRationaleVariant()` swallows the error.

## Debug overlay

With `?debug=rationale` query param.

- [ ] In dev (`NODE_ENV=development`), append `?debug=rationale` to the workspace URL: `http://localhost:3000/dashboard/flows/lg-organic-dm?debug=rationale`.
- [ ] A small fixed-position pill appears in the top-right corner with four rows: `variant_loaded`, `expanded`, `collapsed`, `prompt_reader_opened`.
- [ ] Click a block: `variant_loaded` increments to 1.
- [ ] Click a different block: `variant_loaded` increments to 2.
- [ ] Under `always_on`, collapse the rationale: `collapsed` increments to 1.
- [ ] Re-expand: `expanded` increments to 1.
- [ ] Click "View prompt": `prompt_reader_opened` increments.
- [ ] Counters update within ~1 second of the action.
- [ ] Without `?debug=rationale`, the overlay does NOT render.
- [ ] In a production build (`npm run build && npm start`) WITH `?debug=rationale`, the overlay does NOT render.

## Test suite

- [ ] `npm test` — 442 tests pass, 0 fail.
- [ ] `npx vitest run src/lib/__tests__/config.test.ts` — 11 pass.
- [ ] `npx vitest run src/lib/services/__tests__/rationale-events.test.ts` — 8 pass.
- [ ] `npx vitest run src/app/dashboard/flows/\[flowId\]/directions/b-stage/__tests__/inspector-rationale.test.tsx` — 6 pass.
- [ ] `npx vitest run src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts` — 33 pass (compile-block contract green).
- [ ] `npm run type-check` — clean.
- [ ] `npm run lint` — 0 errors. (15 pre-existing warnings outside this branch's scope.)

## Compile-block invariant

The flag and its events must NEVER reach `compileBlock`. If the contract test (`src/lib/prompts/compile-block/__tests__/compile-block.contract.test.ts`) fails after this PR, do NOT merge — the prompt assembler has been polluted with display-only state. Trace the offending change and bound it to the inspector before pushing.

- [ ] Compile-block contract test green.
- [ ] No imports from `@/lib/services/rationale-events` inside `src/lib/prompts/`.

## Accessibility

- [ ] Under `always_on`, the rationale section is keyboard-accessible: Tab into the inspector, navigate to the Design tab content, the rationale section header is focusable.
- [ ] Pressing Enter / Space on the header collapses / expands.
- [ ] The `aria-expanded` attribute on the wrapper toggle reflects the open state.
- [ ] The "View prompt" button in the inspector header has an accessible name (`title` + visible text).
- [ ] The debug overlay carries `role="status"` and `aria-label` so screen readers announce the counters.

## Visual check (Linear / Vercel / Stripe aesthetic)

- [ ] Light theme only. No dark mode regression.
- [ ] The rationale section under `always_on` matches the existing CollapsibleSection styling (no new tokens).
- [ ] The debug overlay is intentionally drab — monospace font, no color emphasis. It is not customer-facing.
