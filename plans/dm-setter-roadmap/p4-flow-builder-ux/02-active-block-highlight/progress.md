# P4.02 — Simulator active-block highlight · progress

## Branch + base
- Branch: `feat/p4-02-active-block-highlight`
- Base: `feat/p4-base` (stacked PR — see PR strategy in spec)
- Worktree: `.claude/worktrees/agent-a00282e3376367d02`

## What's landed
- (running log appended as commits land)

## Status
- [ ] RED: `inferActiveBlock` unit tests fail because module is missing
- [ ] GREEN: `active-block.ts` ships pure heuristic + label helper
- [ ] RED: `sim_receive` reducer test asserts inference lights `booking` from `book_call`
- [ ] GREEN: store wires `inferActiveBlock` into `sim_receive`
- [ ] WIRE: canvas active treatment upgraded (border + pulse + reduced-motion)
- [ ] WIRE: `ActiveBlockLegend` mounts above canvas summary, click selects active block
- [ ] WIRE: `sim-float` chip swaps to "Currently replying as" while pending
- [ ] WIRE: inspector header shows "Active" pill when inspected block is the active block
- [ ] VERIFY: `npm run lint && npm run type-check && npx vitest run` clean
- [ ] PR opened against `feat/p4-base`

## Notes
- Tool name → block mapping uses real engine constants (`book_call`, `capture_email`, `qualify_lead`).
  Spec mentioned `flag_prospect`, but `engine.ts` line 255-260 only registers `qualify_lead` for the escalation lane.
- Inspector + sim-float changes are minimal-targeted — three sibling P4 PRs touch the same files
  and rebase ahead of merge to `feat/p4-base`.
