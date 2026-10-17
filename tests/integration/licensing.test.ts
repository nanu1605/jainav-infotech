/**
 * Phase 8 licensing against a real database (spec §12, §19; docs/licensing-api.md): activation and
 * the device limit, deactivation and the monthly limit, validation with the 180-day grace, trials,
 * request checks and rate limits, the license and new-device emails, and the admin rules. Route
 * handlers are called in-process.
 */
import { randomBytes } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { createLocalJWKSet, decodeJwt, jwtVerify, type JSONWebKeySet } from 'jose'
import { getPayload, type Payload, type SendEmailOptions } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const activateRoute = (await import('@/app/api/v1/licensing/activate/route')).POST
const validateRoute = (await import('@/app/api/v1/licensing/validate/route')).POST
const deactivateRoute = (await import('@/app/api/v1/licensing/deactivate/route')).POST
const trialRoute = (await import('@/app/api/v1/licensing/trial/route')).POST
const keysRoute = (await import('@/app/api/v1/licensing/keys/route')).GET
const healthRoute = (await import('@/app/api/v1/licensing/health/route')).GET
const accountDeactivateRoute = (await import('@/app/api/v1/account/licenses/deactivate/route')).POST
const { hashDeviceId, hashLicenseKey, licensingConfig } = await import('@/lib/licensing/keys')
const { signToken } = await import('@/lib/licensing/tokens')
const { licensingSettings } = await import('@/lib/licensing/license')
const { customerLicenses } = await import('@/lib/licensing/account')
const { getCommerceSettings } = await import('@/lib/commerce/store')
const { createSession, SESSION_COOKIE } = await import('@/lib/account/session')
const { anonymizeCustomer } = await import('@/lib/account/profile')
const { limit } = await import('@/lib/rateLimit')
const { SITE_URL } = await import('@/lib/seo')
const { ACCOUNT_MARKETING_VERSION } = await import('@/lib/commerce/schemas')

let payload: Payload
// Lowercase (a product slug), and with a 0 and a 1 so every key's prefix has both (O / I typing).
const run = `t01${Date.now().toString(36)}`
const PRODUCT_NAME = 'Licensing test'
const cfg = licensingConfig()!
let settings: ReturnType<typeof licensingSettings>
const email = (name: string) => `${name}.${run}@example.test`
let ipCounter = 0
const nextIp = () => `198.51.102.${++ipCounter % 250}`
const device = () => randomBytes(32).toString('hex')
const sent: SendEmailOptions[] = []
const ids: { product?: number; plan?: number; customers: number[] } = { customers: [] }
const users: Record<'owner' | 'editor' | 'support', User> = {} as never
const restore: (() => Promise<unknown>)[] = []
const db = () => (payload.db as unknown as PostgresAdapter).drizzle
const DAY = 86_400
const DAY_MS = DAY * 1000

const as = (role: keyof typeof users) => ({
  user: { ...users[role], collection: 'users' as const },
  overrideAccess: false,
})

type Reply = { status: number; headers: Headers; body: Record<string, unknown> }

