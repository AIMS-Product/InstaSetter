# P1.01 Limitations labels — progress log

Branch: `feat/p1-01-limitations-labels` (worktree at `.claude/worktrees/agent-ac431f3fc9d3717f2`)

## Step-by-step

### 1. Setup

- [x] Read spec, conventions, execution-protocol, AGENTS.md, CLAUDE.md
- [x] Created branch `feat/p1-01-limitations-labels` from worktree HEAD (commit `80d5d98`)
- [x] Mapped repo: pages, related-pages, Chip primitive, vitest config, existing test setup

### 2. RED — catalog test

- [x] `src/lib/dashboard/__tests__/surface-labels.test.ts` (schema + route-coverage assertions)

### 3. GREEN — catalog

- [x] `src/lib/dashboard/surface-labels.ts`

### 4. RED — component test

- [x] `src/components/ui/__tests__/surface-badge.test.tsx`

### 5. GREEN — component

- [x] `src/components/ui/surface-badge.tsx` (composes existing `Chip` tone palette)

### 6. WIRE

- [x] `/dashboard` (home) — UNDER_CONSTRUCTION
- [x] `/dashboard/conversations` — READ_ONLY (threaded `surfaceLabelKey` through `<PageRuns>`)
- [x] `/dashboard/conversations/[id]` — READ_ONLY
- [x] `/dashboard/marketing-sources` — LIVE
- [x] `/dashboard/flows` — READ_ONLY
- [x] `/dashboard/flows/[flowId]` — READ_ONLY (Flow tab via `BHeader`; Bot/Variables/Versions subtabs via extended `RPHeader`)
- [x] Extended `RPHeader` with optional `surfaceLabelKey` prop

### 7. VERIFY

- [x] `npm test` — all 422 tests pass (19 new: 9 catalog + 10 component)
- [x] `npm run lint` — no new warnings/errors in changed files
- [x] `npm run type-check` — clean
- [x] `npm run build` — green (with `.env.local` symlink)
- [x] compile-block.contract.test.ts — 33/33 green
- [ ] Manual smoke — deferred to user before push (instructions: do not push, leave branch local)
