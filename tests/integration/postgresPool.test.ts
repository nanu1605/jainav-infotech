/** A connection Postgres ends while it waits in the pool, as a restart does (docs/decisions.md). */
import { getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

let payload: Payload

describe('postgres pool', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs an idle connection that Postgres ends, and the next query still runs', async () => {
    const { pool } = payload.db
    const warn = vi.spyOn(payload.logger, 'warn').mockImplementation(() => undefined)
    // Two connections at once, so the one that ends the other is not the one ended.
    const ender = await pool.connect()
    const idle = await pool.connect()
    const { rows } = await idle.query<{ pid: number }>('select pg_backend_pid() as pid')
    idle.release()
    try {
      const { rows: ended } = await ender.query<{ ended: boolean }>(
        'select pg_terminate_backend($1) as ended',
        [rows[0]?.pid],
      )
      expect(ended).toEqual([{ ended: true }])
    } finally {
      ender.release()
    }
    // Postgres sends the idle connection 57P01, as on a restart. Without the listener the pool's
    // emit throws, and Vitest fails the run on the uncaught exception.
    await vi.waitFor(
      () =>
        expect(warn).toHaveBeenCalledWith(
          { code: '57P01', message: 'terminating connection due to administrator command' },
          'postgres: an idle connection closed',
        ),
      { timeout: 5_000 },
    )
    await expect(pool.query('select 1 as one')).resolves.toMatchObject({ rows: [{ one: 1 }] })
  })
})