/** POSTs a JSON body (or a raw string) to a licensing route. */
async function post(
  route: (req: Request) => Promise<Response>,
  path: string,
  body: unknown,
  { ip = nextIp(), cookie }: { ip?: string; cookie?: string } = {},
): Promise<Reply> {
  const res = await route(
    new Request(`${SITE_URL}/api/v1/${path}`, {
      method: 'POST',
      headers: {
        'cf-connecting-ip': ip,
        'content-type': 'application/json',
        ...(cookie && { cookie }),
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
  return { status: res.status, headers: res.headers, body: await res.json() }
}

const activate = (licenseKey: string, deviceId: string, extra: object = {}) =>
  post(activateRoute, 'licensing/activate', {
    licenseKey,
    product: run,
    deviceId,
    deviceName: 'GAMING-PC',
    os: 'Windows 11 Pro 26100',
    appVersion: '1.0.1',
    ...extra,
  })
const validate = (token: string) => post(validateRoute, 'licensing/validate', { token })
const deactivate = (licenseKey: string, deviceId: string) =>
  post(deactivateRoute, 'licensing/deactivate', { licenseKey, deviceId })
const startTrial = (deviceId: string, product = run) =>
  post(trialRoute, 'licensing/trial', { product, deviceId, appVersion: '1.0.1' })
const accountDeactivate = (activationId: number, cookie?: string) =>
  post(accountDeactivateRoute, 'account/licenses/deactivate', { activationId }, { cookie })

const apiError = (code: string, message: unknown = expect.any(String)) => ({
  error: { code, message },
})

async function newCustomer(name: string, preferredLocale: 'en' | 'hi' = 'en') {
  const customer = await payload.create({
    collection: 'customers',
    data: { email: email(name), preferredLocale, status: 'active' },
    overrideAccess: true,
    depth: 0,
  })
  ids.customers.push(customer.id)
  return customer
}

/** A complimentary license (the hook generates the key); the plain key is the virtual field. */
async function newLicense(customer: number) {
  const license = await payload.create({
    collection: 'licenses',
    data: {
      product: ids.product!,
      plan: ids.plan!,
      customer,
      status: 'active',
      source: 'complimentary',
    },
    overrideAccess: true,
    depth: 0,
  })
  expect(license.licenseKey).toBeTruthy()
  return { ...license, key: license.licenseKey! }
}

const cookieFor = async (customerId: number) =>
  `${SESSION_COOKIE}=${await createSession(payload, customerId, 'licensing test')}`

const activationFor = async (licenseId: number, deviceId: string) =>
  (
    await payload.find({
      collection: 'activations',
      where: {
        and: [
          { license: { equals: licenseId } },
          { deviceIdHash: { equals: hashDeviceId(deviceId, cfg) } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]!

const deviceEmailJobs = async (activationId: number) =>
  Number(
    (
      (
        await db().execute(
          sql`SELECT count(*) AS n FROM payload_jobs WHERE task_slug = 'sendDeviceEmail' AND input->>'id' = ${String(activationId)}`,
        )
      ).rows[0] as { n: string }
    ).n,
  )

/** The token checked the way the app does: the JWKS from /keys, EdDSA only, iss / prd / did. */
async function verifyOffline(token: string, deviceId: string) {
  const jwks = createLocalJWKSet((await keysRoute().json()) as JSONWebKeySet)
  const { payload: claims, protectedHeader } = await jwtVerify(token, jwks, {
    algorithms: ['EdDSA'],
    issuer: 'jainav-licensing',
  })
  expect(protectedHeader).toEqual({ alg: 'EdDSA', typ: 'JWT', kid: cfg.kid })
  expect(claims.prd).toBe(run)
  expect(claims.did).toBe(deviceId)
  return claims
}

/** Midnight on the 1st of next month in India, as UTC (computed without the code under test). */
function nextMonthIST(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const [year, month] = [Number(parts.year), Number(parts.month)]
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
  return new Date(`${next}-01T00:00:00+05:30`).toISOString()
}

const runJobs = () =>
  payload.jobs.run({
    queue: 'default',
    limit: 200,
    silent: true,
    where: { taskSlug: { in: ['sendLicenseEmail', 'sendDeviceEmail'] } },
  })

beforeAll(async () => {
  payload = await getPayload({ config })
  vi.spyOn(payload, 'sendEmail').mockImplementation(async (message) => {
    sent.push(message as SendEmailOptions)
  })
  settings = licensingSettings(await getCommerceSettings(payload))

  // The account page's endpoint needs the store open (site settings, in SQL as store.test does).
  await db().execute(
    sql`INSERT INTO site_settings (updated_at, created_at) SELECT now(), now() WHERE NOT EXISTS (SELECT 1 FROM site_settings)`,
  )
  const { rows } = await db().execute(sql`SELECT store_enabled FROM site_settings LIMIT 1`)
  const before = (rows[0] as { store_enabled: boolean | null }).store_enabled
  await db().execute(sql`UPDATE site_settings SET store_enabled = true`)
  restore.push(() => db().execute(sql`UPDATE site_settings SET store_enabled = ${before}`))

  for (const role of ['owner', 'editor', 'support'] as const) {
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password: `pw-${run}-${role}`, roles: [role] },
    })
  }
  const product = await payload.create({
    collection: 'products',
    data: {
      name: PRODUCT_NAME,
      slug: run,
      tagline: 'Tagline',
      type: 'desktop',
      category: 'other',
      status: 'live',
      hostingMode: 'hosted',
      accentColor: '#123456',
      primaryButton: { type: 'contact' },
      hiStatus: 'missing',
      _status: 'published',
    },
    overrideAccess: true,
  })
  ids.product = product.id
  const plan = await payload.create({
    collection: 'plans',
    data: {
      product: product.id,
      code: 'pro',
      name: 'Pro',
      billing: 'one_time',
      priceINR: 99_900,
      active: true,
      maxActivations: 2,
      updatesForMonths: 12,
    },
    overrideAccess: true,
  })
  ids.plan = plan.id
})

beforeEach(async () => {
  sent.length = 0
  // The per-key and per-IP limits would trip across tests (the table appears on first use).
  await db()
    .execute(sql`DELETE FROM rate_limit.hits`)
    .catch(() => undefined)
})

afterAll(async () => {
  if (ids.product) {
    await db().execute(
      sql`DELETE FROM activations WHERE license_id IN (SELECT id FROM licenses WHERE product_id = ${ids.product})`,
    )
    await db().execute(sql`DELETE FROM licenses WHERE product_id = ${ids.product}`)
    await db().execute(sql`DELETE FROM trials WHERE product_id = ${ids.product}`)
  }
  if (ids.customers.length) {
    await db().execute(sql`DELETE FROM customer_sessions WHERE customer_id IN ${ids.customers}`)
    await db().execute(sql`DELETE FROM customers WHERE id IN ${ids.customers}`)
  }
  await db().execute(
    sql`DELETE FROM payload_jobs WHERE task_slug IN ('sendLicenseEmail', 'sendDeviceEmail')`,
  )
  await db()
    .execute(sql`DELETE FROM rate_limit.hits`)
    .catch(() => undefined)
  if (ids.plan) await payload.delete({ collection: 'plans', id: ids.plan, overrideAccess: true })
  if (ids.product)
    await payload.delete({ collection: 'products', id: ids.product, overrideAccess: true })
  for (const user of Object.values(users))
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
  for (const undo of restore.reverse()) await undo()
})

describe('POST /activate', () => {
  it('activates, returns a token that verifies offline, and reuses the activation', async () => {
    const customer = await newCustomer('activate')
    const license = await newLicense(customer.id)
    expect(license).toMatchObject({ status: 'active', source: 'complimentary', maxActivations: 2 })
    const deviceId = device()
    const before = Date.now()
    const res = await activate(license.key, deviceId)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.body).toEqual({
      token: expect.any(String),
      license: {
        plan: 'pro',
        status: 'active',
        maxActivations: 2,
        activeDevices: 1,
        updatesUntil: new Date(license.updatesUntil!).toISOString(),
      },
      refreshAfter: expect.any(String),
    })
    const refreshAfter = Date.parse(res.body.refreshAfter as string)
    expect(refreshAfter).toBeGreaterThanOrEqual(before + settings.refreshAfterDays * DAY_MS - 1000)
    expect(refreshAfter).toBeLessThanOrEqual(Date.now() + settings.refreshAfterDays * DAY_MS)
    // 12 months of updates from the plan.
    const updatesUntil = (res.body.license as { updatesUntil: string }).updatesUntil
    expect(Date.parse(updatesUntil) - before).toBeGreaterThan(364 * DAY_MS)
    expect(Date.parse(updatesUntil) - before).toBeLessThan(367 * DAY_MS)

    const claims = await verifyOffline(res.body.token as string, deviceId)
    expect(claims).toMatchObject({ sub: String(license.id), pln: 'pro' })
    expect(claims.upd).toBe(Math.floor(Date.parse(updatesUntil) / 1000))
    expect(claims.exp! - claims.iat!).toBe(settings.licenseTokenDays * DAY)

    // The same device again: same slot, lastSeenAt refreshed, no second new-device email.
    const activation = await activationFor(license.id, deviceId)
    expect(activation).toMatchObject({ active: true, deviceName: 'GAMING-PC', appVersion: '1.0.1' })
    expect(await deviceEmailJobs(activation.id)).toBe(1)
    await db().execute(
      sql`UPDATE activations SET last_seen_at = now() - interval '2 days' WHERE id = ${activation.id}`,
    )
    const again = await activate(license.key, deviceId, { appVersion: '1.0.2' })
    expect(again.status).toBe(200)
    expect(again.body.license).toMatchObject({ activeDevices: 1 })
    const reused = await activationFor(license.id, deviceId)
    expect(reused.id).toBe(activation.id)
    expect(reused.appVersion).toBe('1.0.2')
    expect(Date.parse(reused.lastSeenAt!)).toBeGreaterThan(Date.now() - 60_000)
    expect(await deviceEmailJobs(activation.id)).toBe(1)
    expect(
      (
        await payload.count({
          collection: 'activations',
          where: { license: { equals: license.id } },
          overrideAccess: true,
        })
      ).totalDocs,
    ).toBe(1)

    // The key as customers type it: lowercase, no hyphens, extra spaces, O for 0 and I for 1.
    expect(license.key).toMatch(/0/)
    expect(license.key).toMatch(/1/)
    for (const typed of [
      license.key.toLowerCase(),
      license.key.replaceAll('-', ''),
      `  ${license.key.replaceAll('0', 'O').replaceAll('1', 'I').replaceAll('-', ' - ')} `,
    ]) {
      const res = await activate(typed, deviceId)
      expect(res.status, typed).toBe(200)
      expect(res.body.license).toMatchObject({ activeDevices: 1 })
    }
  })

  it('answers license_not_found for another product or an unknown key', async () => {
    const customer = await newCustomer('notfound')
    const license = await newLicense(customer.id)
    const wrongProduct = await activate(license.key, device(), { product: `${run}-other` })
    expect(wrongProduct.status).toBe(404)
    expect(wrongProduct.body).toEqual(apiError('license_not_found'))
    const unknown = await activate('VYRO-7K2QD-M9X4T-BH3NC-PW8RA', device())
    expect(unknown.status).toBe(404)
    expect(unknown.body).toEqual(apiError('license_not_found'))
  })

  it('refuses a third device and lists the two using the slots', async () => {
    const customer = await newCustomer('limit3')
    const license = await newLicense(customer.id)
    expect((await activate(license.key, device(), { deviceName: 'GAMING-PC' })).status).toBe(200)
    expect((await activate(license.key, device(), { deviceName: 'OFFICE-LAPTOP' })).status).toBe(
      200,
    )
    const third = await activate(license.key, device(), { deviceName: 'THIRD' })
    expect(third.status).toBe(409)
    expect(third.body).toEqual({
      error: {
        code: 'activation_limit_reached',
        message: 'This license is active on 2 of 2 devices.',
        devices: [
          { deviceName: 'GAMING-PC', lastSeenAt: expect.any(String) },
          { deviceName: 'OFFICE-LAPTOP', lastSeenAt: expect.any(String) },
        ],
      },
    })
    for (const d of (third.body.error as { devices: { lastSeenAt: string }[] }).devices) {
      expect(new Date(d.lastSeenAt).toISOString()).toBe(d.lastSeenAt)
    }
  })

  it('gives two slots to exactly two of five devices racing for them', async () => {
    const customer = await newCustomer('race')
    const license = await newLicense(customer.id)
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        activate(license.key, device(), { deviceName: `RACER-${i}` }),
      ),
    )
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 409, 409, 409])
    expect(
      (
        await payload.count({
          collection: 'activations',
          where: { and: [{ license: { equals: license.id } }, { active: { equals: true } }] },
          overrideAccess: true,
        })
      ).totalDocs,
    ).toBe(2)
  })

  it('refuses suspended and revoked licenses', async () => {
    const customer = await newCustomer('blocked')
    const license = await newLicense(customer.id)
    for (const [status, code] of [
      ['suspended', 'license_suspended'],
      ['revoked', 'license_revoked'],
    ] as const) {
      await payload.update({
        collection: 'licenses',
        id: license.id,
        data: { status },
        overrideAccess: true,
        depth: 0,
      })
      const res = await activate(license.key, device())
      expect(res.status).toBe(403)
      expect(res.body).toEqual(apiError(code))
    }
  })
})

describe('POST /deactivate', () => {
  it('frees the slot for another device', async () => {
    const customer = await newCustomer('free')
    const license = await newLicense(customer.id)
    const [first, second, third] = [device(), device(), device()]
    await activate(license.key, first)
    await activate(license.key, second)
    expect((await activate(license.key, third)).status).toBe(409)
    const res = await deactivate(license.key, second)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(await activationFor(license.id, second)).toMatchObject({
      active: false,
      deactivatedBy: 'device',
    })
    const now = await activate(license.key, third)
    expect(now.status).toBe(200)
    expect(now.body.license).toMatchObject({ activeDevices: 2 })

    const again = await deactivate(license.key, second)
    expect(again.status).toBe(404)
    expect(again.body).toEqual(apiError('activation_not_found'))
    expect((await deactivate(license.key, device())).body).toEqual(apiError('activation_not_found'))
    const unknown = await deactivate('VYRO-7K2QD-M9X4T-BH3NC-PW8RA', first)
    expect(unknown.status).toBe(404)
    expect(unknown.body).toEqual(apiError('license_not_found'))
  })

  it('allows the monthly self-service deactivations (app and account page), not Support’s', async () => {
    const customer = await newCustomer('monthly')
    const license = await newLicense(customer.id)
    const cookie = await cookieFor(customer.id)

    // Support frees a device through the admin: recorded as Support's, not counted.
    const first = device()
    await activate(license.key, first)
    const byAdmin = await payload.update({
      collection: 'activations',
      id: (await activationFor(license.id, first)).id,
      data: { active: false },
      depth: 0,
      ...as('support'),
    })
    expect(byAdmin).toMatchObject({ active: false, deactivatedBy: 'support' })
    expect(byAdmin.deactivatedAt).toBeTruthy()
    // Ticking Active again is refused: the device activates from the app.
    await expect(
      payload.update({
        collection: 'activations',
        id: byAdmin.id,
        data: { active: true },
        ...as('support'),
      }),
    ).rejects.toMatchObject({ status: 400 })

    for (let i = 0; i < settings.deactivationsPerMonth; i++) {
      const d = device()
      expect((await activate(license.key, d)).status).toBe(200)
      if (i % 2) {
        const res = await accountDeactivate((await activationFor(license.id, d)).id, cookie)
        expect(res.body).toEqual({ ok: true })
        expect(await activationFor(license.id, d)).toMatchObject({ deactivatedBy: 'account' })
      } else {
        expect((await deactivate(license.key, d)).body).toEqual({ ok: true })
      }
    }

    const last = device()
    expect((await activate(license.key, last)).status).toBe(200)
    const refused = await deactivate(license.key, last)
    expect(refused.status).toBe(409)
    expect(refused.body).toEqual({
      error: {
        code: 'deactivation_limit_reached',
        message: `This license has used its ${settings.deactivationsPerMonth} deactivations for this month.`,
        resetsAt: nextMonthIST(),
      },
    })
    const lastActivation = await activationFor(license.id, last)
    const page = await accountDeactivate(lastActivation.id, cookie)
    expect(page.status).toBe(409)
    expect(page.body).toEqual({ error: 'deactivationLimit', resetsAt: nextMonthIST() })
    expect(await activationFor(license.id, last)).toMatchObject({ active: true })
    // Support still can.
    await payload.update({
      collection: 'activations',
      id: lastActivation.id,
      data: { active: false },
      depth: 0,
      ...as('support'),
    })
    const [summary] = await customerLicenses(payload, customer.id, 'en')
    expect(summary).toMatchObject({ devices: [], deactivationsLeft: 0, resetsAt: nextMonthIST() })
  })
})

describe('the account page (POST /api/v1/account/licenses/deactivate)', () => {
  it('frees its own customer’s device, and refuses others and signed-out requests', async () => {
    const owner = await newCustomer('pageowner')
    const stranger = await newCustomer('pagestranger')
    const license = await newLicense(owner.id)
    const d = device()
    await activate(license.key, d, { deviceName: 'HOME-PC' })
    const activation = await activationFor(license.id, d)
    const [listed] = await customerLicenses(payload, owner.id, 'en')
    expect(listed).toMatchObject({
      key: license.key,
      maxActivations: 2,
      devices: [{ id: activation.id, deviceName: 'HOME-PC' }],
      deactivationsLeft: settings.deactivationsPerMonth,
    })

    const signedOut = await accountDeactivate(activation.id)
    expect(signedOut.status).toBe(401)
    expect(signedOut.body).toEqual({ error: 'signedOut' })
    const other = await accountDeactivate(activation.id, await cookieFor(stranger.id))
    expect(other.status).toBe(404)
    expect(other.body).toEqual({ error: 'notFound' })
    expect(await activationFor(license.id, d)).toMatchObject({ active: true })

    const own = await accountDeactivate(activation.id, await cookieFor(owner.id))
    expect(own.status).toBe(200)
    expect(own.body).toEqual({ ok: true })
    const [after] = await customerLicenses(payload, owner.id, 'en')
    expect(after).toMatchObject({
      devices: [],
      deactivationsLeft: settings.deactivationsPerMonth - 1,
    })
  })
})

describe('POST /validate', () => {
  it('re-issues tokens up to 180 days past expiry, and refuses bad ones', async () => {
    const customer = await newCustomer('validate')
    const license = await newLicense(customer.id)
    const deviceId = device()
    const activated = await activate(license.key, deviceId)
    const token = activated.body.token as string

    const fresh = await validate(token)
    expect(fresh.status).toBe(200)
    expect(fresh.body).toEqual({ token: expect.any(String), license: activated.body.license })
    const claims = await verifyOffline(fresh.body.token as string, deviceId)
    expect(claims.sub).toBe(String(license.id))

    const now = Math.floor(Date.now() / 1000)
    const signed = (expiredDaysAgo: number, extra: object = {}) =>
      signToken(
        {
          sub: String(license.id),
          prd: run,
          pln: 'pro',
          did: deviceId,
          upd: null,
          iat: now - (expiredDaysAgo + 30) * DAY,
          exp: now - expiredDaysAgo * DAY,
          ...extra,
        },
        cfg,
      )
    const old = await validate(await signed(100))
    expect(old.status).toBe(200)
    expect(decodeJwt(old.body.token as string).exp).toBeGreaterThan(now)
    const tooOld = await validate(await signed(181))
    expect(tooOld.status).toBe(401)
    expect(tooOld.body).toEqual(apiError('invalid_token'))

    // A changed signature byte, and garbage.
    const [head, body, signature] = token.split('.') as [string, string, string]
    const flipped = signature[10] === 'A' ? 'B' : 'A'
    const tampered = `${head}.${body}.${signature.slice(0, 10)}${flipped}${signature.slice(11)}`
    expect((await validate(tampered)).body).toEqual(apiError('invalid_token'))
    expect((await validate('not.a.token')).status).toBe(401)

    // Trial tokens are renewed by /trial.
    const trial = await startTrial(deviceId)
    const trialRefused = await validate(trial.body.trialToken as string)
    expect(trialRefused.status).toBe(401)
    expect(trialRefused.body).toEqual(apiError('invalid_token'))

    // A deactivated device.
    await deactivate(license.key, deviceId)
    const gone = await validate(token)
    expect(gone.status).toBe(404)
    expect(gone.body).toEqual(apiError('activation_not_found'))
  })

  it('refuses suspended and revoked licenses', async () => {
    const customer = await newCustomer('validateblocked')
    const license = await newLicense(customer.id)
    const { body } = await activate(license.key, device())
    for (const [status, code] of [
      ['suspended', 'license_suspended'],
      ['revoked', 'license_revoked'],
    ] as const) {
      await payload.update({
        collection: 'licenses',
        id: license.id,
        data: { status },
        overrideAccess: true,
        depth: 0,
      })
      const res = await validate(body.token as string)
      expect(res.status).toBe(403)
      expect(res.body).toEqual(apiError(code))
    }
  })
})

describe('POST /trial', () => {
  it('starts once per device, returns the running trial, then answers trial_used', async () => {
    const deviceId = device()
    const before = Date.now()
    const first = await startTrial(deviceId)
    expect(first.status).toBe(200)
    expect(first.body).toEqual({ trialToken: expect.any(String), expiresAt: expect.any(String) })
    const expiresAt = Date.parse(first.body.expiresAt as string)
    expect(expiresAt).toBeGreaterThanOrEqual(before + settings.trialDays * DAY_MS - 1000)
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + settings.trialDays * DAY_MS)

    const claims = await verifyOffline(first.body.trialToken as string, deviceId)
    expect(claims).toMatchObject({ pln: 'trial', upd: null, exp: Math.floor(expiresAt / 1000) })
    const trialId = Number(/^trial:(\d+)$/.exec(String(claims.sub))?.[1])
    const row = await payload.findByID({
      collection: 'trials',
      id: trialId,
      depth: 0,
      overrideAccess: true,
    })
    expect(row).toMatchObject({ product: ids.product, deviceIdHash: hashDeviceId(deviceId, cfg) })

    // Again a second later: the same end, a new token.
    await new Promise((resolve) => setTimeout(resolve, 1100))
    const second = await startTrial(deviceId)
    expect(second.status).toBe(200)
    expect(second.body.expiresAt).toBe(first.body.expiresAt)
    expect(second.body.trialToken).not.toBe(first.body.trialToken)
    expect(decodeJwt(second.body.trialToken as string).sub).toBe(claims.sub)

    await db().execute(
      sql`UPDATE trials SET expires_at = now() - interval '1 day' WHERE id = ${trialId}`,
    )
    const { expiresAt: ended } = await payload.findByID({
      collection: 'trials',
      id: trialId,
      depth: 0,
      overrideAccess: true,
    })
    const used = await startTrial(deviceId)
    expect(used.status).toBe(409)
    expect(used.body).toEqual({
      error: {
        code: 'trial_used',
        message: "This device's trial ended.",
        expiredAt: new Date(ended).toISOString(),
      },
    })
  })

  it('refuses an unknown product', async () => {
    const res = await startTrial(device(), `${run}-nope`)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(apiError('invalid_request'))
  })
})

