# P4.02 — Simulator active-block highlight · progress

## Branch + base
- Branch: `feat/p4-02-active-block-highlight`
- Base: `feat/p4-base` (stacked PR — see PR strategy in spec)
- Worktree: `.claude/worktrees/agent-a00282e3376367d02`

## What's landed
- `6402d20` feat(flow-builder): infer active block per simulator turn
  — pure `inferActiveBlock` heuristic + label helper + `sim_receive` wiring + 12 unit tests + 3 reducer tests
- `7398135` feat(flow-builder): visualize active block on canvas + legend
  — Node treatment upgrade (doubled stripe + 1px tint border + pulse), `prefers-reduced-motion` guard, `ActiveBlockLegend` component + 3 RTL tests
- `22e4c25` chore(flow-builder): align inspector + sim-float chips with active state
  — sim-float chip swaps to "Currently replying as" while pending; inspector header gains the small "Active" pill

## Status
- [x] RED: `inferActiveBlock` unit tests fail because module is missing
- [x] GREEN: `active-block.ts` ships pure heuristic + label helper
- [x] RED: `sim_receive` reducer test asserts inference lights `booking` from `book_call`
- [x] GREEN: store wires `inferActiveBlock` into `sim_receive`
- [x] WIRE: canvas active treatment upgraded (border + pulse + reduced-motion)
- [x] WIRE: `ActiveBlockLegend` mounts above canvas summary, click selects active block
- [x] WIRE: `sim-float` chip swaps to "Currently replying as" while pending
- [x] WIRE: inspector header shows "Active" pill when inspected block is the active block
- [x] VERIFY: `npm run lint && npx tsc --noEmit && npx vitest run` clean (442 / 442 tests pass)
- [ ] PR opened against `feat/p4-base`

## Verification log

| Check | Result |
| --- | --- |
| `npx vitest run` (full suite) | 442 / 442 passing |
| `compile-block.contract.test.ts` | green — no prompt regression |
| `npx tsc --noEmit` | clean |
| `npm run lint` | 0 errors (15 pre-existing warnings outside scope) |

## Notes
- Tool name → block mapping uses real engine constants (`book_call`, `capture_email`, `qualify_lead`).
  Spec mentioned `flag_prospect`, but `engine.ts` line 255-260 only registers `qualify_lead` for the escalation lane.
- Inspector + sim-float changes are minimal-targeted — three sibling P4 PRs touch the same files
  and rebase ahead of merge to `feat/p4-base`.
