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

export type StatsInsight = {
  kind: StatKind
  key: string
  last7: number
  last30: number
  /** The kind's totals over every key, not just the top 10. */
  total7: number
  total30: number
}

const DAY = 86_400_000

/**
 * The daily-stats insights (spec §10): per kind, the top 10 keys over the last 30 IST days
 * (today included) with their last-7-day counts, and the kind's totals. One query.
 */
export async function statsInsights(payload: Payload, now = new Date()): Promise<StatsInsight[]> {
  const today = istDate(now)
  const since7 = istDate(new Date(now.getTime() - 6 * DAY))
  const since30 = istDate(new Date(now.getTime() - 29 * DAY))
  const { rows } = await db(payload).execute(sql`
    SELECT kind, key, last7, last30, total7, total30 FROM (
      SELECT kind::text AS kind, key,
        COALESCE(SUM(count) FILTER (WHERE date >= ${since7}), 0)::int AS last7,
        SUM(count)::int AS last30,
        COALESCE(SUM(SUM(count) FILTER (WHERE date >= ${since7})) OVER w, 0)::int AS total7,
        (SUM(SUM(count)) OVER w)::int AS total30,
        ROW_NUMBER() OVER (PARTITION BY kind ORDER BY SUM(count) DESC, key) AS rank
      FROM daily_stats
      WHERE date >= ${since30} AND date <= ${today}
      GROUP BY kind, key
      WINDOW w AS (PARTITION BY kind)
    ) ranked
    WHERE rank <= 10
    ORDER BY kind, rank
  `)
  return rows as StatsInsight[]
}
