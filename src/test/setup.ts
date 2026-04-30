import '@testing-library/jest-dom/vitest'

// Stub the client-safe Supabase env vars at module-load time so that
// `src/lib/config.ts` (which validates them via Zod at import) doesn't
// throw inside any test file that transitively imports a service.
// Tests that need a different value still mock `@/lib/config` directly.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key'
