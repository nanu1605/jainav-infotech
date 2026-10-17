import 'server-only'

import { sql } from '@payloadcms/db-postgres'
import { NextResponse } from 'next/server'
import semverValid from 'semver/functions/valid'
import { z } from 'zod/mini'

import { getClient } from '@/lib/cms'
import { errorCode, readJson } from '@/lib/commerce/http'
import { getCommerceSettings } from '@/lib/commerce/store'
import { clientIp, limit } from '@/lib/rateLimit'

import { hashDeviceId, hashLicenseKey, licensingConfig, normalizeLicenseKey } from './keys'
import { activate, deactivate, licensingSettings, trial, validate } from './license'
import { jwks, verifyToken } from './tokens'

/** The API's error codes (docs/licensing-api.md); `code` is what the app acts on. */
const ERRORS = {
  invalid_request: [400, 'The request body is missing a field or has a wrong value.'],
  invalid_token: [401, 'The token is not valid.'],
  license_revoked: [403, 'This license was revoked.'],
  license_suspended: [403, 'This license is suspended.'],
  license_not_found: [404, 'No license matches this key for this product.'],
  activation_not_found: [404, 'This device has no active activation for the license.'],
  activation_limit_reached: [409, 'Every device slot of this license is in use.'],
  deactivation_limit_reached: [409, 'This license has used its deactivations for this month.'],
  trial_used: [409, "This device's trial ended."],
  rate_limited: [429, 'Too many requests.'],
  server_error: [500, 'Something went wrong on our side.'],
} as const
type Code = keyof typeof ERRORS

const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(
  code: Code,
  extra: Record<string, unknown> = {},
  init: { status?: number; message?: string; headers?: Record<string, string> } = {},
) {
  const [status, message] = ERRORS[code]
  return NextResponse.json(
    { error: { code, message: init.message ?? message, ...extra } },
    { status: init.status ?? status, headers: { ...NO_STORE, ...init.headers } },
  )
}
const ok = (body: Record<string, unknown>) => NextResponse.json(body, { headers: NO_STORE })
const rateLimited = (seconds: number) =>
  fail('rate_limited', {}, { headers: { 'Retry-After': String(seconds) } })
const unavailable = () =>
  fail('server_error', {}, { status: 503, message: 'Licensing is not configured.' })

// Request bodies over 4 KB are refused (docs/licensing-api.md).
const MAX_BODY = 4 * 1024
const text = (max: number) =>
  z.string().check(z.minLength(1), z.maxLength(max), z.regex(/^[^\p{Cc}]+$/u))
const deviceId = z.string().check(z.regex(/^[0-9a-f]{64}$/))
const product = z.string().check(z.regex(/^[a-z0-9-]{1,64}$/))
const appVersion = z.string().check(
  z.maxLength(64),
  z.refine((v) => semverValid(v) !== null),
)
const licenseKey = z.string().check(
  z.maxLength(64),
  z.refine((v) => /^[0-9A-Z]{5,40}$/.test(normalizeLicenseKey(v))),
)

const activateSchema = z.object({
  licenseKey,
  product,
  deviceId,
  deviceName: text(100),
  os: text(100),
  appVersion,
})
const validateSchema = z.object({ token: z.string().check(z.minLength(1), z.maxLength(2048)) })
const deactivateSchema = z.object({ licenseKey, deviceId })
const trialSchema = z.object({ product, deviceId, appVersion })

/**
 * The shared steps of every POST: keys configured, per-IP limit, a JSON body that parses.
 * Unexpected failures answer `server_error` and log only an error code.
 */
