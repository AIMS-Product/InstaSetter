# P4.05 — Progress log

Living log of what landed for the rationale-panel decision experiment. Append entries; never edit history.

---

## 2026-04-29 — initial implementation

**Branch:** `feat/p4-05-why-this-exists` (stacks on `feat/p4-base`).

**Wave 1 — config flag + instrumentation service**

- `src/lib/config.ts` — added `flowRationaleEnvSchema` + `getFlowRationaleVariant()` returning `'always_on' | 'hidden'`, default `'hidden'`. Throws on unknown values.
- `src/lib/__tests__/config.test.ts` — 4 new tests: default, both valid values, invalid value rejection.
- `src/lib/services/rationale-events.ts` — new in-memory counter service exposing:
  - `recordRationaleEvent(event)`
  - `getRationaleEventCounts()`
  - `resetRationaleEventCounts()` (test-only)
  - `useRationaleInstrumentation({ variant, blockType })` hook with dedup ref so React Strict Mode and parent re-renders cannot double-fire `variant_loaded`.
- `src/lib/services/__tests__/rationale-events.test.ts` — 8 tests covering counter init, increments per type, dedup on identical args, fresh fires when block or variant change, reset.

**Wave 2 — inspector wiring**

- `src/app/dashboard/flows/[flowId]/directions/b-stage/inspector.tsx`:
  - `CollapsibleSection` gains an optional `onToggle(open)` callback (zero callsite change for non-rationale collapsibles — they pass nothing).
  - `DesignTab` accepts a `rationaleVariant` prop; mounts `useRationaleInstrumentation`; wraps the rationale `CollapsibleSection` behind a `variant === 'always_on'` gate; sets `defaultOpen` when mounted; pipes toggle clicks into `rationale.expanded` / `rationale.collapsed`.
  - `BInspector` reads the variant via `readRationaleVariant()` (try/catch wrap so a fat-fingered env value falls back to `hidden` instead of crashing).
  - "View prompt" button in the inspector header records `rationale.prompt_reader_opened`. The DesignTab's `onOpenPrompt` callback (used by the Field "↗ View Persona" link and the GuardrailsPanel "open source" links) records the same event.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/inspector-rationale.test.tsx` — 6 tests covering both variants' rendering, variant_loaded counter on mount, prompt_reader_opened on click, expanded/collapsed events on wrapper toggle.

**Wave 3 — debug overlay**

- `src/app/dashboard/flows/[flowId]/directions/b-stage/rationale-debug-overlay.tsx` — fixed-position pill rendering the four counters in real time. Two gates: `process.env.NODE_ENV === 'development'` AND `?debug=rationale` query param. Polls `getRationaleEventCounts()` every 1s. Mounted from `index.tsx`.
- `src/app/dashboard/flows/[flowId]/directions/b-stage/index.tsx` — mount the overlay alongside the toast.

**Wave 4 — test infra fix**

- `src/test/setup.ts` — provide `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` shims with `??=` so any test importing `inspector.tsx` (which transitively imports `@/lib/config` whose top-level `envSchema.parse(...)` requires those vars) does not ZodError out under jsdom. Each test that cares about a specific env value can still `vi.stubEnv(...)` to override.

**Wave 5 — docs**

- `plans/dm-setter-roadmap/p4-flow-builder-ux/rationale-decision.md` — decision frame: variants table, instrumentation events, decision criteria (3 signals), Sofia's prompts, closing-loop checklist, deadline 2026-05-06, empty Decision section for the closing PR.
- `plans/dm-setter-roadmap/p4-flow-builder-ux/progress.md` — this file.
- `plans/dm-setter-roadmap/p4-flow-builder-ux/qa-review.md` — manual verification checklist.

---

## Test totals

- Vitest: 442 passed (43 files). +18 new tests vs. `feat/p4-base`:
  - 4 in `src/lib/__tests__/config.test.ts`
  - 8 in `src/lib/services/__tests__/rationale-events.test.ts`
  - 6 in `src/app/dashboard/flows/[flowId]/directions/b-stage/__tests__/inspector-rationale.test.tsx`
- Compile-block contract test: green.
- Type check: clean.
- Lint: 0 errors, 15 pre-existing warnings (none from this branch).

---

## Decisions made during implementation

- **`recordRationaleEvent` is not gated by the variant.** All four event types fire regardless. Rationale: `prompt_reader_opened` is a useful comparator signal even under `hidden` (it tells us how often operators reach for the data when the inspector banner is gone).
- **`readRationaleVariant()` swallows the parse error.** A fat-fingered `NEXT_PUBLIC_FLOW_RATIONALE=collapsed` would otherwise crash the workspace at render time. The conservative fallback (`hidden`) is the same shipped default; misconfig degrades gracefully. The config test asserts the parse throws — that's the loud surface for CI / dev. Production silently degrades.
- **The debug overlay polls every 1s rather than subscribing.** A subscription model would require turning `rationale-events.ts` into an event emitter (more surface area, more tests, more code for the closing PR to delete). 1Hz polling is plenty for a manual-verification overlay used by one engineer for one week.
- **The dedup key in `useRationaleInstrumentation` is `${variant}::${blockType}`.** Two reasons: (1) React Strict Mode double-mounts in dev, and the ref-keyed dedup catches that; (2) operators clicking between blocks should re-fire `variant_loaded` since each visit is a fresh signal.

---

## Pending

- Run the experiment week (Sofia's independent usage). Closing PR: `chore/p4-05-close-rationale-decision`. Owner: James.
- After decision lands: cleanup PR removes the unwinning variant + the flag + the events service + the overlay.
