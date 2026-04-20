# Flow Builder — Design

Dashboard for the marketing team to edit Instagram DM appointment-setting flows without touching code.

## 1. TL;DR

- **What**: visual editor where marketers build Bots out of Flows, and Flows out of Blocks.
- **Who edits**: marketing team. Fixed schema — they edit copy, goals, conditions, wire blocks together. They don't create new variables or tool integrations (that's engineering).
- **Who consumes**: the existing conversation engine (`src/lib/services/engine.ts`) reads the published flow at conversation start, compiles it to a system prompt + tools, runs the same Claude loop as today. Zero change to runtime shape.
- **Safety**: nothing changes in prod until shadow-mode parity is green for 1–2 weeks and you manually flip a per-brand flag. See [ROLLOUT.md](ROLLOUT.md).
- **v1**: editor + simulator + publishing + three core primitives (live reply preview, ambient triggers, compiled prompt debugger — see [PLAN.md](PLAN.md)). Everything else (scenarios, A/B, observability, AI authoring, approvals) is queued in [FUTURE.md](FUTURE.md).

## 2. Decisions (locked)

| Area                                 | Choice                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Composition                          | Many small Blocks → compose into Flows → bundle into Bots                                     |
| Message generation                   | LLM-generated with constraints (goal + tone + examples per Block)                             |
| Autonomy                             | Edit within fixed schema (copy, conditions, thresholds, wiring)                               |
| Multi-brand                          | Multi-tenant from day 1 (brand is first-class)                                                |
| Primary view                         | Split — canvas + chat thread always visible                                                   |
| Vocabulary                           | Block / Flow / Bot                                                                            |
| Simulator                            | Three-tier: Fast (stub) / Real (live Claude) / Cached (replay)                                |
| Validation                           | Enforce typed entry/exit contracts at publish                                                 |
| Rollout                              | Seed + shadow + per-brand feature flag (see ROLLOUT.md)                                       |
| Migration                            | Seed-then-fork — existing setter-v2 is a read-only seed flow                                  |
| AI authoring                         | v2                                                                                            |
| Observability v2 priority            | Conversation replay through the graph                                                         |
| Core primitives (v1)                 | Live reply preview · Ambient triggers · Compiled prompt debugger — see [PLAN.md](PLAN.md)     |
| Preview rate limit                   | 500/day/user/bot                                                                              |
| HUMAN_AGENT ambient trigger approval | No in-app queue; route to email/Slack for eng review (out of v1)                              |
| Compiled prompt debugger             | Always available — no dev-mode gate                                                           |
| Build approach                       | TDD. Red → green → refactor per slice. Contract test between compiler and engine is mandatory |

## 3. Architecture

### Runtime model

The flow is a **compile target for the existing engine**, not a new runtime.

```
Marketer edits Flow  →  Publish snapshots Flow to flow_versions (immutable)
                        ↓
New conversation starts  →  Engine reads active flow_version
                        →  Compiles graph → system prompt + tool schemas
                        →  Runs the same Claude loop that exists today
                        →  Writes node events per turn for observability (v2)
```

Key property: **one flow = one system prompt**. Blocks become prompt sections. Conditions become rules expressed in the prompt ("when location and motivation are both set, send the booking link now"). This keeps the LLM in charge of turn-level decisions (which has been the winning pattern in your data) while giving marketers deterministic control over structure and copy.

### Data model

Core new tables (see `supabase/migrations/` to be created):

- `ins_brands` — tenant row per brand. Holds brand-scoped variables (brand_name, booking_url, timezone, contact phone, etc.)
- `ins_flows` — stable identity across versions. `(id, brand_id, slug, name, scope: 'flow'|'module')`
- `ins_flow_versions` — immutable published snapshots. `(id, flow_id, version_number, status, graph jsonb, compiled jsonb, checksum, published_at, label)`
- `ins_flow_channels` — one row per entry point (e.g. `ig_organic_dm`). Holds `active_version_id`. Atomic cutover = single UPDATE.
- `ins_flow_variables` — marketer-visible typed variable registry per flow (names + types, not values).
- `ins_flow_publish_log` — immutable audit log.
- `conversations` gets `flow_version_id` + `flow_channel_id` (additive, keeps existing `prompt_version`).

