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
