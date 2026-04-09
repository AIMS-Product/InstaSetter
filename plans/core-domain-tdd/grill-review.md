# Grill Review: Core Domain Foundation

Plan: plans/core-domain-tdd/plan.md
Date: 2026-04-09
Status: COMPLETE

---

## Round 1: Completeness + Dependencies

### Questions Asked

1. No issue covers closing a conversation. When Claude calls generate_summary, should we also transition the conversation to status='completed'?
2. The Inro webhook payload doesn't include a `source` field, but the contacts table has one. Where should it come from?
3. Issue 18 checks for duplicates via `success: false`, but Issue 11 returns `isDuplicate: true`. Which contract?
4. The middleware refreshes auth sessions on every request. Should the webhook route be excluded?

### Answers

1. New Issue 21 — separate issue for closeConversation service function
2. Add `source` as optional field to the Inro webhook payload schema (we control the Inro scenario config)
3. Fix Issue 18 to check `isDuplicate === true` (Issue 11's contract is correct)
4. Separate issue for middleware exclusion

### Decisions Made

- New Issue 21: `closeConversation(client, conversationId, summary)` — sets status='completed', stores summary, sets ended_at. Called from routeLeadEvents when generate_summary fires.
- New Issue 22: Middleware config to exclude `/api/webhooks/*` from auth session refresh.
- Issue 4 modified: add optional `source` field to inroWebhookSchema
- Issue 18 modified: fix dedup check to use `result.isDuplicate === true`

### Plan Changes Required

- [x] Issue 4: Add optional `source` field (ContactSource enum) to schema
- [x] Issue 8: Update to pull `source` from webhook payload with default 'organic_dm'
- [x] Issue 18: Fix dedup contract to check `isDuplicate` not `success: false`
- [x] Add Issue 21: closeConversation service (Wave 2b, blocked by Issue 9)
- [x] Add Issue 22: Middleware webhook exclusion (Wave 1, no deps)
- [x] Issue 20: Add dependency on Issue 21

---

## Round 2: Technical Feasibility + Ambiguity

### Questions Asked

1. Should we install @anthropic-ai/sdk now for type safety, or use raw types?
2. qualify_lead tool call — stores data where? Or is it a no-op?
3. Brand name for system prompt — constant, env var, or hardcode?
4. Dedup hash uses contactId but message service has conversationId — which to use?

### Answers

1. Install SDK — types are useful even without API key at runtime
2. No-op with logging — Claude consolidates everything into generate_summary
3. Environment variable — BRAND_NAME in config.ts with Zod validation
4. Use conversationId — simpler, no extra DB lookup, dedup is per-conversation

### Decisions Made

- Install `@anthropic-ai/sdk` as dependency. Issue 16 uses SDK types for request/response.
- `qualify_lead` tool call: logged to integration_events but takes no action. Claude includes all data in generate_summary.
- Add `BRAND_NAME` to server config (env var, Zod-validated). Issue 15 reads from config.
- Dedup hash uses conversationId instead of contactId. Issue 6 signature generalized.

### Plan Changes Required

- [x] Issue 6: Change function signature from `contactId` to generic `scopeId` parameter
- [x] Issue 7: Add `BRAND_NAME` to serverEnvSchema alongside ANTHROPIC_API_KEY
- [x] Issue 11: Pass conversationId (not contactId) to dedup hash
- [x] Issue 16: Install @anthropic-ai/sdk, use SDK types (MessageCreateParamsNonStreaming, etc.)
- [x] Issue 20: qualify_lead is no-op with integration_events logging only

---

## Final State

22 issues across 5 waves. 2 issues added, 7 issues modified, 0 removed.

Changes applied:

- 2 issues added (21: close conversation, 22: middleware exclusion)
- 7 issues modified (4, 6, 7, 8, 11, 16, 18, 20)
- 0 issues removed
- 1 dependency added (20 → 21)

Unresolved concerns (noted for awareness):

- `createMockClient()` helper appears in test sketches but is never defined — implementer should create a shared test utility in `src/test/helpers.ts`
- `buildClaudeMessages` import path in Issue 19's test sketch references `@/lib/services/claude` but the function lives in `@/lib/services/message` — implementer should use the correct import
- Service role client could be a singleton for performance — consider during implementation
