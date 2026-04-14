# Conversation Analysis Pipeline — Build a Battle-Tested System Prompt

## Context

InstaSetter has a working Claude-powered DM pipeline (`setter-v1.ts`) but its system prompt was written from assumptions, not data. We have **9,856 real Instagram DM conversations** from Mike Hoffmann's account — the actual person this bot replaces. The goal is to batch-process these conversations, extract what works and what doesn't, and produce a data-driven system prompt that knows exactly what to say, what never to say, and the guided flows that get to a booking.

## Pipeline Overview

4 scripts, each run independently via `npx tsx scripts/<name>.ts`. Each phase builds on the previous phase's output. Cheap work first (local), expensive work last (API), filtered aggressively.

```
Phase 1: Extract & Normalize  →  Phase 2: Classify (Haiku Batch)  →  Phase 3: Deep Analyze (Sonnet)  →  Phase 4: Synthesize Report
   (local, ~30s)                    (~$0.70, batch API)                 (~$10, ~450 convos)                 (local + 1 Sonnet call)
```

**Total estimated cost: ~$11**

## Validation-First Approach

**Before scaling to 10K conversations, we validate with a small batch.**

### Step 1: Build Phase 1 fully (local, free)

- Extract and normalize all 9,856 conversations
- Verify tiering counts, spot-check encoding fixes

### Step 2: Sample batch (~50 conversations)

- Hand-pick ~50 conversations across tiers: ~10 with booking links, ~10 with emails, ~10 medium-length, ~10 short, ~10 with objections
- Run them through classify (Haiku, direct API — no batch needed for 50) and deep-analyze (Sonnet)
- **Cost: < $0.50**
- Review output together — are the classifications accurate? Is the taxonomy right? Is the deep analysis producing useful prompt recommendations?

### Step 3: Adjust and scale

- Tweak taxonomy, prompts, or filtering based on sample results
- Then run the full pipeline with confidence

## File Structure

```
scripts/
  types.ts              # All pipeline type definitions
  extract.ts            # Phase 1: read Instagram export, normalize, tier
  classify.ts           # Phase 2: Haiku batch classification
  analyze-deep.ts       # Phase 3: Sonnet deep analysis on high-value convos
  synthesize.ts         # Phase 4: aggregate into pattern report + prompt recs
  lib/
    instagram.ts        # Instagram export parsing (UTF-8 decode, loaders)
    claude-client.ts    # Anthropic SDK wrapper (batch API, rate limiting)
    progress.ts         # Checkpoint/resume for idempotent re-runs
  output/               # All generated outputs (gitignored)
```

---

## Phase 1: Extract & Normalize (`scripts/extract.ts`)

**No API calls. Local only.**

Reads all 9,856 conversations from `docs/instagram-mikehoffmannofficial-2026-04-13-1cXnJ1tx/your_instagram_activity/messages/inbox/`, normalizes encoding, computes heuristic metadata, and assigns each conversation to a processing tier.

### Key operations:

- **UTF-8 fix**: Instagram double-encodes UTF-8 as Latin-1 (`\u00e2\u0080\u0099` → `'`). Decode with `Buffer.from(s, 'latin1').toString('utf-8')`
- **Heuristic signals** (computed locally, no API):
  - `openerType`: private_reply (78%) vs prospect_first vs owner_first
  - `hasBookingLink`: Calendly/OnceHub/clkmg URLs detected (~134 convos)
  - `hasEmail`: email regex matches (~64 convos)
  - `hasCantReceive`: dead-end threads (~409 convos)
  - Keyword flags: masterclass, partner call, credit, location mentions

### Tiering logic:

| Tier      | Count (est.) | Criteria                                                                                              | API treatment                          |
| --------- | ------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `skip`    | ~5,100       | System-only messages, 2-msg dead threads, can't-receive, group chats                                  | None                                   |
| `shallow` | ~3,100       | 3-10 substantive messages, no booking/email signals                                                   | Haiku classification                   |
| `deep`    | ~1,600       | 6+ substantive msgs with qualification keywords, OR has booking links, OR has emails, OR 20+ messages | Haiku classification + Sonnet analysis |

**Output**: `scripts/output/normalized.json`

---

## Phase 2: Classify (`scripts/classify.ts`)

**Haiku via Message Batches API (~$0.70)**

Takes all `shallow` + `deep` tier conversations (~4,700) and classifies each with Haiku using the batch API (50% cost discount, automatic rate limiting).

### Classification taxonomy:

**Outcome** (what happened):
`booked_call` | `email_captured` | `qualified_warm` | `masterclass_delivered` | `objection_unresolved` | `went_silent` | `opted_out` | `spam_or_irrelevant` | `too_short`

**Engagement level**: `high` | `medium` | `low` | `none`

**Stage reached** (how far the conversation got):
`opener_only` → `rapport` → `qualification` → `objection_handling` → `value_delivery` → `call_booking` → `post_booking` → `follow_up`

**Prospect temperature**: `hot` | `warm` | `cold`

**Objection types**: `price` | `timing` | `trust` | `already_has_machines` | `needs_to_think` | `spouse_approval` | etc.

### Batch API flow:

1. Build compact prompts (strip metadata, content only)
2. Submit via `client.messages.batches.create()` (up to 10K per batch)
3. Poll `client.messages.batches.retrieve()` until complete
4. Stream results, parse JSON classifications
5. Write batch ID to `scripts/output/classify-batch-id.json` for idempotent resume

