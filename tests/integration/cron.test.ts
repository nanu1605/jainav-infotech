/**
 * The tick Vercel Cron sends (vercel.json), and the rate limiter's queries, which must get through
 * Supabase's transaction pooler.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const { GET } = await import('@/app/api/v1/cron/route')
const { limit } = await import('@/lib/rateLimit')

let payload: Payload
const db = () => (payload.db as unknown as PostgresAdapter).drizzle
const tick = (authorization?: string) =>
  GET(
    new Request('http://localhost:3000/api/v1/cron', {
      headers: authorization ? { authorization } : {},
    }),
  )

beforeAll(async () => {
  payload = await getPayload({ config })
  vi.stubEnv('CRON_SECRET', 'cron-secret-for-tests')
})

afterAll(() => vi.unstubAllEnvs())

describe('GET /api/v1/cron', () => {
  it('answers 401 without the secret, and when none is set', async () => {
    expect((await tick()).status).toBe(401)
    expect((await tick('Bearer wrong')).status).toBe(401)
    vi.stubEnv('CRON_SECRET', '')
    expect((await tick('Bearer ')).status).toBe(401)
    vi.stubEnv('CRON_SECRET', 'cron-secret-for-tests')
  })

  it('releases a stuck job, runs it and queues what is scheduled', async () => {
    // A schedule counts from the last run in the stats global, so an earlier run's leftovers would
    // make reconcileOrders due at once (run and deleted) or already queued.
    await db().execute(sql`DELETE FROM payload_jobs_stats`)
    await db().execute(sql`DELETE FROM payload_jobs WHERE task_slug = 'reconcileOrders'`)
    const job = await payload.jobs.queue({ task: 'cleanup', input: {} })
    await db().execute(
      sql`UPDATE payload_jobs SET processing = true, updated_at = now() - interval '31 minutes' WHERE id = ${job.id}`,
    )

    const response = await tick('Bearer cron-secret-for-tests')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const left = await payload.find({
      collection: 'payload-jobs',
      where: { id: { equals: job.id } },
      depth: 0,
      overrideAccess: true,
    })
    expect(left.docs).toHaveLength(0)
    const { docs: scheduled } = await payload.find({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'reconcileOrders' } },
      depth: 0,
      overrideAccess: true,
    })
    expect(scheduled).toHaveLength(1)
    expect(Date.parse(scheduled[0]?.waitUntil ?? '')).toBeGreaterThan(Date.now())
  })
})

describe('the rate limiter', () => {
  it('names no statements', async () => {
    const query = vi.spyOn((payload.db as unknown as PostgresAdapter).pool, 'query')
    expect(await limit('goClick', `cron-test-${Date.now()}`)).toBe(0)
    expect(query).toHaveBeenCalled()
    expect(query.mock.calls.every(([statement]) => typeof statement === 'string')).toBe(true)
    query.mockRestore()
  })
})

describe('the jobs config', () => {
  // Payload's own routes start autoRun whatever getClient passes, so only its absence keeps it off.
  it('has no autoRun on Vercel', async () => {
    vi.stubEnv('VERCEL', '1')
    vi.resetModules()
    const { jobs } = await import('@/jobs')
    expect(jobs.autoRun).toBeUndefined()
  })
})
