// Vitest shim for the `server-only` package.
//
// Next.js ships `server-only` as a runtime sentinel that throws when
// imported in a client bundle. The package isn't installed as a direct
// dependency in this project (Next provides it transitively at build
// time), so vitest can't resolve it under jsdom. The shim is a no-op
// — tests that import server-only modules just need the import to
// succeed. Server-only safety is enforced at runtime via
// `createServiceRoleClient()`, not at compile time.

export {}
