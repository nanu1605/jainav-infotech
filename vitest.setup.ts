import 'dotenv/config'

import { testDatabaseUrl } from './tests/testDatabase'

// Integration tests run against the migrated test database, never the dev database, and never
// with dev schema push (which can prompt interactively).
process.env.DATABASE_URL = testDatabaseUrl()
process.env.PAYLOAD_MIGRATING = 'true'
