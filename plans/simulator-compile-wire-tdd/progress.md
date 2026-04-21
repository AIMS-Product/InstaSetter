# Simulator ⇄ Block Inspector Wiring — Progress

## Execution Plan

Wave 1: Issue 1
Wave 2 (parallel): Issue 2, Issue 5
Wave 3: Issue 3 (blocked by 2)
Wave 4: Issue 4 (blocked by 3)
Wave 5 (parallel): Issue 6 (blocked by 4, 5), Issue 8 (blocked by 4)
Wave 6: Issue 7 (blocked by 6)
Wave 7: Issue 9 (blocked by 6, 7, 8)

## Status

| #   | Target                                                         | Status  | RED | GREEN | REFACTOR | Commit  | Agent         |
| --- | -------------------------------------------------------------- | ------- | --- | ----- | -------- | ------- | ------------- |
| 1   | Define BlockOverrides type + Zod schema                        | DONE    | ✓   | ✓     | ✓        | 2c62953 | issue-1-agent |
| 2   | compileBlock with no overrides = buildSystemPrompt (byte)      | DONE    | ✓   | ✓     | ✓        | 1e161e6 | issue-2-agent |
| 3   | compileBlock appends Active Block Directive on activeBlockType | DONE    | ✓   | ✓     | ✓        | 5adecac | issue-3-agent |
| 4   | compileBlock uses override.goal / override.guidance            | DONE    | ✓   | ✓     | ✓        | f82f65c | issue-4-agent |
| 5   | simulateReplyAction accepts optional overrides (schema only)   | DONE    | ✓   | ✓     | ✓        | d0b9fba | issue-5-agent |
| 6   | simulateReplyAction routes via NEXT_PUBLIC_FLOW_COMPILE flag   | DONE    | ✓   | ✓     | ✓        | 0218deb | issue-6-agent |
| 7   | Simulator panel threads active block state to action           | PENDING | -   | -     | -        | -       | -             |
| 8   | Contract test pinned for CI (8 block types × 2 booking URLs)   | DONE    | ✓   | ✓     | ✓        | 7079d00 | issue-8-agent |
| 9   | End-to-end smoke: edited goal reaches Claude system prompt     | PENDING | -   | -     | -        | -       | -             |

## Verification

- [ ] Untracked dependency check
- [ ] Full test suite (`npm run test`)
- [ ] Type check (`npm run type-check`)
- [ ] Build check (`npm run build`)
