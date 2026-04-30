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
      // `server-only` is a Next.js runtime guard that only ships with the
      // Next bundler. Map it to an empty stub for unit tests so server-side
      // services can still be imported under jsdom.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
