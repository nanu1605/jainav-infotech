import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Next resolves server-only itself; under Vitest it is the empty server build.
  resolve: { alias: { 'server-only': 'next/dist/compiled/server-only/empty.js' } },
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          globalSetup: ['./tests/globalSetup.ts'],
          // Files share one Postgres database: run them one at a time.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
})
