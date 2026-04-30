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
      // `server-only` is a Next.js marker package without a real runtime
      // entry point; alias to a stub so jsdom-based vitest can import
      // server-only modules under test.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
