import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/**'],
    server: {
      deps: {
        // `server-only` throws under jsdom — alias it to a no-op for tests so
        // server-side modules importing it can be unit-tested.
        inline: ['server-only'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/test/server-only.shim.ts'),
    },
  },
})
