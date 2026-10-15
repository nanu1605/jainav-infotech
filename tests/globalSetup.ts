import { execSync } from 'node:child_process'

import 'dotenv/config'

import { testDatabaseUrl } from './testDatabase'

/** Brings the test database up to date with the committed migrations before any test runs. */
export default function setup() {
  execSync('pnpm payload migrate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl(), PAYLOAD_MIGRATING: 'true' },
  })
}
