# Flow Builder — Status

Current state of the Direction B (Stage) functional prototype. This is a live doc — update it as slices land.

Branch: `feature/flow-builder-b-functional`
Route: `/dashboard/flows/ig-organic-dm`
Persistence: `localStorage` key `instasetter.flow-builder.v1` (stand-in only — real DB is SPEC-WEEK-1 work)

## What works end-to-end

- **State:** single reducer + context at the top of `DirectionB`; every interaction flows through it.
- **Design tab:** Goal, Guidance, Examples (add/edit/delete), Captures (add/delete); edits reflect in the canvas node card.
- **Routing tab:** branches CRUD — label, when-condition, target dropdown, delete.
- **Triggers tab:** ambient triggers CRUD — delay minutes, cancel-on-reply, Meta send mode, target. Inline warning when delay > 24h with `in_window_only`.
- **Data tab:** read-only "writes" + "reads" table per block.
- **Canvas:** node drag (snaps to grid), Cmd/Ctrl+wheel zoom at cursor, Space+drag or middle-click pan, zoom controls, minimap with viewport rect, hint bar.
- **Palette drawer:** collapsible left rail; HTML5 drag-to-add new nodes to canvas at drop coords; auto-id suffixes for duplicates.
- **Simulator:** Send/Enter appends prospect message, heuristic traversal picks next block, reply from block examples, block chip on each bot bubble, "Mike is typing…", reset (↻).
- **Publish:** increments draft version, flips live row, toast, header chip updates.
- **Related pages:** Variables, Versions, and Bot Settings all read from the same store (Bot page currently summarizes bot-level persona and guardrails; Versions list reflects publish history; Variables captures resolve from the live flow).
- **Persistence:** 400 ms debounced write to localStorage; hydrate on mount. Verified round-trip.

## Known stubs / placeholders

| Surface                            | Stub                                    | Why                                             |
| ---------------------------------- | --------------------------------------- | ----------------------------------------------- |
| Simulator replies                  | Picks from block examples heuristically | Real Claude calls = Primitive #1 (live preview) |
| Ambient triggers                   | UI persists; scheduler does nothing     | Runtime = Primitive #2                          |
| Compiled prompt debugger           | Not wired                               | Primitive #3                                    |
| Runs page                          | Hardcoded mock conversations            | Real Supabase-backed data = SPEC-WEEK-1         |
| Version history before draft edits | Seeded mock list on first load          | Real log = Supabase                             |
| Persistence                        | localStorage only                       | Real Supabase + Server Actions = SPEC-WEEK-1    |

## Follow-ups not in this build pass

Tracked here so we don't lose them. When one starts, link the PR/branch from this row.

### Interaction

- **Drag-to-connect edges via node handles** — edges are currently edited through the Routing tab only. Add source/target handles on nodes, drag between them, create a branch.
- **Minimap interactivity** — viewport rect renders but minimap is display-only. Add click-to-pan and drag-to-move.
- **Undo/redo** — reducer is set up for it; need `zundo` or a handwritten undo stack bound to Cmd+Z / Cmd+Shift+Z.
- **Keyboard shortcuts** — Esc closes inspector, `/` focuses simulator, Cmd+K opens palette. Not wired.
- **Multi-select nodes** — box-select + bulk move/delete.
- **Collaboration** — last-write-wins banner + Supabase Realtime presence. Covered in [SPEC-WEEK-2.md](SPEC-WEEK-2.md).

### Runtime

- **Real Claude in simulator** — replace the heuristic with live `claude.ts` calls using compiled block prompt. Covered in [SPEC-PRIMITIVE-1.md](SPEC-PRIMITIVE-1.md) and [PLAN.md](PLAN.md).
- **Ambient trigger scheduler** — `ins_scheduled_triggers` table + Vercel cron + engine hooks. Covered in [SPEC-PRIMITIVE-2.md](SPEC-PRIMITIVE-2.md).
- **Compiled prompt debugger** — "show compiled prompt" drawer inside the inspector. Covered in [SPEC-PRIMITIVE-3.md](SPEC-PRIMITIVE-3.md).

### Persistence

- **Supabase round-trip** — replace localStorage with real `flows-service` Server Actions per [SPEC-WEEK-1.md](SPEC-WEEK-1.md) + [SPEC-WEEK-2.md](SPEC-WEEK-2.md). Schemas, compiler, and contract test are all specced.
- **Multi-tenant** — brand switcher in the header; flows scoped per brand. Design doc in [README.md](README.md); schema lives in [SPEC-WEEK-1.md](SPEC-WEEK-1.md) slice 2-4.

### Validation & safety

- **Flow validator on publish** — reject unreachable nodes, missing tool configs, variables used-before-set. Covered in [SPEC-WEEK-2.md](SPEC-WEEK-2.md) slice 8.
- **Shadow mode + per-brand feature flag** — the non-negotiable rollout safety layer. Covered in [ROLLOUT.md](ROLLOUT.md).

### Testing

- **Contract test** — joined `compileBlock` sections === what engine sends today. Zero-drift guarantee for the debugger. Covered in [SPEC-WEEK-1.md](SPEC-WEEK-1.md) slice 13.
- **Test infrastructure** — Supabase harness, Claude stub, SendPulse stub, Playwright. Covered in [SPEC-TEST-INFRA.md](SPEC-TEST-INFRA.md).

## Verification log (manual)

| Slice                   | Verified                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| 1 — lift state          | Reloaded; UI identical                                                                               |
| 2 — fields writable     | Edited Goal → canvas reflects                                                                        |
| 3 — examples/captures   | +add adds textarea; × removes; count 4→5→4                                                           |
| 4 — inspector tabs      | All 4 tabs render correct content; Routing edits persist                                             |
| 5 — canvas interactions | Zoom 100 → 144% via controls; node drag wired (pointer capture)                                      |
| 6 — palette             | Collapsed/expanded; 8 blocks listed with draggable attr; drop handler on canvas                      |
| 7 — simulator           | "Dallas, 7K saved" sent → bot reply from Booking block, block chip shown                             |
| 8 — publish             | v13 → v14 draft, v12 → v13 live, chips updated                                                       |
| 9 — related pages       | Variables shows live captures; Versions lists live history; Bot page reflects bot-level prompt state |
| 10 — localStorage       | Edit goal, reload, edit preserved on screen and in DOM                                               |
