# P1.03 Skeptical Playbook — Progress

Branch: `feat/p1-03-skeptical-playbook`
Spec: `plans/dm-setter-roadmap/p1-trust-conversation/03-skeptical-playbook.md`
Decision: ship `request_human_review` tool (not extending `generate_summary`).

## Steps (TDD order)

- [ ] RED: pause-services test
- [ ] GREEN: migration `20260501000000_conversation_human_review_pauses.sql`
- [ ] GREEN: `src/lib/services/conversation-pauses.ts`
- [ ] RED: assert `request_human_review` tool registration
- [ ] GREEN: register tool in `src/lib/services/claude.ts`
- [ ] RED: engine `routeLeadEvents` writes pause + sets `flagged`
- [ ] GREEN: add `case 'request_human_review'` branch in engine
- [ ] RED: `processMessage` short-circuits when paused but still stores inbound
- [ ] GREEN: pre-call pause check after `findOrCreateActiveConversation`
- [ ] RED: prompt section structure (`skeptical-playbook.test.ts`)
- [ ] GREEN: `src/lib/prompts/sections/skeptical-playbook.ts` + plug into `setter-v2`
- [ ] CHECK: contract test still byte-for-byte aligned (compileBlock calls buildSystemPrompt)
- [ ] WIRE: dashboard banner + Resume action
- [ ] WIRE: `Needs human` chip in inbox
- [ ] PUSH: branch + open PR

## Notes

- Migration timestamp slot: `20260501000000` (P1 reserved range, first slot).
- New tool name: `request_human_review`. Not in existing `KNOWN_TOOLS` (`capture_email`, `generate_summary`, `qualify_lead`, `book_call`).
- Conversation status set to `flagged` on tool call. Existing column `flagged_reason` is reused.
- Per-conversation pause complements existing per-flow pause (`flow_runtime_controls`); global pause still wraps everything.
