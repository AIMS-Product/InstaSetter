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
      // `server-only` is a runtime guard for Next.js; under Vitest we stub it
      // out so unit tests can import server-side service modules directly.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
