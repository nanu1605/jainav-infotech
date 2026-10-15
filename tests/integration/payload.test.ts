import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload

describe('payload', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('boots against Postgres and queries users', async () => {
    const users = await payload.find({ collection: 'users', depth: 0, overrideAccess: true })
    expect(users.docs).toBeInstanceOf(Array)
  })
})
