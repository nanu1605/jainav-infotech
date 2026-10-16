import 'server-only'

import { randomBytes } from 'node:crypto'

import { cookies } from 'next/headers'
import type { Payload } from 'payload'
import { cache } from 'react'

import { getClient } from '@/lib/cms'
import { sha256 } from '@/lib/rateLimit'
import type { Customer } from '@/payload-types'

/** The session cookie (spec §11.2). `__Host-` pins it to this host and path, HTTPS only. */
export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-jv_session' : 'jv_session'

const DAY = 86_400_000
/** Server-side lifetime, extended on use (rolling). */
export const SESSION_DAYS = 30
// The row's expiry is the real limit; the cookie only has to outlive it. Browsers cap cookies at
// 400 days, and a rolling session can't re-set its cookie from a page render.
const COOKIE_MAX_AGE = 400 * 86_400
// Extending the row costs a write; once a day is enough for a 30-day window.
const TOUCH_AFTER = DAY

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE,
}

/** A new session for `customer`; returns the cookie value (only its SHA-256 is stored). */
export async function createSession(payload: Payload, customer: number, userAgent: string) {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  await payload.create({
    collection: 'customer-sessions',
    data: {
      tokenHash: sha256(token),
      customer,
      expiresAt: new Date(now + SESSION_DAYS * DAY).toISOString(),
      lastSeenAt: new Date(now).toISOString(),
      userAgent: userAgent.slice(0, 200) || undefined,
    },
    overrideAccess: true,
    depth: 0,
  })
  return token
}

const validToken = (token: string | undefined): token is string =>
  !!token && /^[\w-]{43}$/.test(token)

/**
 * The signed-in, active customer for a session cookie value, or null. Extends the session once
 * a day while it is used.
 */
export async function customerForToken(token: string | undefined): Promise<Customer | null> {
  if (!validToken(token)) return null
  const payload = await getClient()
  const now = Date.now()
  const { docs } = await payload.find({
    collection: 'customer-sessions',
    where: {
      and: [
        { tokenHash: { equals: sha256(token) } },
        { expiresAt: { greater_than: new Date(now).toISOString() } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const session = docs[0]
  const customer = session && typeof session.customer === 'object' ? session.customer : null
  if (!session || !customer || customer.status !== 'active') return null
  if (now - Date.parse(session.lastSeenAt ?? session.createdAt) > TOUCH_AFTER) {
    await payload.update({
      collection: 'customer-sessions',
      id: session.id,
      data: {
        lastSeenAt: new Date(now).toISOString(),
        expiresAt: new Date(now + SESSION_DAYS * DAY).toISOString(),
      },
      overrideAccess: true,
      depth: 0,
    })
  }
  return customer
}

/** The signed-in customer in a page, layout or route handler (reads the cookie). */
export const getCustomer = cache(async (): Promise<Customer | null> =>
  customerForToken((await cookies()).get(SESSION_COOKIE)?.value),
)

/** Signs out: deletes the session row; the caller clears the cookie. */
export async function endSession(token: string | undefined) {
  if (!validToken(token)) return
  const payload = await getClient()
  await payload.delete({
    collection: 'customer-sessions',
    where: { tokenHash: { equals: sha256(token) } },
    overrideAccess: true,
    depth: 0,
  })
}

/** Daily job: drops expired sessions and sign-in codes. */
export async function deleteExpired() {
  const payload = await getClient()
  const now = new Date().toISOString()
  for (const collection of ['customer-sessions', 'otp-challenges'] as const) {
    await payload.delete({
      collection,
      where: { expiresAt: { less_than: now } },
      overrideAccess: true,
      depth: 0,
    })
  }
}
