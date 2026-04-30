// Test-only shim for the `server-only` import. The real package throws when
// imported from a non-server context (jsdom). This shim is wired in
// `vitest.config.ts` via the `server-only` alias.
export {}
