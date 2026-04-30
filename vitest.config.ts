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
      // `server-only` is provided by Next at build time but isn't
      // resolvable from vitest. Map it to a no-op shim so server-only
      // service modules can be imported (and properly mocked) in unit
      // tests. The runtime client/server boundary is still enforced by
      // `createServiceRoleClient()` calling `getSupabaseServerConfig()`.
      'server-only': path.resolve(__dirname, './src/test/server-only-shim.ts'),
    },
  },
})
