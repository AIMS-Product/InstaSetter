// Vitest stub for the `server-only` package. The real package throws at
// import time inside any client bundle to enforce the server boundary; in
// the test runner that boundary doesn't exist, so the stub is a no-op.
export {}
