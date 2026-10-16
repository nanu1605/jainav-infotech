import 'server-only'

import { createHash, createHmac } from 'node:crypto'

import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { RateLimiterPostgres, RateLimiterRes } from 'rate-limiter-flexible'

import { getClient } from './cms'

/** Attempts allowed per `duration` seconds (spec §16). */
const RULES = {
  /** Every form submission from one IP, all forms together. */
  formIp: { points: 10, duration: 10 * 60 },
  /** Submissions naming one email address: also caps auto-replies sent to someone else. */
  formEmail: { points: 5, duration: 60 * 60 },
  goClick: { points: 60, duration: 60 },
} as const
export type Rule = keyof typeof RULES

/**
 * The visitor's IP. Production sits behind Cloudflare and its origin only accepts Cloudflare's
 * ranges, so CF-Connecting-IP is trustworthy there; the fallbacks are for local runs.
 */
export const clientIp = (headers: Headers) =>
  headers.get('cf-connecting-ip') ||
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown'

/** Keyed hash for storing an IP with a consent record without storing the IP (spec §13). */
export const hashIp = (ip: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET ?? '')
    .update(`ip:${ip}`)
    .digest('hex')

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/**
 * One table in its own Postgres schema: Payload's dev schema push only manages `public`, so it
 * never sees (or drops) it, and it needs no migration. Created on first use.
 */
async function createLimiters() {
  const payload = await getClient()
  const pool = (payload.db as unknown as PostgresAdapter).pool
  await pool.query('CREATE SCHEMA IF NOT EXISTS rate_limit')
  await pool.query(
    'CREATE TABLE IF NOT EXISTS rate_limit.hits (key varchar(255) PRIMARY KEY, points integer NOT NULL DEFAULT 0, expire bigint)',
  )
  const limiter = (rule: Rule) =>
    new RateLimiterPostgres({
      storeClient: pool,
      schemaName: 'rate_limit',
      tableName: 'hits',
      tableCreated: true,
      keyPrefix: rule,
      ...RULES[rule],
    })
  return Object.fromEntries(
    (Object.keys(RULES) as Rule[]).map((rule) => [rule, limiter(rule)]),
  ) as Record<Rule, RateLimiterPostgres>
}

let limiters: Promise<Record<Rule, RateLimiterPostgres>> | undefined

/**
 * Counts one attempt for `key` (hashed: keys are IPs and email addresses). Returns 0 when it is
 * within the limit, else the seconds until the next attempt is allowed.
 */
export async function limit(rule: Rule, key: string): Promise<number> {
  limiters ??= createLimiters().catch((error) => {
    limiters = undefined
    throw error
  })
  try {
    await (await limiters)[rule].consume(sha256(key))
    return 0
  } catch (error) {
    if (error instanceof RateLimiterRes) return Math.max(1, Math.ceil(error.msBeforeNext / 1000))
    throw error
  }
}
