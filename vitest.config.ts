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
      // `server-only` is a Next.js virtual module that has no runtime; in
      // Vitest we redirect it to an empty stub so server services that
      // import it can still be exercised in unit tests.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
