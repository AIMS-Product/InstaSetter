import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Provide harmless shims for the public Supabase env vars so any module that
// pulls `@/lib/config` at import time (e.g. inspector.tsx → config.ts) does
// not blow up under jsdom where env vars are unset by default. Each test that
// cares about a specific env value can `vi.stubEnv(...)` to override.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon'

// Vitest doesn't auto-unmount React Testing Library containers between
// tests; explicit cleanup keeps each render in its own jsdom slate so
// queries don't pick up nodes from prior cases.
afterEach(() => {
  cleanup()
})
