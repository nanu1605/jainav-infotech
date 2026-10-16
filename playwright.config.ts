import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    // E2E_BASE_URL runs the suite against another server, e.g. a local production build.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // PLAYWRIGHT_CHANNEL=chrome uses an installed Chrome instead of the downloaded Chromium.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
    },
  ],
  globalSetup: './tests/e2e/globalSetup.ts',
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        reuseExistingServer: true,
        url: 'http://localhost:3000',
        timeout: 180_000,
      },
})