**Output**: `scripts/output/classifications.json`

---

## Phase 3: Deep Analysis (`scripts/analyze-deep.ts`)

**Sonnet, sequential with rate limiting (~$10, ~450 conversations)**

Selects the highest-value conversations from Phase 2 and sends them to Sonnet for detailed pattern extraction.

### Selection from Phase 2:

- All `booked_call` outcomes (~100-134)
- All `email_captured` outcomes (~64)
- Top engagement convos that reached `qualification` or beyond (cap 200)
- Unresolved objections with 10+ messages (cap 100)
- **Total: ~400-500 conversations**

### What Sonnet extracts per conversation:

- `conversation_flow`: ordered list of moves (e.g. `["comment_trigger", "masterclass_offer", "prospect_confirms", "qual_question_location", ...]`)
- `effective_techniques`: what moved the conversation forward
- `ineffective_techniques`: what stalled or killed momentum
- `missed_opportunities`: things Mike could have done but didn't
- `prompt_sections`: maps observations to the 8 sections of `setter-v1.ts` with suggested improvements
- `golden_path_score`: 0-100 (how close to ideal booking flow)

### Resilience:

- 50 req/min rate limiting with exponential backoff
- Progress checkpointed after each conversation to `scripts/output/deep-progress.json`
- Resume from last checkpoint on re-run

**Output**: `scripts/output/deep-analysis.json`

---

## Phase 4: Synthesize (`scripts/synthesize.ts`)

**Mostly local computation + 1 Sonnet call for qualitative synthesis**

Aggregates all results into a final `PatternReport` that directly informs system prompt changes.

### Report sections:

1. **Outcome distribution** — how many convos booked, captured email, went silent, etc.
2. **Golden paths** — the most common message sequences that lead to bookings, with examples
3. **Anti-patterns** — what kills conversations, at which stage, with examples
4. **Objection analysis** — each objection type, frequency, resolution rate, best/worst responses
5. **Prompt recommendations** — specific changes to each of the 8 sections in `setter-v1.ts`, ranked by priority, with evidence from actual conversations
6. **Qualification insights** — which signals predict bookings

**Output**: `scripts/output/pattern-report.json` + `scripts/output/pattern-report.md` (human-readable)

---

## Shared Utilities

### `scripts/lib/instagram.ts`

- `decodeInstagramText()` — UTF-8 double-encoding fix
- `loadConversation()` / `loadAllConversations()` — parse Instagram export format
- `isSystemMessage()` — detect "liked a message", "sent a private reply", etc.
- `extractEmails()` / `extractLinks()` — regex extraction
- `formatConversationForClaude()` — compact format for API calls

### `scripts/lib/claude-client.ts`

- Singleton Anthropic client (reads `ANTHROPIC_API_KEY` from `.env.local`)
- Batch API helper (create, poll, stream results)
- Rate-limited sequential call helper with retry
- Model constants: Haiku for classification, Sonnet for analysis

### `scripts/lib/progress.ts`

- `loadProgress()` / `saveProgress()` — checkpoint/resume for idempotent re-runs

---

## Critical Files

| File                                                       | Role                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/prompts/setter-v1.ts`                             | The system prompt this pipeline improves — 8 sections, 124 lines |
| `src/lib/services/claude.ts`                               | Existing Claude SDK patterns to follow                           |
| `src/types/lead.ts`                                        | LeadSummary schema — classification taxonomy must align          |
| `src/types/enums.ts`                                       | Domain constants (statuses, roles, sources)                      |
| `docs/instagram-*/your_instagram_activity/messages/inbox/` | 9,856 conversation directories                                   |

## Dependencies

- `tsx` (already available, v4.21.0)
- `@anthropic-ai/sdk` (already in package.json)
- No new dependencies needed — scripts use Node.js built-ins + existing SDK

## Execution

### Validation run (what we build first):

```bash
npx tsx scripts/extract.ts                # Phase 1 — local, ~30s, all 9,856 convos
npx tsx scripts/classify.ts --sample 50   # Phase 2 — 50 convos via direct API (no batch)
npx tsx scripts/analyze-deep.ts --sample  # Phase 3 — only the sample convos through Sonnet
```

Review `scripts/output/sample-results.json` together. If classifications look right and deep analysis is producing useful prompt recommendations, proceed to full scale.

### Full run (after validation):

```bash
npx tsx scripts/classify.ts        # Phase 2 — full batch API, ~4,700 convos
npx tsx scripts/analyze-deep.ts    # Phase 3 — ~450 high-value convos
npx tsx scripts/synthesize.ts      # Phase 4 — aggregate + report
```

## Verification

- **Phase 1**: `scripts/output/normalized.json` exists, tier counts match expectations (~5100 skip / ~3100 shallow / ~1600 deep)
- **Sample validation**: Read sample classifications and deep analyses — are outcomes correct? Is taxonomy granular enough? Are prompt recommendations specific and actionable?
- **Phase 2 (full)**: Spot-check 10 random classifications against actual conversation content
- **Phase 3 (full)**: Read 5 deep analyses for `booked_call` conversations — golden path scores should be 70+
- **Phase 4**: `pattern-report.md` contains actionable recommendations for each prompt section with real conversation evidence
