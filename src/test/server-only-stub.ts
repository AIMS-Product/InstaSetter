// `server-only` ships only a runtime-error CJS file in production, designed
// to fail the build if a server-only module is bundled into a client chunk.
// Vitest runs in jsdom and therefore can't resolve the marker — this empty
// stub stands in via vitest.config.ts alias so server-only modules can be
// imported in tests.
export {}
