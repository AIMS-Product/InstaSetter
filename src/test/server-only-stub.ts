// Vitest alias target for the `server-only` package — see vitest.config.ts.
// The real module throws when bundled into a client component; under tests we
// just want it to be a no-op so server-side service modules can be imported.
export {}