function endpoint<T>(
  name: string,
  schema: z.ZodMiniType<T>,
  handle: (body: T, ctx: Context) => Promise<Response>,
) {
  return async (req: Request) => {
    try {
      const cfg = licensingConfig()
      if (!cfg) return unavailable()
      const wait = await limit('licensingIp', clientIp(req.headers))
      if (wait) return rateLimited(wait)
      const parsed = schema.safeParse(await readJson(req, MAX_BODY))
      if (!parsed.success) return fail('invalid_request')
      const payload = await getClient()
      const settings = licensingSettings(await getCommerceSettings(payload))
      return await handle(parsed.data, { cfg, payload, settings })
    } catch (error) {
      console.error(`licensing/${name}: failed:`, errorCode(error))
      return fail('server_error')
    }
  }
}
type Context = {
  cfg: NonNullable<ReturnType<typeof licensingConfig>>
  payload: Awaited<ReturnType<typeof getClient>>
  settings: ReturnType<typeof licensingSettings>
}

/** POST /api/v1/licensing/activate */
export const activateLicense = endpoint('activate', activateSchema, async (body, ctx) => {
  const keyHash = hashLicenseKey(body.licenseKey)
  const wait = await limit('licensingKey', keyHash)
  if (wait) return rateLimited(wait)
  const result = await activate(ctx.payload, ctx.cfg, ctx.settings, { ...body, keyHash })
  if (result.ok) {
    return ok({ token: result.token, license: result.license, refreshAfter: result.refreshAfter })
  }
  if (result.code === 'activation_limit_reached') {
    return fail(
      result.code,
      { devices: result.devices },
      {
        message: `This license is active on ${result.devices.length} of ${result.maxActivations} devices.`,
      },
    )
  }
  return fail(result.code)
})

/** POST /api/v1/licensing/validate */
export const validateLicense = endpoint('validate', validateSchema, async (body, ctx) => {
  const claims = await verifyToken(body.token, ctx.cfg, ctx.settings.tokenGraceDays)
  if (!claims) return fail('invalid_token')
  const wait = await limit('licensingKey', `token:${claims.sub}`)
  if (wait) return rateLimited(wait)
  const result = await validate(ctx.payload, ctx.cfg, ctx.settings, claims)
  return result.ok ? ok({ token: result.token, license: result.license }) : fail(result.code)
})

/** POST /api/v1/licensing/deactivate */
export const deactivateLicense = endpoint('deactivate', deactivateSchema, async (body, ctx) => {
  const keyHash = hashLicenseKey(body.licenseKey)
  const wait = await limit('licensingKey', keyHash)
  if (wait) return rateLimited(wait)
  const result = await deactivate(ctx.payload, ctx.settings, {
    by: 'device',
    keyHash,
    deviceIdHash: hashDeviceId(body.deviceId, ctx.cfg),
  })
  if (result.ok) return ok({ ok: true })
  if (result.code === 'deactivation_limit_reached') {
    return fail(
      result.code,
      { resetsAt: result.resetsAt },
      { message: `This license has used its ${result.limit} deactivations for this month.` },
    )
  }
  return fail(result.code)
})

/** POST /api/v1/licensing/trial */
export const startTrial = endpoint('trial', trialSchema, async (body, ctx) => {
  const result = await trial(ctx.payload, ctx.cfg, ctx.settings, body)
  if (result.ok) return ok({ trialToken: result.trialToken, expiresAt: result.expiresAt })
  if (result.code === 'trial_used') return fail(result.code, { expiredAt: result.expiredAt })
  return fail(result.code)
})

/** GET /api/v1/licensing/keys: the JWKS. */
export function publicKeys() {
  const cfg = licensingConfig()
  if (!cfg) return unavailable()
  return NextResponse.json(jwks(cfg), { headers: { 'Cache-Control': 'public, max-age=3600' } })
}

/** GET /api/v1/licensing/health: the uptime monitor's check (spec §18.4). */
export async function health() {
  try {
    if (!licensingConfig())
      return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE })
    const payload = await getClient()
    await payload.db.drizzle.execute(sql`select 1`)
    return ok({ ok: true })
  } catch (error) {
    console.error('licensing/health: failed:', errorCode(error))
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE })
  }
}