describe('request checks', () => {
  it('answers invalid_request for bad bodies', async () => {
    const good = { product: run, deviceId: device(), appVersion: '1.0.1' }
    for (const [name, body] of [
      ['not JSON', 'not json'],
      ['over 4 KB', JSON.stringify({ ...good, padding: 'x'.repeat(4 * 1024) })],
      ['missing field', { product: run, deviceId: device() }],
      ['uppercase deviceId', { ...good, deviceId: device().toUpperCase() }],
      ['short deviceId', { ...good, deviceId: device().slice(1) }],
      ['bad appVersion', { ...good, appVersion: '1.0' }],
    ] as const) {
      const res = await post(trialRoute, 'licensing/trial', body)
      expect(res.status, name).toBe(400)
      expect(res.body, name).toEqual(apiError('invalid_request'))
    }
    const activateBad = await post(activateRoute, 'licensing/activate', {
      licenseKey: 'VYRO-7K2QD-M9X4T-BH3NC-PW8RA',
      product: run,
      deviceId: device(),
      os: 'Windows 11',
      appVersion: '1.0.1',
    })
    expect(activateBad.body).toEqual(apiError('invalid_request'))
    expect((await post(validateRoute, 'licensing/validate', {})).body).toEqual(
      apiError('invalid_request'),
    )
    expect(
      (await post(deactivateRoute, 'licensing/deactivate', { licenseKey: 'VYRO-1', deviceId: 'x' }))
        .body,
    ).toEqual(apiError('invalid_request'))
  })

  it('rate-limits per IP and per license key with Retry-After', async () => {
    const ip = nextIp()
    let calls = 0
    while ((await limit('licensingIp', ip)) === 0 && calls < 1000) calls++
    const byIp = await post(
      trialRoute,
      'licensing/trial',
      { product: run, deviceId: device(), appVersion: '1.0.1' },
      { ip },
    )
    expect(byIp.status).toBe(429)
    expect(byIp.body).toEqual(apiError('rate_limited'))
    expect(Number(byIp.headers.get('retry-after'))).toBeGreaterThan(0)

    const customer = await newCustomer('ratelimit')
    const license = await newLicense(customer.id)
    calls = 0
    while ((await limit('licensingKey', hashLicenseKey(license.key))) === 0 && calls < 1000) calls++
    const byKey = await activate(license.key.toLowerCase(), device())
    expect(byKey.status).toBe(429)
    expect(byKey.body).toEqual(apiError('rate_limited'))
    expect(Number(byKey.headers.get('retry-after'))).toBeGreaterThan(0)
  })
})

