/** pnpm seed — `payload run` loads .env, runs this module, then exits (spec §20 Phase 1). */
import config from '@payload-config'
import { getPayload } from 'payload'

import { seed } from './seed'

const payload = await getPayload({ config })
const { created, skipped } = await seed(payload)
payload.logger.info(`Seed complete: ${created.length} created, ${skipped.length} already present.`)
if (created.length) payload.logger.info(`Created: ${created.join(', ')}`)
