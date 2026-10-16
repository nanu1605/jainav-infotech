/**
 * pnpm seed:store — development only. Lets the store be tried locally (and in e2e runs) before
 * the real prices exist: paid plans without a price get a stand-in one and are switched on.
 * The real VYRO Pro price is {{TO_DECIDE}}; this refuses to run against anything but a local
 * database, so the stand-in never reaches staging or production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const host = new URL(process.env.DATABASE_URL ?? 'postgres://invalid').hostname
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`seed:store only runs against a local database (DATABASE_URL host: ${host}).`)
}

/** ₹999 in paise: a round test figure, not a price decision. */
const STAND_IN_PRICE = 99_900

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
