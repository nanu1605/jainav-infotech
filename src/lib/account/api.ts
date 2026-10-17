import 'server-only'

import { after } from 'next/server'

import { otpEmail } from '@/emails'
import type { Locale } from '@/i18n/routing'
import { getClient } from '@/lib/cms'
import {
  errorCode,
  json,
  readJson,
  requestCustomer,
  sameOrigin,
  sessionToken,
  tooMany,
} from '@/lib/commerce/http'
import {
  deactivateDeviceSchema,
  otpRequestSchema,
  otpVerifySchema,
  profileSchema,
} from '@/lib/commerce/schemas'
import { storeOpen } from '@/lib/commerce/store'
import { sendEmail } from '@/lib/notify'
import { clientIp, hashIp, limit } from '@/lib/rateLimit'
import { verifyTurnstile } from '@/lib/turnstile'

import { checkCode, findOrCreateCustomer, issueCode, RESEND_SECONDS } from './otp'
import { anonymizeCustomer, updateProfile } from './profile'
import { cookieOptions, createSession, endSession, SESSION_COOKIE } from './session'

/** The language of the page that sent the request (a new account's email language). */
function pageLocale(req: Request): Locale {
  try {
    const { pathname } = new URL(req.headers.get('referer') ?? '')
    return pathname === '/hi' || pathname.startsWith('/hi/') ? 'hi' : 'en'
  } catch {
    return 'en'
  }
}

/** Every account endpoint: same origin, store open. Returns an error response or null. */
async function guard(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: 'invalid' })
  if (!(await storeOpen())) return json(404, { error: 'notFound' })
  return null
}

/** POST /api/v1/account/otp/request: emails a sign-in code (spec §11.2). */
export async function requestCode(req: Request) {
  const refused = await guard(req)
  if (refused) return refused
  const parsed = otpRequestSchema.safeParse(await readJson(req))
  if (!parsed.success) return json(400, { error: 'invalid' })
  const { email, locale, turnstile } = parsed.data
  const ip = clientIp(req.headers)
  if (!(await verifyTurnstile(turnstile, ip))) return json(400, { error: 'verification' })
  const wait = Math.max(await limit('otpRequestIp', ip), await limit('otpRequestEmail', email))
  if (wait) return tooMany(wait)

  const payload = await getClient()
  const issued = await issueCode(payload, email, hashIp(ip))
  if ('retryAfter' in issued) return tooMany(issued.retryAfter, 'cooldown')
  // The same answer whether or not an account exists: the first sign-in creates it.
  after(async () => {
    try {
      await sendEmail(payload, email, await otpEmail({ locale, code: issued.code }))
    } catch (error) {
      console.error('account/otp: email failed:', errorCode(error))
    }
  })
  return json(200, { ok: true, resendIn: RESEND_SECONDS })
}

/** POST /api/v1/account/otp/verify: checks the code and starts a session. */
export async function verifyCode(req: Request) {
  const refused = await guard(req)
  if (refused) return refused
  const parsed = otpVerifySchema.safeParse(await readJson(req))
  if (!parsed.success) return json(400, { error: 'invalid' })
  const wait = await limit('otpVerifyIp', clientIp(req.headers))
  if (wait) return tooMany(wait)

  const payload = await getClient()
  const { email, code } = parsed.data
  const result = await checkCode(payload, email, code)
  if (result !== 'ok') return json(400, result)
  const customer = await findOrCreateCustomer(payload, email, pageLocale(req))
  const token = await createSession(payload, customer.id, req.headers.get('user-agent') ?? '')
  const res = json(200, { ok: true })
  res.cookies.set(SESSION_COOKIE, token, cookieOptions)
  return res
}

/** POST /api/v1/account/sign-out. */
export async function signOut(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: 'invalid' })
  await endSession(sessionToken(req))
  const res = json(200, { ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
  return res
}

/** POST /api/v1/account/profile: the settings form. */
export async function saveProfile(req: Request) {
  const refused = await guard(req)
  if (refused) return refused
  const ip = clientIp(req.headers)
  const wait = await limit('storeIp', ip)
  if (wait) return tooMany(wait)
  const customer = await requestCustomer(req)
  if (!customer) return json(401, { error: 'signedOut' })
  const parsed = profileSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    return json(400, { error: 'invalid', field: String(parsed.error.issues[0]?.path[0] ?? '') })
  }
  await updateProfile(await getClient(), customer, parsed.data)
  return json(200, { ok: true })
}

/**
 * POST /api/v1/account/licenses/deactivate: frees one of the customer's device slots (spec §11.2).
 * It counts toward the license's monthly limit, like a deactivation from the app.
 */
export async function deactivateDevice(req: Request) {
  const refused = await guard(req)
  if (refused) return refused
  const wait = await limit('storeIp', clientIp(req.headers))
  if (wait) return tooMany(wait)
  const customer = await requestCustomer(req)
  if (!customer) return json(401, { error: 'signedOut' })
  const parsed = deactivateDeviceSchema.safeParse(await readJson(req))
  if (!parsed.success) return json(400, { error: 'invalid' })
  const payload = await getClient()
  const { deactivate, licensingSettings } = await import('@/lib/licensing/license')
  const { getCommerceSettings } = await import('@/lib/commerce/store')
  const result = await deactivate(payload, licensingSettings(await getCommerceSettings(payload)), {
    by: 'account',
    activationId: parsed.data.activationId,
    customerId: customer.id,
  })
  if (result.ok) return json(200, { ok: true })
  if (result.code === 'deactivation_limit_reached') {
    return json(409, { error: 'deactivationLimit', resetsAt: result.resetsAt })
  }
  return json(404, { error: 'notFound' })
}

/** POST /api/v1/account/delete: anonymizes the account and signs out everywhere. */
export async function deleteAccount(req: Request) {
  const refused = await guard(req)
  if (refused) return refused
  const customer = await requestCustomer(req)
  if (!customer) return json(401, { error: 'signedOut' })
  await anonymizeCustomer(await getClient(), customer)
  const res = json(200, { ok: true })
  res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
  return res
}

/**
 * GET /api/v1/account/invoices/{id}: the signed-in customer's own invoice as a PDF, drawn from
 * the immutable invoice record (the archived copy the job stored is the same document).
 */
export async function invoicePdf(req: Request, id: string) {
  if (!(await storeOpen())) return json(404, { error: 'notFound' })
  const customer = await requestCustomer(req)
  if (!customer) return json(401, { error: 'signedOut' })
  if (!/^\d{1,10}$/.test(id)) return json(404, { error: 'notFound' })
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'invoices',
    where: { and: [{ id: { equals: Number(id) } }, { 'order.customer': { equals: customer.id } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const invoice = docs[0]
  if (!invoice) return json(404, { error: 'notFound' })
  const { invoicePdf: draw, pdfFilename } = await import('@/lib/invoices/deliver')
  const pdf = await draw(invoice)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdfFilename(invoice)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
