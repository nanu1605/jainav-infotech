import { timingSafeEqual } from 'node:crypto'

import { releaseStuckJobs, safeError } from '@/jobs'
import { getClient } from '@/lib/cms'
import { runQueuedJobs } from '@/lib/commerce/fulfil'

export const dynamic = 'force-dynamic'

const authorized = (header: string | null) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header ?? '')
  return expected.length === given.length && timingSafeEqual(expected, given)
}

/**
 * GET /api/v1/cron: one tick of the jobs queue, for Vercel Cron (vercel.json), which sends
 * CRON_SECRET as a bearer token. A long-running server does this with autoRun instead. Delivery is
 * best effort and can overlap: a later tick picks up what a missed one left, and every job handler
 * is idempotent.
 */
export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return new Response(null, { status: 401 })
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const payload = await getClient()
    await releaseStuckJobs(payload)
    await payload.jobs.handleSchedules({ queue: 'default' })
    await runQueuedJobs(payload)
    return Response.json({ ok: true }, { headers })
  } catch (error) {
    console.error('cron: failed:', safeError(error).message)
    return Response.json({ ok: false }, { status: 500, headers })
  }
}
