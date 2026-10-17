import 'server-only'

import { createHash, createHmac } from 'node:crypto'
import { isIPv6 } from 'node:net'

import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { RateLimiterPostgres, RateLimiterRes } from 'rate-limiter-flexible'

import { getClient } from './cms'

/** One client: an IPv6 subscriber usually holds a whole /64, so count the prefix. */
export function ipKey(ip: string) {
  if (!isIPv6(ip) || ip.includes('.')) return ip // IPv4 (also IPv4-mapped): the address
  const [head, tail] = ip.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t]
  return `${groups
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(':')}::/64`
}

/** One inbox: +tags reach the same one, and Gmail also ignores dots. */
export function inboxKey(email: string) {
  const at = email.lastIndexOf('@')
  let local = email.slice(0, at).split('+')[0]
  let domain = email.slice(at + 1).toLowerCase()
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replaceAll('.', '')
  return `${local.toLowerCase()}@${domain}`
}

/** Attempts allowed per `duration` seconds (spec §16), counted per `key` of what is passed. */
const RULES = {
  /** Every form submission from one IP, all forms together. */
  formIp: { points: 10, duration: 10 * 60, key: ipKey },
  /** Submissions naming one inbox: also caps auto-replies sent to someone else. */
  formEmail: { points: 5, duration: 60 * 60, key: inboxKey },
  goClick: { points: 60, duration: 60, key: ipKey },
  /** Sign-in codes requested from one IP, and sent to one address (spec §11.2). */
  otpRequestIp: { points: 10, duration: 10 * 60, key: ipKey },
  otpRequestEmail: { points: 5, duration: 60 * 60, key: inboxKey },
  /** Code guesses from one IP (each code also allows only 5). */
  otpVerifyIp: { points: 30, duration: 10 * 60, key: ipKey },
  /** Account changes, quotes and orders from one IP and by one customer (spec §16). */
  storeIp: { points: 60, duration: 10 * 60, key: ipKey },
  checkoutCustomer: { points: 10, duration: 10 * 60, key: (id: string) => id },
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

// Keyed: a plain hash of an IPv4 address or a known email is reversed by trying them all.
const hmac = (value: string) =>
  createHmac('sha256', process.env.PAYLOAD_SECRET ?? '')
    .update(value)
    .digest('hex')

/** Keyed hash for storing an IP with a consent record without storing the IP (spec §13). */
export const hashIp = (ip: string) => hmac(`ip:${ip}`)

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
      points: RULES[rule].points,
      duration: RULES[rule].duration,
    })
  return Object.fromEntries(
    (Object.keys(RULES) as Rule[]).map((rule) => [rule, limiter(rule)]),
  ) as Record<Rule, RateLimiterPostgres>
}

let limiters: Promise<Record<Rule, RateLimiterPostgres>> | undefined

/**
 * Counts one attempt for `value` (an IP or an email address, stored only as a keyed hash).
 * Returns 0 when it is within the limit, else the seconds until the next attempt is allowed.
 */
export async function limit(rule: Rule, value: string): Promise<number> {
  limiters ??= createLimiters().catch((error) => {
    limiters = undefined
    throw error
  })
  try {
    await (await limiters)[rule].consume(hmac(`rl:${RULES[rule].key(value)}`))
    return 0
  } catch (error) {
    if (error instanceof RateLimiterRes) return Math.max(1, Math.ceil(error.msBeforeNext / 1000))
    throw error
  }
}
