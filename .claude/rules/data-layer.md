---
paths:
  - 'src/lib/**/*.ts'
  - 'src/types/**/*.ts'
---

# Data Layer Conventions

- All fetch logic in `@/lib/services/` — never inline in pages.
- Supabase clients: `@/lib/supabase/server.ts` (Server Components/Actions), `@/lib/supabase/client.ts` (Client Components).
- Never import browser client in server code or vice versa.
- Always type Supabase client with `Database` from `@/types/database.ts`.
- Use `.select()` to pick only needed columns — never `select('*')`.
- RLS on every table. Service role key only in server-side admin ops.
- Regenerate types after schema changes: `npx supabase gen types typescript --project-id grkpgfphwqsawinsdbtc > src/types/database.ts`.
- All env vars through `@/lib/config.ts` with Zod validation.
- Server Actions return `{ success: boolean; data?: T; error?: string }` — never throw.
