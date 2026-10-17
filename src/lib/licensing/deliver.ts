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

/** Sends once: the claim column is set in SQL first and cleared again if sending fails. */
async function once(
  payload: Payload,
  table: 'licenses' | 'activations',
  column: 'emailed_at' | 'notified_at',
  id: number,
  send: () => Promise<void>,
) {
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = now()
    WHERE id = ${id} AND ${sql.identifier(column)} IS NULL RETURNING id
  `)
  if (!rows.length) return
  try {
    await send()
  } catch (error) {
    await drizzle(payload).execute(
      sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = NULL WHERE id = ${id}`,
    )
    throw error
  }
}

/** Who gets a license's emails, in their language; nobody once the account is deleted. */
const recipient = (customer: number | Customer) =>
  typeof customer === 'object' && customer.status !== 'deleted'
    ? { email: customer.email, locale: (customer.preferredLocale ?? 'en') as Locale }
    : null

/** The sendLicenseEmail job: a complimentary or manual license's key (spec §11.7). */
export async function sendLicenseEmail(id: number) {
  const payload = await getClient()
  await once(payload, 'licenses', 'emailed_at', id, async () => {
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
  await once(payload, 'activations', 'notified_at', id, async () => {
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
