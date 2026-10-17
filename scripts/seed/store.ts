/**
 * pnpm seed:store — development only. Lets the store be tried locally (and in e2e runs) before
 * the real prices exist: paid plans without a price get a stand-in one and are switched on.
 * The real VYRO Pro price is {{TO_DECIDE}}; this refuses to run against anything but a local
 * database, so the stand-in never reaches staging or production.
 *
 * It also gives the dev customer (DEV_BUYER) a complimentary VYRO Pro license and prints its key,
 * for scripts/license-test-client.
 */
import { register } from 'node:module'

import config from '@payload-config'
import { getPayload } from 'payload'

const host = new URL(process.env.DATABASE_URL ?? 'postgres://invalid').hostname
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`seed:store only runs against a local database (DATABASE_URL host: ${host}).`)
}

// The license hooks load server-only modules; outside Next, `server-only` is Next's empty build
// (as in vitest.config.mts).
const SERVER_ONLY = 'next/dist/compiled/server-only/empty.js'
const hook = `export const resolve = (s, c, next) => next(s === 'server-only' ? '${SERVER_ONLY}' : s, c)`
register(`data:text/javascript,${encodeURIComponent(hook)}`)

/** ₹999 in paise: a round test figure, not a price decision. */
const STAND_IN_PRICE = 99_900
const DEV_BUYER = 'dev-buyer@example.test'

const payload = await getPayload({ config })
const { docs } = await payload.find({
  collection: 'plans',
  where: { and: [{ code: { not_equals: 'free' } }, { priceINR: { exists: false } }] },
  pagination: false,
  depth: 0,
  overrideAccess: true,
})
for (const plan of docs) {
  await payload.update({
    collection: 'plans',
    id: plan.id,
    data: { priceINR: STAND_IN_PRICE, active: true },
    depth: 0,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
}
payload.logger.info(`Gave ${docs.length} plan(s) the stand-in price.`)

const first = async <T>(result: Promise<{ docs: T[] }>) => (await result).docs[0]
const customer =
  (await first(
    payload.find({
      collection: 'customers',
      where: { email: { equals: DEV_BUYER } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  )) ??
  (await payload.create({
    collection: 'customers',
    data: { email: DEV_BUYER, name: 'Dev Buyer', preferredLocale: 'en', status: 'active' },
    depth: 0,
    overrideAccess: true,
  }))
const vyro = await first(
  payload.find({
    collection: 'products',
    where: { slug: { equals: 'vyro' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  }),
)
const pro =
  vyro &&
  (await first(
    payload.find({
      collection: 'plans',
      where: { and: [{ product: { equals: vyro.id } }, { code: { equals: 'pro' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  ))
if (!vyro || !pro) throw new Error('No VYRO Pro plan: run pnpm seed first.')

// The beforeChange hook generates the key; afterRead's licenseKey decrypts it.
const license =
  (await first(
    payload.find({
      collection: 'licenses',
      where: { and: [{ customer: { equals: customer.id } }, { product: { equals: vyro.id } }] },
      sort: 'issuedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  )) ??
  (await payload.create({
    collection: 'licenses',
    data: {
      product: vyro.id,
      plan: pro.id,
      customer: customer.id,
      status: 'active',
      source: 'complimentary',
    },
    depth: 0,
    overrideAccess: true,
  }))
payload.logger.info(`${DEV_BUYER}'s VYRO license (${license.status}): ${license.licenseKey}`)