describe('GET /keys and /health', () => {
  it('serves the public key as a cacheable JWKS', async () => {
    const res = keysRoute()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(await res.json()).toEqual({
      keys: [
        {
          kty: 'OKP',
          crv: 'Ed25519',
          x: expect.stringMatching(/^[\w-]{43}$/),
          kid: cfg.kid,
          alg: 'EdDSA',
          use: 'sig',
        },
      ],
    })
  })

  it('answers the health check', async () => {
    const res = await healthRoute()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

describe('emails (spec §11.7)', () => {
  it('sends a complimentary license’s key in the customer’s language', async () => {
    const english = await newCustomer('mailen', 'en')
    const hindi = await newCustomer('mailhi', 'hi')
    const en = await newLicense(english.id)
    const hi = await newLicense(hindi.id)
    await runJobs()
    const toEn = sent.filter((m) => m.to === english.email)
    const toHi = sent.filter((m) => m.to === hindi.email)
    expect(toEn).toHaveLength(1)
    expect(toHi).toHaveLength(1)
    expect(toEn[0]!.subject).toBe(`Your ${PRODUCT_NAME} license key`)
    expect(toEn[0]!.text).toContain(en.key)
    expect(toHi[0]!.subject).toContain('लाइसेंस कुंजी')
    expect(toHi[0]!.text).toContain(hi.key)
    // Sent once.
    await runJobs()
    expect(sent.filter((m) => m.to === english.email)).toHaveLength(1)
  })

  it('tells the license’s customer about a new device, and nobody once the account is deleted', async () => {
    const customer = await newCustomer('device')
    const license = await newLicense(customer.id)
    await runJobs()
    sent.length = 0
    await activate(license.key, device(), { deviceName: 'NEW-LAPTOP' })
    await runJobs()
    expect(sent).toEqual([
      expect.objectContaining({
        to: customer.email,
        subject: `${PRODUCT_NAME} was activated on a new device`,
        text: expect.stringContaining('NEW-LAPTOP'),
      }),
    ])

    sent.length = 0
    const leaving = await newCustomer('leaving')
    const theirs = await newLicense(leaving.id)
    await anonymizeCustomer(payload, leaving)
    await activate(theirs.key, device())
    await runJobs()
    expect(sent).toEqual([])
  })
})

describe('admin rules', () => {
  it('keeps purchase licenses to paid orders and license creation to the Owner', async () => {
    const customer = await newCustomer('admin')
    const data = {
      product: ids.product!,
      plan: ids.plan!,
      customer: customer.id,
      status: 'active' as const,
      source: 'complimentary' as const,
    }
    await expect(
      payload.create({
        collection: 'licenses',
        data: { ...data, source: 'purchase' },
        ...as('owner'),
      }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      payload.create({ collection: 'licenses', data, ...as('support') }),
    ).rejects.toMatchObject({ status: 403 })
    const created = await payload.create({ collection: 'licenses', data, ...as('owner') })
    expect(created).toMatchObject({ source: 'complimentary', status: 'active' })
  })

  it('lets Support suspend and reinstate, and only the Owner revoke', async () => {
    const customer = await newCustomer('support')
    const license = await newLicense(customer.id)
    const set = (status: 'active' | 'suspended' | 'revoked', role: 'owner' | 'support') =>
      payload.update({
        collection: 'licenses',
        id: license.id,
        data: { status },
        depth: 0,
        ...as(role),
      })
    expect((await set('suspended', 'support')).status).toBe('suspended')
    expect((await set('active', 'support')).status).toBe('active')
    await expect(set('revoked', 'support')).rejects.toMatchObject({ status: 403 })
    expect((await set('revoked', 'owner')).status).toBe('revoked')
    await expect(set('active', 'support')).rejects.toMatchObject({ status: 403 })
  })

  it('keeps key material and device records out of staff edits', async () => {
    const customer = await newCustomer('fixed')
    const license = await newLicense(customer.id)
    const other = await newLicense(customer.id)
    const before = await payload.findByID({
      collection: 'licenses',
      id: license.id,
      depth: 0,
      overrideAccess: true,
    })
    for (const role of ['owner', 'support'] as const) {
      await payload.update({
        collection: 'licenses',
        id: license.id,
        data: {
          keyHash: hashLicenseKey('VYRO-00000-00000-00000-00000'),
          keyEncrypted: other.keyEncrypted,
          keyLast4: 'XXXX',
          issuedAt: '2020-01-01T00:00:00.000Z',
          emailedAt: null,
          notes: `edited by ${role}`,
        },
        depth: 0,
        ...as(role),
      })
    }
    const after = await payload.findByID({
      collection: 'licenses',
      id: license.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(after).toMatchObject({
      keyHash: before.keyHash,
      keyEncrypted: before.keyEncrypted,
      keyLast4: before.keyLast4,
      issuedAt: before.issuedAt,
      licenseKey: license.key,
      notes: 'edited by support',
    })
    expect((await activate(license.key, device())).status).toBe(200)

    const deviceId = device()
    await activate(license.key, deviceId, { deviceName: 'REAL-NAME' })
    const activation = (await activationFor(license.id, deviceId))!
    const edited = await payload.update({
      collection: 'activations',
      id: activation.id,
      data: {
        deviceName: 'RENAMED',
        lastSeenAt: '2020-01-01T00:00:00.000Z',
        deactivatedBy: 'device',
        deactivatedAt: '2020-01-01T00:00:00.000Z',
      },
      depth: 0,
      ...as('support'),
    })
    expect(edited).toMatchObject({ deviceName: 'REAL-NAME', active: true })
    expect(edited.deactivatedAt ?? null).toBeNull()
    expect(edited.deactivatedBy ?? null).toBeNull()
  })

  it('refuses to duplicate a license', async () => {
    const customer = await newCustomer('duplicate')
    const license = await newLicense(customer.id)
    await expect(
      payload.duplicate({ collection: 'licenses', id: license.id, ...as('owner') }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('never takes a customer’s consent or deletion from staff, on create either', async () => {
    const created = await payload.create({
      collection: 'customers',
      data: {
        email: email('consent'),
        preferredLocale: 'en',
        status: 'active',
        deletedAt: '2026-01-01T00:00:00.000Z',
        marketingConsent: {
          given: true,
          at: '2026-01-01T00:00:00.000Z',
          textVersion: ACCOUNT_MARKETING_VERSION,
        },
      },
      depth: 0,
      ...as('owner'),
    })
    ids.customers.push(created.id)
    expect(created.deletedAt ?? null).toBeNull()
    expect(created.marketingConsent?.given ?? false).toBe(false)
  })
})
