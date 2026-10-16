import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { istDate } from './format'

export type StatKind = 'go-click' | 'download'

const db = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle

/**
 * Counts one event (spec §8.6, §17). A single upsert, so concurrent hits never lose counts the
 * way a Local API read-then-write would. Call it inside `after()` so it never delays a response.
 */
export async function countEvent(payload: Payload, kind: StatKind, key: string) {
  await db(payload).execute(sql`
    INSERT INTO daily_stats (date, kind, key, count)
    VALUES (${istDate()}, ${kind}, ${key}, 1)
    ON CONFLICT (date, kind, key)
    DO UPDATE SET count = daily_stats.count + 1, updated_at = now()
  `)
}

/** All-time download total for the Proof / StatStrip "downloads" stat. */
export async function downloadTotal(payload: Payload): Promise<number> {
  const { rows } = await db(payload).execute(
    sql`SELECT COALESCE(SUM(count), 0) AS total FROM daily_stats WHERE kind = 'download'`,
  )
  return Number((rows[0] as { total?: string | number } | undefined)?.total ?? 0)
}