**Why JSONB for the graph**: React Flow's native shape is `{nodes, edges, viewport}`. The runtime reads the whole flow once per conversation; no need to query across nodes. JSONB keeps editor save/load lossless and avoids N+1 hydration.

**Why `compiled` jsonb column**: pre-resolve Block templates at publish time (render `${brandName}`, expand references, validate variable types). Runtime reads `compiled`, never re-compiles.

**Why `ins_` prefix**: namespaces our tables away from the ManyChat sync tables (`mc_*`) and keeps migration diffs scannable.

Full schema sketch: see the Design Artifacts section at the bottom.

### Block catalog (starter)

Each Block has: **goal** (what we want this turn to achieve), **tone/examples** (how to sound), **capture rules** (variables to extract from the user's message), **exit branches** (conditions → next Block).

| Block               | Maps to current section           | Goal                                     |
| ------------------- | --------------------------------- | ---------------------------------------- |
| Opening             | new                               | First-touch hook, intent detect          |
| Qualifier           | `qualification.ts`                | Collect location + motivation at minimum |
| Objection Handler   | `objections.ts`                   | Branch per objection family              |
| Email Capture       | `email-capture.ts`                | Pair email ask with booking link         |
| Booking Handoff     | `decision-routing.ts` (gates 1-2) | Send link, confirm booked                |
| Post-Call Follow-up | `decision-routing.ts` (gate 3)    | 48h silence check, escalate price        |
| Escalation          | new                               | Hand off to human closer                 |
| Summary             | `summary-generation.ts`           | End-of-conversation write to `leads`     |

Persona + Message Constraints are **Bot-level defaults** (not Blocks) — every Block inherits them.

### Variable system

Three scopes:

- `brand.*` — permanent per brand (brand_name, booking_url, timezone)
- `contact.*` — persists across conversations with a person (name, email, location, motivation, budget, machine_count)
- `conversation.*` — one DM thread (last_intent, objection_count)

Read order: conversation → contact → brand (first hit wins). Syntax in message content: `{{contact.name}}`. Rich editor renders as a styled pill; marketers never type braces.

**Mapped vs generic**: `contact.email` writes to both `contact_variables` JSONB AND `contacts.email` column. New marketer-added variables (not an option in v1, but designed for) would live in JSONB only.

Full spec: see Design Artifacts.

## 4. UI

### Layout (split-view, three-pane)

```
┌──────────────────────────────────────────────────────────────────────┐
│ VendingPreneurs ▾   Flow: IG Organic DM ▾      Draft v13    ⚙  Share │
├────────────┬──────────────────────────────────┬──────────────────────┤
│ PALETTE    │   CANVAS (React Flow)            │  RIGHT PANE          │
│            │                                  │  ──────────          │
│ + Opening  │    ┌─ Opening ─┐                 │  [Edit] [Try] [Vars] │
│ + Qualif'r │    │ ask area  │                 │                      │
│ + Objectn  │    └─────┬─────┘                 │  When no block       │
│ + Booking  │          │                       │  selected: Try mode  │
│ + Email    │    ┌─ Qualifier ─┐               │                      │
│ + Follow   │    │ gate: loc   │               │  ● As a prospect     │
│ + Escal    │    │ gate: motiv │               │  Hey interested      │
│ + Summary  │    └──┬──────┬───┘               │                      │
│            │     yes│   no │                  │  ● Mike              │
│ FLOWS      │    ┌──▼──┐ ┌─▼──────┐            │  That's what's up.   │
│            │    │Book │ │Object  │            │  What area?          │
│ • Organic  │    │Link │ │Handler │            │                      │
│ • Cold DM  │    └─────┘ └────────┘            │  [Type as prospect…] │
│ • Retarget │                                  │                      │
│            │    + drag from palette           │  ─────────────       │
│            │                                  │  Variables           │
│            │                                  │  location: Dallas    │
│            │                                  │  motivation: side    │
│            │                                  │  budget: 7000        │
├────────────┴──────────────────────────────────┴──────────────────────┤
│ Mode: [Fast] (Real) (Cached)   Published: v12  [Validate] [Publish] │
└──────────────────────────────────────────────────────────────────────┘
```

- **Left pane (220px)**: bot/flow switcher at top, Block palette (drag to canvas), Flow list, brand settings.
- **Center (flex)**: React Flow canvas. Selected Block outlined. MiniMap bottom-right, zoom bottom-left. Auto-layout button.
- **Right pane (420px)**: three tabs — **Edit** (Block editor when block selected), **Try** (simulator), **Vars** (variable state inspector).
- **Bottom bar**: simulator mode switcher, scenarios count (v2), validate button, publish button with current published version.

### Block editor (right pane, "Edit" tab)

When a Block is selected, the right pane shows:

```
Edit Block:  Qualifier
──────────────────────

Goal  [editable text, 1 short sentence]
Collect location and motivation before sending booking link.

Tone / Voice  [inherits from Bot persona, overridable]
☐ Use Bot default
☐ Custom voice for this block

Message guidance  [rich text — what to say, examples]
+ One question at a time. Location first.
+ Weave naturally. Don't interrogate.

Example good replies:
"Whereabouts are you located?"  [+ add another]

Capture rules
──────────────
• Capture location → contact.location  [edit]
• Capture motivation → contact.motivation  [edit]
+ add capture rule

Exit branches
──────────────
→ When location AND motivation are set  →  Booking Handoff
→ When user raises an objection          →  Objection Handler
→ When silent for 24h                    →  Re-engage (Follow-up)
+ add branch
```

### Condition builder (inside exit branches)

Filter-row style (Gmail/Airtable/Facebook Ads pattern), AND by default with explicit OR groups. Operator dropdown uses marketer language (`is`, `contains`, `is set`, `is more than`). Value field is typed to the variable.

```
Match ALL of these ▾
──────────────────────
[Location]   [is set]                     [×]
[Motivation] [is set]                     [×]
┌ OR any of these ─────────────────────────┐
│ [Budget]  [is more than] [$5,000]  [×] │
│ [Intent]  [⚡ seems]      [ready]   [×] │
└──────────────────────────────────────────┘
+ Add condition    + Add OR group
```

- `⚡ seems` is an AI-judged operator family (preset enum: frustrated, interested, ready, confused, ghosting). Tooltip warns it's probabilistic — don't use for hard gates like payments.
- `is set` / `is not set` always appear at the top of the operator list, above a divider. Selecting them removes the value field entirely — no empty-string ambiguity.

### Simulator (right pane, "Try" tab)

```
Mode: [Fast] (Real) (Cached)     Reset ⟲
─────────────────────────────────────────

● Playing as: Prospect      [↓ jump to node]

   You (prospect)
   hey I saw your stuff about vending

   Mike  [Block: Opening]
   That's what's up. What area are you in?

   You
   Dallas, got about 7K

   Mike  [Block: Qualifier → Booking Handoff]
   Dallas is solid and 7K is a real starting point.
   Here's a time: https://book.vendingpreneurs.com/AK

[Type as the prospect…]
```

- Canvas highlights which Block is active as the conversation walks through it.
- Fast mode: deterministic stub (first branch, default values). Instant. Free.
- Real mode: live Claude call via existing `claude.ts` service. Uses the same tools as prod. Rate-limited 100/day/Bot.
- Cached mode: replays the last Real response for the same input hash. Used for scenarios (v2).

### Publishing flow

```
Draft v13  →  [Publish]  →  Validator runs
                           ├─ contracts pass?
                           ├─ no dead-ends / unreachable blocks?
                           ├─ variables used-before-set?
                           └─ tool configs present?
                        all green  →  snapshot to flow_versions
                                  →  update flow_channels.active_version_id
                                  →  new conversations use v13
                                  →  in-flight conversations stay on v12
```

**Rollback**: version list has "Rollback to this" per row. One click, confirmation dialog. Rollback is itself a publish event (fully audited).

## 5. v1 scope & estimates

Estimates assume one engineer, mostly full-time, building on the current stack (Next.js 16, Supabase, shadcn/ui, @xyflow/react 12).

| Area                                                  | Effort                             |
| ----------------------------------------------------- | ---------------------------------- |
| Schema migration + service layer                      | 2 days                             |
| Bot / Flow / Brand switcher + routes                  | 1 day                              |
| Left pane (palette + flow list)                       | 1 day                              |
| React Flow canvas with 8 Block node types             | 3-4 days                           |
| Block editor (right pane, goal/tone/capture/branches) | 3 days                             |
| Condition builder (filter-row UI, operator library)   | 2-3 days                           |
| Simulator — Fast mode (deterministic stub)            | 1 day                              |
| Simulator — Real mode (live Claude wiring)            | 2 days                             |
| Publish / draft / rollback / version list             | 2 days                             |
| Contract validator + publish gate                     | 2 days                             |
| Compiler: Block graph → system prompt + tools         | 3-4 days                           |
| Seed existing setter-v2 as read-only v1 flow          | 1 day                              |
| Shadow mode engine + diff logger                      | 2-3 days                           |
| Per-brand feature flag plumbing                       | 1 day                              |
| UI polish + empty states + error states               | 2-3 days                           |
| **Subtotal (foundation)**                             | **~28-35 days**                    |
| Live reply preview (PLAN.md §1, TDD)                  | 3.5 days                           |
| Ambient triggers (PLAN.md §2, TDD)                    | 6.5 days                           |
| Compiled prompt debugger (PLAN.md §3, TDD)            | 3 days                             |
| **Total v1**                                          | **~42-48 working days (~9 weeks)** |

TDD adds ~15% over non-TDD estimates. It pays for itself the first time the contract test between `compileBlock` and the engine catches prompt drift.

The "shadow mode + feature flag" line item is what keeps prod safe. It's non-negotiable.

## 6. Safety & rollout

Summary (full spec: [ROLLOUT.md](ROLLOUT.md)):

1. **Phase 0 — Seed**: port setter-v2 sections into a read-only seed flow version. Runtime still uses the hardcoded prompt. Dashboard can display + clone it.
2. **Phase 1 — Shadow**: for every live message, the flow engine produces what it WOULD say and logs a diff vs. setter-v2. Nothing is sent to Instagram. Runs for 1–2 weeks.
3. **Phase 2 — Per-brand flip**: once diffs are clean, toggle a per-brand flag. New conversations for that brand use the flow engine. Old conversations finish on setter-v2. Kill switch reverts to setter-v2 in one UPDATE.
4. **Phase 3 — Full cutover**: when all brands are stable on the flow engine, setter-v2 hardcoded sections become reference docs only.

## 7. Open questions

These don't block design but need answers before implementation:

- **Auth model for the dashboard**: Supabase auth with email login? Same users as Instagram admins? Invite flow?
- **Seed variable values for brand.\* on VendingPreneurs**: need the canonical booking URL, brand name, timezone, calendar API creds.
- **Scenario import**: do we want to pre-seed scenarios from the 3,619 classified conversations (for v2 Scenarios feature)?
- **Editor collaboration**: do two marketers edit simultaneously, or lock the draft? (Recommend: last-write-wins with a "someone else is editing" banner; full CRDT is v2+.)

---

## Design artifacts

- **Current build state + follow-ups not in this pass**: [STATUS.md](STATUS.md)
- **Build plan (overview)**: [PLAN.md](PLAN.md)
- **Rollout safety (shadow mode, feature flags, kill switch, safety invariants, per-week prod impact)**: [ROLLOUT.md](ROLLOUT.md)
- **Future (post-v1) backlog**: [FUTURE.md](FUTURE.md)

### Fully expanded TDD specs (per-slice test bodies, impl skeletons, commits)

- [SPEC-TEST-INFRA.md](SPEC-TEST-INFRA.md) — shared fixtures, stubs, Supabase harness, Playwright, CI
- [SPEC-WEEK-1.md](SPEC-WEEK-1.md) — foundation: schema + `compileBlock` + contract test + seed
- [SPEC-WEEK-2.md](SPEC-WEEK-2.md) — editor UI + Server Actions
- [SPEC-PRIMITIVE-1.md](SPEC-PRIMITIVE-1.md) — live reply preview
- [SPEC-PRIMITIVE-2.md](SPEC-PRIMITIVE-2.md) — ambient triggers
- [SPEC-PRIMITIVE-3.md](SPEC-PRIMITIVE-3.md) — compiled prompt debugger
