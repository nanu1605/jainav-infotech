import { sql } from '@payloadcms/db-postgres'

import { getClient } from '@/lib/cms'

export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }

/**
 * GET /api/v1/health → 200 when the app and its database answer, 503 otherwise. Used by the
 * container healthcheck, deploys and the uptime monitor. The first call initializes Payload,
 * which applies pending migrations (prodMigrations) on container start.
 */
export async function GET() {
  try {
    const payload = await getClient()
    await payload.db.drizzle.execute(sql`select 1`)
    return Response.json({ ok: true }, { headers })
  } catch (error) {
    console.error('health check failed:', error instanceof Error ? error.name : 'unknown')
    return Response.json({ ok: false }, { status: 503, headers })
  }
}
