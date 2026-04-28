# Route Map — Flow Builder Section

Discovered: 2026-04-28
Scope: `/dashboard/flows/*` only (per user: "on our flow builder section")
Prior whole-app review archived in `_archive-2026-04-20/`.

## Pages

| Route                     | File                                  | Auth Required?     | Dynamic?       | Notes                                                           |
| ------------------------- | ------------------------------------- | ------------------ | -------------- | --------------------------------------------------------------- |
| /dashboard/flows/[flowId] | app/dashboard/flows/[flowId]/page.tsx | No (no middleware) | Yes ([flowId]) | Routes: any flowId. Mobile gate < 1024px. Desktop: full builder |
| /dashboard/flows          | (none)                                | —                  | —              | Returns 404 — no index page; flows are accessed by direct ID    |

## In-Page Sub-Views (tabs, no URL change)

The flow builder is a single page with five tabs rendered via state, not routes:

| Tab            | File                             | Component                                        |
| -------------- | -------------------------------- | ------------------------------------------------ |
| flow (default) | directions/b-stage/index.tsx     | BCanvas + PaletteDrawer + BInspector + BSimFloat |
| runs           | related-pages/page-runs.tsx      | PageRuns                                         |
| variables      | related-pages/page-variables.tsx | PageVariables                                    |
| versions       | related-pages/page-versions.tsx  | PageVersions                                     |
| bot            | related-pages/page-bot.tsx       | PageBot                                          |

## Key components inside the canvas

- `BCanvas` — visual graph editor (uses @xyflow/react)
- `PaletteDrawer` — block palette (drag in new blocks)
- `BInspector` — right-side block details panel
- `BSimFloat` — floating simulator for replies
- `BHeader` — header with Publish, brand, simulator toggle
- `Toast` — bottom toast for confirmations + undo

## Test Flow IDs

Any string works (no validation). Will use `ig-organic-dm` (the canonical seed) and a random string `unknown-flow-test`.

## Screen-size Gating

- `< 1024px` viewport → Mobile Gate (custom screen with link to /dashboard/conversations)
- `>= 1024px` → Full Flow Builder canvas

## Routes to test

1. `/dashboard/flows/ig-organic-dm` — main canvas (default tab: flow)
2. `/dashboard/flows/ig-organic-dm` switching tab to runs
3. `/dashboard/flows/ig-organic-dm` switching tab to variables
4. `/dashboard/flows/ig-organic-dm` switching tab to versions
5. `/dashboard/flows/ig-organic-dm` switching tab to bot
6. `/dashboard/flows/unknown-flow-test` — verify dynamic route handling

## Out of scope (other dashboard areas)

- /, /dashboard, /dashboard/conversations, /dashboard/marketing-sources — not flow builder
- API routes — server-only

## Destructive / external actions

Per the architecture, `Publish` writes to a live runtime. Per safety policy:

- Do NOT click `Publish` (mutates production prompt)
- DO screenshot it for visual review
- Block deletes inside canvas: only safe if the persona created the block this session — but the canvas seeds with prior-existing blocks. Use undo/cancel patterns; do not click Delete on seeded blocks.
