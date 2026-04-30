import { defineConfig } from 'vitest/config'
import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` ships inside Next.js
      // (`node_modules/next/dist/compiled/server-only`) and is not directly
      // resolvable by Vitest. Resolve via Next's bundle so test files that
      // transitively import server-only modules can compile. Using
      // `require.resolve` makes this work whether vitest runs from a git
      // worktree (whose `node_modules/` is empty) or the main checkout.
      'server-only': require.resolve('next/dist/compiled/server-only/empty.js'),
    },
  },
})
