import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { deviceActivatedEmail, licenseIssuedEmail } from '@/emails'
import type { Locale } from '@/i18n/routing'
import { getClient } from '@/lib/cms'
import { inboxAddress, sendEmail } from '@/lib/notify'
import { absoluteUrl } from '@/lib/seo'
import type { Customer, License, Plan, Product } from '@/payload-types'

import { decryptLicenseKey, licensingConfig } from './keys'

const drizzle = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle

/** The decrypted key of a license (the order email, the account page, the license email). */
export function licenseKeyOf(license: Pick<License, 'keyEncrypted'>): string {
  const cfg = licensingConfig()
  if (!cfg || !license.keyEncrypted) throw new Error('License key unavailable')
  return decryptLicenseKey(license.keyEncrypted, cfg)
}

/** The order's license key, if the order created one (spec §11.7: it joins the order email). */
export async function orderLicenseKey(payload: Payload, orderId: number) {
  const { docs } = await payload.find({
    collection: 'licenses',
    where: { order: { equals: orderId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ? licenseKeyOf(docs[0]) : undefined
}

const COLUMNS = {
  licenses: { claimed: 'email_claimed_at', sent: 'emailed_at' },
  activations: { claimed: 'notify_claimed_at', sent: 'notified_at' },
} as const

/**
 * Sends once, like the order email: a 20-minute claim in SQL first (shorter than the 30 minutes
 * after which src/jobs releases a job a dead process left running), the sent time after sending.
 * A failed send releases the claim; a claim still held without the email sent fails the run, so
 * Payload retries and then alerts instead of ending silently without an email.
 */
async function once(
  payload: Payload,
  table: keyof typeof COLUMNS,
  id: number,
  send: () => Promise<void>,
) {
  const t = sql.identifier(table)
  const claimed = sql.identifier(COLUMNS[table].claimed)
  const sent = sql.identifier(COLUMNS[table].sent)
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE ${t} SET ${claimed} = now()
    WHERE id = ${id} AND ${sent} IS NULL
      AND (${claimed} IS NULL OR ${claimed} < now() - interval '20 minutes')
    RETURNING id
  `)
  if (!rows.length) {
    const { rows: done } = await drizzle(payload).execute(
      sql`SELECT 1 FROM ${t} WHERE id = ${id} AND ${sent} IS NOT NULL`,
    )
    if (done.length) return
    throw new Error(`The ${table} email is claimed by another run`)
  }
  try {
    await send()
  } catch (error) {
    await drizzle(payload).execute(sql`UPDATE ${t} SET ${claimed} = NULL WHERE id = ${id}`)
    throw error
  }
  await drizzle(payload).execute(sql`UPDATE ${t} SET ${sent} = now() WHERE id = ${id}`)
}

/** Who gets a license's emails, in their language; nobody once the account is deleted. */
const recipient = (customer: number | Customer) =>
  typeof customer === 'object' && customer.status !== 'deleted'
    ? { email: customer.email, locale: (customer.preferredLocale ?? 'en') as Locale }
    : null

/** The sendLicenseEmail job: a complimentary or manual license's key (spec §11.7). */
export async function sendLicenseEmail(id: number) {
  const payload = await getClient()
  await once(payload, 'licenses', id, async () => {
    const license = await payload.findByID({
      collection: 'licenses',
      id,
      depth: 1,
      overrideAccess: true,
    })
    const to = recipient(license.customer)
    if (!to) return
    const [product, plan] = await names(payload, license, to.locale)
    const message = await licenseIssuedEmail({
      locale: to.locale,
      productName: product.name,
      planName: plan.name ?? plan.code,
      licenseKey: licenseKeyOf(license),
      updatesUntil: license.updatesUntil ?? null,
      licensesUrl: absoluteUrl(to.locale, '/account/licenses'),
    })
    await sendEmail(payload, to.email, message, {
      replyTo: await inboxAddress(payload, 'support'),
    })
  })
}

/** The sendDeviceEmail job: a license was activated on a new device (spec §11.7). */
export async function sendDeviceEmail(id: number) {
  const payload = await getClient()
  await once(payload, 'activations', id, async () => {
    const activation = await payload.findByID({
      collection: 'activations',
      id,
      depth: 2,
      overrideAccess: true,
    })
    const license = activation.license as License
    const to = recipient(license.customer)
    if (!to) return
    const [product] = await names(payload, license, to.locale)
    const message = await deviceActivatedEmail({
      locale: to.locale,
      productName: product.name,
      deviceName: activation.deviceName,
      os: activation.os ?? '',
      activatedAt: activation.firstSeenAt ?? activation.createdAt,
      licensesUrl: absoluteUrl(to.locale, '/account/licenses'),
    })
    await sendEmail(payload, to.email, message, {
      replyTo: await inboxAddress(payload, 'support'),
    })
  })
}

/** The license's product and plan in the recipient's language. */
const names = (payload: Payload, license: License, locale: Locale) =>
  Promise.all([
    payload.findByID({
      collection: 'products',
      id: typeof license.product === 'object' ? license.product.id : license.product,
      depth: 0,
      locale,
      overrideAccess: true,
    }) as Promise<Product>,
    payload.findByID({
      collection: 'plans',
      id: typeof license.plan === 'object' ? license.plan.id : license.plan,
      depth: 0,
      locale,
      overrideAccess: true,
    }) as Promise<Plan>,
  ])
