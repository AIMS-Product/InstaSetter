import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // The Next.js `server-only` package exists at runtime (in production
      // bundles) but not in our test runner; alias it to a no-op stub so
      // services that mark themselves server-only are still importable
      // from a Vitest spec.
      'server-only': path.resolve(__dirname, './src/test/server-only.ts'),
    },
  },
})
