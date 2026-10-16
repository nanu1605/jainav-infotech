import { defineConfig, devices } from '@playwright/test'

// Post-deploy smoke tests (spec §18.3) against a live environment: read-only, no seeding.
//   SMOKE_BASE_URL=https://staging.example.in SMOKE_BASIC_AUTH=user:password pnpm test:smoke
const auth = process.env.SMOKE_BASIC_AUTH
const [username = '', password = ''] = auth
  ? [auth.slice(0, auth.indexOf(':')), auth.slice(auth.indexOf(':') + 1)]
  : []

export default defineConfig({
  testDir: './tests/smoke',
  retries: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'http://localhost:3000',
    httpCredentials: auth ? { username, password } : undefined,
    // Local rehearsals of the server stack use a self-signed certificate.
    ignoreHTTPSErrors: process.env.SMOKE_INSECURE === '1',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
    },
  ],
})
