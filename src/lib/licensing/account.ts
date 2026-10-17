import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { LicenseStatus } from '@/collections/Licensing'
import type { Locale } from '@/i18n/routing'
import { getCommerceSettings } from '@/lib/commerce/store'
import type { Plan, Product } from '@/payload-types'

import { istMonthStart } from './dates'
import { licenseKeyOf } from './deliver'
import { licensingSettings } from './license'

export type AccountDevice = {
  id: number
  deviceName: string
  os: string | null
  appVersion: string | null
  firstSeenAt: string | null
  lastSeenAt: string | null
}

export type AccountLicense = {
  id: number
  product: { id: number; name: string; slug: string }
  plan: string
  key: string
  status: LicenseStatus
  maxActivations: number
  updatesUntil: string | null
  issuedAt: string | null
  devices: AccountDevice[]
  /** Self-service deactivations left this month (spec §22), and when the count resets. */
  deactivationsLeft: number
  resetsAt: string
}

/**
 * The signed-in customer's licenses with their active devices (spec §11.2 Licenses page). Customer
 * data: `overrideAccess` with an explicit `where` on the customer (CLAUDE.md).
 */
export async function customerLicenses(
  payload: Payload,
  customerId: number,
  locale: Locale,
  now = new Date(),
): Promise<AccountLicense[]> {
  const [{ docs }, settings] = await Promise.all([
    payload.find({
      collection: 'licenses',
      where: { customer: { equals: customerId } },
      depth: 1,
      locale,
      sort: '-issuedAt',
      limit: 100,
      overrideAccess: true,
    }),
    getCommerceSettings(payload).then(licensingSettings),
  ])
  if (!docs.length) return []
  const ids = docs.map((l) => l.id)
  const [{ docs: devices }, { rows }] = await Promise.all([
    payload.find({
      collection: 'activations',
      where: { and: [{ license: { in: ids } }, { active: { equals: true } }] },
      depth: 0,
      sort: '-lastSeenAt',
      limit: 1000,
      overrideAccess: true,
    }),
    (payload.db as unknown as PostgresAdapter).drizzle.execute(sql`
      SELECT license_id AS id, count(*) AS n FROM activations
      WHERE license_id IN ${ids} AND deactivated_by IN ('device', 'account')
        AND deactivated_at >= ${istMonthStart(now).toISOString()}
      GROUP BY license_id
    `),
  ])
  const used = new Map((rows as { id: number; n: string }[]).map((r) => [r.id, Number(r.n)]))
  const resetsAt = istMonthStart(now, 1).toISOString()
  return docs.map((license) => {
    const product = license.product as Product
    const plan = license.plan as Plan
    return {
      id: license.id,
      product: { id: product.id, name: product.name, slug: product.slug },
      plan: plan.name || plan.code,
      key: licenseKeyOf(license),
      status: license.status,
      maxActivations: license.maxActivations ?? 1,
      updatesUntil: license.updatesUntil ?? null,
      issuedAt: license.issuedAt ?? null,
      devices: devices
        .filter((d) => (typeof d.license === 'object' ? d.license.id : d.license) === license.id)
        .map((d) => ({
          id: d.id,
          deviceName: d.deviceName,
          os: d.os ?? null,
          appVersion: d.appVersion ?? null,
          firstSeenAt: d.firstSeenAt ?? null,
          lastSeenAt: d.lastSeenAt ?? null,
        })),
      deactivationsLeft: Math.max(0, settings.deactivationsPerMonth - (used.get(license.id) ?? 0)),
      resetsAt,
    }
  })
}
