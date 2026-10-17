import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  APIError,
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import type { LicenseStatus } from '@/collections/Licensing'
import { getCommerceSettings } from '@/lib/commerce/store'
import type { CommerceSetting, License } from '@/payload-types'

import { addMonthsIST, istMonthStart } from './dates'
import {
  encryptLicenseKey,
  generateLicenseKey,
  hashDeviceId,
  hashLicenseKey,
  keyPrefix,
  licensingConfig,
  type LicensingConfig,
} from './keys'
import { DAY, seconds, signToken } from './tokens'

const relId = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as { id: number }).id : (value as number)

/** The Licensing tab of Commerce settings, with the spec §22 defaults. */
export const licensingSettings = (s: CommerceSetting) => ({
  defaultMaxActivations: s.defaultMaxActivations ?? 2,
  deactivationsPerMonth: s.deactivationsPerMonth ?? 3,
  trialDays: s.trialDays ?? 14,
  licenseTokenDays: s.licenseTokenDays ?? 30,
  refreshAfterDays: s.refreshAfterDays ?? 7,
  tokenGraceDays: s.tokenGraceDays ?? 180,
})
export type LicensingSettings = ReturnType<typeof licensingSettings>

/**
 * A new license's key and defaults (the Licenses beforeChange hook): the key itself is never
 * stored, only its hash, an encrypted copy and the last four characters (spec §12.2).
 */
export async function prepareNewLicense(
  req: PayloadRequest,
  data: Partial<License>,
): Promise<Partial<License>> {
  const cfg = licensingConfig()
  if (!cfg) throw new APIError('Licensing keys are not configured.', 503)
  const [product, plan, settings] = await Promise.all([
    req.payload.findByID({
      collection: 'products',
      id: relId(data.product),
      depth: 0,
      overrideAccess: true,
      req,
    }),
    req.payload.findByID({
      collection: 'plans',
      id: relId(data.plan),
      depth: 0,
      overrideAccess: true,
      req,
    }),
    getCommerceSettings(req.payload),
  ])
  if (relId(plan.product) !== product.id) {
    throw new APIError('That plan belongs to another product.', 400)
  }
  const key = generateLicenseKey(keyPrefix(product.slug))
  const issuedAt = new Date()
  return {
    ...data,
    keyHash: hashLicenseKey(key),
    keyEncrypted: encryptLicenseKey(key, cfg),
    keyLast4: key.slice(-4),
    issuedAt: issuedAt.toISOString(),
    maxActivations:
      data.maxActivations ??
      plan.maxActivations ??
      licensingSettings(settings).defaultMaxActivations,
    updatesUntil:
      data.updatesUntil ??
      (plan.updatesForMonths ? addMonthsIST(issuedAt, plan.updatesForMonths).toISOString() : null),
  }
}

type Tx = NonNullable<PostgresAdapter['sessions'][string]>['db']

