# Route Map

Discovered: 2026-04-20
App: InstaSetter (Next.js 16 App Router)
Base URL: http://localhost:3000
Total pages: 5 + 404
Total API routes: 2 (server-to-server webhooks, not user-facing)
Auth: none (no login/signup/middleware)

## Pages

| Route                           | File                                          | Auth Required? | Dynamic? | Notes                                                                |
| ------------------------------- | --------------------------------------------- | -------------- | -------- | -------------------------------------------------------------------- |
| `/`                             | src/app/page.tsx                              | No             | No       | Marketing landing, 2 CTAs                                            |
| `/dashboard`                    | src/app/dashboard/page.tsx                    | No             | No       | Dashboard index, 1 CTA to flow                                       |
| `/dashboard/conversations`      | src/app/dashboard/conversations/page.tsx      | No             | No       | Conversations list, 100 newest-first, revalidate=0                   |
| `/dashboard/conversations/[id]` | src/app/dashboard/conversations/[id]/page.tsx | No             | Yes      | Timeline of messages + tool events (resolve ID at runtime from list) |
| `/dashboard/flows/[flowId]`     | src/app/dashboard/flows/[flowId]/page.tsx     | No             | Yes      | Flow Builder: Flow / Runs / Variables / Versions / Bot tabs          |
| `/not-found-placeholder`        | src/app/not-found.tsx                         | No             | No       | Renders on any unknown route                                         |

## Navigation Targets (from code)

| Target                             | Source                          | Mechanism                                          |
| ---------------------------------- | ------------------------------- | -------------------------------------------------- |
| `/dashboard/conversations`         | `/`                             | `<Link>` "Conversations →"                         |
| `/dashboard/flows/ig-organic-dm`   | `/`, `/dashboard`               | `<Link>` "Flow Builder →" / "Open IG Organic DM →" |
| `/dashboard`                       | `/dashboard/conversations`      | `<Link>` "← Dashboard"                             |
| `/dashboard/conversations/${c.id}` | `/dashboard/conversations`      | `<Link>` per row                                   |
| `/dashboard/conversations`         | `/dashboard/conversations/[id]` | `<Link>` "← All conversations"                     |
| `/`                                | `/not-found`                    | `<Link>` "Go home"                                 |

No `router.push` / `router.replace` / `redirect()` found in src/app.

## API Routes (excluded from exploration)

| Endpoint                  | File                                    | Kind             |
| ------------------------- | --------------------------------------- | ---------------- |
| `/api/webhooks/sendpulse` | src/app/api/webhooks/sendpulse/route.ts | External webhook |

## Flow Builder internal navigation (state-based, not URL)

PageNav sidebar on `/dashboard/flows/[flowId]` switches view via `onChange`:

- Flow (default)
- Runs
- Variables
- Versions
- Bot

All five must be clicked during exploration.

## Routes to test

1. `/`
2. `/dashboard`
3. `/dashboard/conversations`
4. `/dashboard/conversations/{first-real-id}` (fetched from list at runtime)
5. `/dashboard/flows/ig-organic-dm` (known slug)
6. `/some-bogus-path-to-trigger-404` (verifies not-found.tsx)

## Destructive / external action inventory

None observed in source. No create/delete/logout/payment flows. The
destructive-action policy has no applicable targets for this run — exploration
is effectively read-only.
