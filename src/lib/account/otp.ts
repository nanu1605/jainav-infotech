import 'server-only'

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { Locale } from '@/i18n/routing'
import type { Customer } from '@/payload-types'

/** Spec §11.2: codes last 10 minutes, allow 5 tries, and can be re-sent after 60 seconds. */
export const CODE_MINUTES = 10
export const MAX_ATTEMPTS = 5
export const RESEND_SECONDS = 60

function pepper(): string {
  const value = process.env.OTP_PEPPER
  if (value) return value
  if (process.env.NODE_ENV === 'production') throw new Error('OTP_PEPPER is not set')
  return `dev-otp:${process.env.PAYLOAD_SECRET ?? ''}`
}

const hmac = (value: string) => createHmac('sha256', pepper()).update(value).digest('hex')

/** Codes and emails are stored only as HMAC-SHA256 with OTP_PEPPER (spec §11.2). */
export const emailHash = (email: string) => hmac(`email:${email}`)
const codeHmac = (hashedEmail: string, code: string) => hmac(`code:${hashedEmail}:${code}`)

const db = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle

async function latestChallenge(payload: Payload, hashedEmail: string) {
  const { docs } = await payload.find({
    collection: 'otp-challenges',
    where: { emailHash: { equals: hashedEmail } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

const dropChallenges = (payload: Payload, hashedEmail: string) =>
  payload.delete({
    collection: 'otp-challenges',
    where: { emailHash: { equals: hashedEmail } },
    overrideAccess: true,
    depth: 0,
  })

/**
 * A new sign-in code for `email` (normalized), replacing any earlier one. Returns the code for
 * the email, or the seconds to wait while the last code is under a minute old.
 */
export async function issueCode(
  payload: Payload,
  email: string,
  ipHash: string,
): Promise<{ code: string } | { retryAfter: number }> {
  const hashed = emailHash(email)
  const last = await latestChallenge(payload, hashed)
  const age = last ? (Date.now() - Date.parse(last.createdAt)) / 1000 : Infinity
  if (age < RESEND_SECONDS) return { retryAfter: Math.ceil(RESEND_SECONDS - age) }
  await dropChallenges(payload, hashed)
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await payload.create({
    collection: 'otp-challenges',
    data: {
      emailHash: hashed,
      codeHmac: codeHmac(hashed, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
      attempts: 0,
      ipHash,
    },
    overrideAccess: true,
    depth: 0,
  })
  return { code }
}

export type CheckResult =
  'ok' | { error: 'invalidCode'; attemptsLeft: number } | { error: 'codeExpired' }

/** Checks a code. Each try counts atomically, so parallel guesses can't exceed the limit. */
export async function checkCode(
  payload: Payload,
  email: string,
  code: string,
): Promise<CheckResult> {
  const hashed = emailHash(email)
  const challenge = await latestChallenge(payload, hashed)
  if (!challenge || Date.parse(challenge.expiresAt) <= Date.now()) return { error: 'codeExpired' }
  const { rows } = await db(payload).execute(sql`
    UPDATE otp_challenges SET attempts = attempts + 1, updated_at = now()
    WHERE id = ${challenge.id} AND attempts < ${MAX_ATTEMPTS}
    RETURNING attempts
  `)
  const attempts = Number((rows[0] as { attempts?: string } | undefined)?.attempts ?? MAX_ATTEMPTS)
  if (!rows.length) {
    await dropChallenges(payload, hashed)
    return { error: 'codeExpired' }
  }
  const expected = Buffer.from(challenge.codeHmac, 'hex')
  const given = Buffer.from(codeHmac(hashed, code), 'hex')
  if (expected.length === given.length && timingSafeEqual(expected, given)) {
    await dropChallenges(payload, hashed)
    return 'ok'
  }
  const attemptsLeft = MAX_ATTEMPTS - attempts
  if (attemptsLeft <= 0) {
    await dropChallenges(payload, hashed)
    return { error: 'codeExpired' }
  }
  return { error: 'invalidCode', attemptsLeft }
}

/** The customer for a verified email: the first sign-in creates the account (spec §11.2). */
export async function findOrCreateCustomer(
  payload: Payload,
  email: string,
  locale: Locale,
): Promise<Customer> {
  const find = async () =>
    (
      await payload.find({
        collection: 'customers',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0]
  const existing = await find()
  if (existing) return existing
  try {
    return await payload.create({
      collection: 'customers',
      data: { email, preferredLocale: locale, status: 'active' },
      overrideAccess: true,
      depth: 0,
    })
  } catch (error) {
    // Two sign-ins at once: the other one created it.
    const created = await find()
    if (created) return created
    throw error
  }
}