/** Runs `work` in one Payload transaction: raw SQL through `tx`, Local API calls with `req`. */
export async function inTransaction<T>(
  payload: Payload,
  work: (tx: Tx, req: PayloadRequest) => Promise<T>,
): Promise<T> {
  const req = await createLocalReq({ context: { disableRevalidate: true } }, payload)
  await initTransaction(req)
  const tx = (payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]
    ?.db
  if (!tx) throw new Error('inTransaction: no transaction')
  try {
    const result = await work(tx, req)
    await commitTransaction(req)
    return result
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

type LicenseRow = {
  id: number
  status: LicenseStatus
  maxActivations: number
  updatesUntil: string | null
  product: string
  plan: string
}

/** One license by key hash or id, with its product slug and plan code; locked when `lock`. */
async function findLicense(
  tx: Tx,
  where: { keyHash: string } | { id: number },
  lock = false,
): Promise<LicenseRow | undefined> {
  const { rows } = await tx.execute(sql`
    SELECT l.id, l.status, COALESCE(l.max_activations, 1)::int AS "maxActivations",
           l.updates_until AS "updatesUntil", p.slug AS product, pl.code AS plan
    FROM licenses l
    JOIN products p ON p.id = l.product_id
    JOIN plans pl ON pl.id = l.plan_id
    WHERE ${'keyHash' in where ? sql`l.key_hash = ${where.keyHash}` : sql`l.id = ${where.id}`}
    ${lock ? sql`FOR UPDATE OF l` : sql``}
  `)
  const row = rows[0] as (Omit<LicenseRow, 'updatesUntil'> & { updatesUntil: unknown }) | undefined
  return row && { ...row, updatesUntil: row.updatesUntil ? isoOf(row.updatesUntil) : null }
}

const isoOf = (value: unknown) => new Date(value as string | Date).toISOString()

const activeCount = async (tx: Tx, licenseId: number) =>
  Number(
    (
      (
        await tx.execute(
          sql`SELECT count(*) AS n FROM activations WHERE license_id = ${licenseId} AND active`,
        )
      ).rows[0] as { n: string }
    ).n,
  )

/** The `license` object of /activate and /validate (spec §12.4). */
export const licenseView = (license: LicenseRow, activeDevices: number) => ({
  plan: license.plan,
  status: license.status,
  maxActivations: license.maxActivations,
  activeDevices,
  updatesUntil: license.updatesUntil,
})
export type LicenseView = ReturnType<typeof licenseView>

const blocked = (status: LicenseStatus) =>
  status === 'active'
    ? null
    : status === 'suspended'
      ? ('license_suspended' as const)
      : ('license_revoked' as const)

async function licenseToken(
  license: LicenseRow,
  deviceId: string,
  cfg: LicensingConfig,
  settings: LicensingSettings,
  now: Date,
) {
  const iat = seconds(now)
  return signToken(
    {
      sub: String(license.id),
      prd: license.product,
      pln: license.plan,
      did: deviceId,
      upd: license.updatesUntil ? seconds(new Date(license.updatesUntil)) : null,
      iat,
      exp: iat + settings.licenseTokenDays * DAY,
    },
    cfg,
  )
}

export type Device = { deviceId: string; deviceName: string; os: string; appVersion: string }

export type ActivateResult =
  | { ok: true; token: string; license: LicenseView; refreshAfter: string }
  | { ok: false; code: 'license_not_found' | 'license_revoked' | 'license_suspended' }
  | {
      ok: false
      code: 'activation_limit_reached'
      maxActivations: number
      devices: { deviceName: string; lastSeenAt: string }[]
    }

/**
 * `POST /activate` (spec §12.4). The license row is locked, so two devices racing for the last
 * slot can't both take it. The same device again reuses its activation; a new one emails the
 * customer (the job exists only if this commits).
 */
export async function activate(
  payload: Payload,
  cfg: LicensingConfig,
  settings: LicensingSettings,
  input: { keyHash: string; product: string } & Device,
  now = new Date(),
): Promise<ActivateResult> {
  return inTransaction(payload, async (tx, req) => {
    const license = await findLicense(tx, { keyHash: input.keyHash }, true)
    if (!license || license.product !== input.product)
      return { ok: false, code: 'license_not_found' }
    const status = blocked(license.status)
    if (status) return { ok: false, code: status }
    const deviceIdHash = hashDeviceId(input.deviceId, cfg)
    const seen = now.toISOString()
    const { rows: same } = await tx.execute(sql`
      UPDATE activations
      SET last_seen_at = ${seen}, device_name = ${input.deviceName}, os = ${input.os},
          app_version = ${input.appVersion}, updated_at = now()
      WHERE license_id = ${license.id} AND device_id_hash = ${deviceIdHash} AND active
      RETURNING id
    `)
    if (!same.length) {
      if ((await activeCount(tx, license.id)) >= license.maxActivations) {
        const { rows } = await tx.execute(sql`
          SELECT device_name AS "deviceName", last_seen_at AS "lastSeenAt" FROM activations
          WHERE license_id = ${license.id} AND active ORDER BY last_seen_at
        `)
        return {
          ok: false,
          code: 'activation_limit_reached',
          maxActivations: license.maxActivations,
          devices: (rows as { deviceName: string; lastSeenAt: unknown }[]).map((d) => ({
            deviceName: d.deviceName,
            lastSeenAt: isoOf(d.lastSeenAt),
          })),
        }
      }
      const activation = await payload.create({
        collection: 'activations',
        data: {
          license: license.id,
          deviceIdHash,
          deviceName: input.deviceName,
          os: input.os,
          appVersion: input.appVersion,
          firstSeenAt: seen,
          lastSeenAt: seen,
          active: true,
        },
        overrideAccess: true,
        depth: 0,
        req,
      })
      await payload.jobs.queue({ task: 'sendDeviceEmail', input: { id: activation.id }, req })
    }
    return {
      ok: true,
      token: await licenseToken(license, input.deviceId, cfg, settings, now),
      license: licenseView(license, await activeCount(tx, license.id)),
      refreshAfter: new Date(now.getTime() + settings.refreshAfterDays * DAY * 1000).toISOString(),
    }
  })
}

export type ValidateResult =
  | { ok: true; token: string; license: LicenseView }
  | {
      ok: false
      code: 'invalid_token' | 'license_revoked' | 'license_suspended' | 'activation_not_found'
    }

/** `POST /validate` with a verified token's claims: re-checks the database, issues a new token. */
export async function validate(
  payload: Payload,
  cfg: LicensingConfig,
  settings: LicensingSettings,
  claims: { sub: string; prd: string; did: string },
  now = new Date(),
): Promise<ValidateResult> {
  // Trial tokens are renewed by /trial (docs/licensing-api.md).
  if (!/^\d+$/.test(claims.sub)) return { ok: false, code: 'invalid_token' }
  return inTransaction(payload, async (tx) => {
    const license = await findLicense(tx, { id: Number(claims.sub) })
    if (!license || license.product !== claims.prd) return { ok: false, code: 'invalid_token' }
    const status = blocked(license.status)
    if (status) return { ok: false, code: status }
    const { rows } = await tx.execute(sql`
      UPDATE activations SET last_seen_at = ${now.toISOString()}, updated_at = now()
      WHERE license_id = ${license.id} AND device_id_hash = ${hashDeviceId(claims.did, cfg)}
        AND active
      RETURNING id
    `)
    if (!rows.length) return { ok: false, code: 'activation_not_found' }
    return {
      ok: true,
      token: await licenseToken(license, claims.did, cfg, settings, now),
      license: licenseView(license, await activeCount(tx, license.id)),
    }
  })
}

export type DeactivateResult =
  | { ok: true }
  | { ok: false; code: 'license_not_found' | 'activation_not_found' }
  | { ok: false; code: 'deactivation_limit_reached'; limit: number; resetsAt: string }

/** Self-service deactivations so far this calendar month in India time (spec §22). */
async function deactivationsThisMonth(tx: Tx, licenseId: number, now: Date) {
  const { rows } = await tx.execute(sql`
    SELECT count(*) AS n FROM activations
    WHERE license_id = ${licenseId} AND deactivated_by IN ('device', 'account')
      AND deactivated_at >= ${istMonthStart(now).toISOString()}
  `)
  return Number((rows[0] as { n: string }).n)
}

/**
 * Frees a device slot, from the app (`POST /deactivate`, by key and device) or the account page
 * (by activation, for its own customer). Both count toward the monthly limit; Support's don't.
 */
export async function deactivate(
  payload: Payload,
  settings: LicensingSettings,
  target:
    | { by: 'device'; keyHash: string; deviceIdHash: string }
    | { by: 'account'; activationId: number; customerId: number },
  now = new Date(),
): Promise<DeactivateResult> {
  return inTransaction(payload, async (tx) => {
    let licenseId: number
    let activationId: number | undefined
    if (target.by === 'device') {
      const license = await findLicense(tx, { keyHash: target.keyHash }, true)
      if (!license) return { ok: false, code: 'license_not_found' }
      licenseId = license.id
      const { rows } = await tx.execute(sql`
        SELECT id FROM activations
        WHERE license_id = ${licenseId} AND device_id_hash = ${target.deviceIdHash} AND active
      `)
      activationId = (rows[0] as { id: number } | undefined)?.id
    } else {
      const { rows } = await tx.execute(sql`
        SELECT a.id, l.id AS "licenseId" FROM activations a
        JOIN licenses l ON l.id = a.license_id
        WHERE a.id = ${target.activationId} AND l.customer_id = ${target.customerId} AND a.active
        FOR UPDATE OF l
      `)
      const row = rows[0] as { id: number; licenseId: number } | undefined
      if (!row) return { ok: false, code: 'activation_not_found' }
      licenseId = row.licenseId
      activationId = row.id
    }
    if (!activationId) return { ok: false, code: 'activation_not_found' }
    if ((await deactivationsThisMonth(tx, licenseId, now)) >= settings.deactivationsPerMonth) {
      return {
        ok: false,
        code: 'deactivation_limit_reached',
        limit: settings.deactivationsPerMonth,
        resetsAt: istMonthStart(now, 1).toISOString(),
      }
    }
    await tx.execute(sql`
      UPDATE activations
      SET active = false, deactivated_at = ${now.toISOString()}, deactivated_by = ${target.by},
          updated_at = now()
      WHERE id = ${activationId}
    `)
    return { ok: true }
  })
}

export type TrialResult =
  | { ok: true; trialToken: string; expiresAt: string }
  | { ok: false; code: 'invalid_request' }
  | { ok: false; code: 'trial_used'; expiredAt: string }

/**
 * `POST /trial` (spec §12.4): one per device and product, enforced by a unique index. While it
 * runs, every call returns the same `expiresAt` with a fresh token.
 */
export async function trial(
  payload: Payload,
  cfg: LicensingConfig,
  settings: LicensingSettings,
  input: { product: string; deviceId: string },
  now = new Date(),
): Promise<TrialResult> {
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const { rows: products } = await db.execute(
    sql`SELECT id FROM products WHERE slug = ${input.product} AND _status = 'published'`,
  )
  const productId = (products[0] as { id: number } | undefined)?.id
  if (!productId) return { ok: false, code: 'invalid_request' }
  const deviceIdHash = hashDeviceId(input.deviceId, cfg)
  const ends = new Date(now.getTime() + settings.trialDays * DAY * 1000)
  await db.execute(sql`
    INSERT INTO trials (product_id, device_id_hash, started_at, expires_at, updated_at, created_at)
    VALUES (${productId}, ${deviceIdHash}, ${now.toISOString()}, ${ends.toISOString()}, now(), now())
    ON CONFLICT (product_id, device_id_hash) DO NOTHING
  `)
  const { rows } = await db.execute(sql`
    SELECT id, expires_at AS "expiresAt" FROM trials
    WHERE product_id = ${productId} AND device_id_hash = ${deviceIdHash}
  `)
  const row = rows[0] as { id: number; expiresAt: unknown }
  const expiresAt = new Date(row.expiresAt as string | Date)
  if (expiresAt <= now) return { ok: false, code: 'trial_used', expiredAt: expiresAt.toISOString() }
  const trialToken = await signToken(
    {
      sub: `trial:${row.id}`,
      prd: input.product,
      pln: 'trial',
      did: input.deviceId,
      upd: null,
      iat: seconds(now),
      exp: seconds(expiresAt),
    },
    cfg,
  )
  return { ok: true, trialToken, expiresAt: expiresAt.toISOString() }
}
