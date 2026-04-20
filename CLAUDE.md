@AGENTS.md

# InstaSetter

Instagram DM appointment setting automation using Inro API + Claude. Trained on hundreds of real conversations to automate appointment booking via Instagram DMs.

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (project: `grkpgfphwqsawinsdbtc`, region: US West)
- **Hosting:** Vercel (project: `insta-setter`, scope: `aimanagingservices`)
- **GitHub:** `AIMS-Product/InstaSetter`
- **External API:** Inro (Instagram DM automation)

## Key Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # TypeScript check
```

## Supabase

```bash
supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts
supabase migration new <name>
supabase db push
```

## Environment Variables

All vars validated via Zod in `src/lib/config.ts`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Flow Builder (in-progress v1 design)

Marketer-facing visual editor that extracts `src/lib/prompts/sections/*.ts` into editable Blocks composed into Flows bundled into Bots. Not yet built; design is locked.

**Read before touching any flow-builder code:**

- [docs/flow-builder/README.md](docs/flow-builder/README.md) — design decisions, architecture, UI
- [docs/flow-builder/PLAN.md](docs/flow-builder/PLAN.md) — TDD build plan (~9 weeks)
- [docs/flow-builder/ROLLOUT.md](docs/flow-builder/ROLLOUT.md) — safety invariants + per-week prod impact
- [docs/flow-builder/FUTURE.md](docs/flow-builder/FUTURE.md) — explicitly deferred to v2+
- [docs/flow-builder/SPEC-TEST-INFRA.md](docs/flow-builder/SPEC-TEST-INFRA.md) — fixtures, stubs, Supabase harness, CI
- [docs/flow-builder/SPEC-WEEK-1.md](docs/flow-builder/SPEC-WEEK-1.md) — foundation: schema + `compileBlock` + contract test + seed
- [docs/flow-builder/SPEC-WEEK-2.md](docs/flow-builder/SPEC-WEEK-2.md) — editor UI + Server Actions
- [docs/flow-builder/SPEC-PRIMITIVE-1.md](docs/flow-builder/SPEC-PRIMITIVE-1.md) — live reply preview
- [docs/flow-builder/SPEC-PRIMITIVE-2.md](docs/flow-builder/SPEC-PRIMITIVE-2.md) — ambient triggers
- [docs/flow-builder/SPEC-PRIMITIVE-3.md](docs/flow-builder/SPEC-PRIMITIVE-3.md) — compiled prompt debugger

**Non-negotiables:** additive-only schema, feature-flagged code paths (default off in prod), the `compile-block.contract.test.ts` must pass on every PR. Weeks 1-6 have zero change to prod runtime; Week 7 is the first live per-brand cutover. See [ROLLOUT.md](docs/flow-builder/ROLLOUT.md) for the full safety-invariant list.
