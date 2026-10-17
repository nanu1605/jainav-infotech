import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { after } from 'next/server'
import { APIError, type Payload, type PayloadHandler } from 'payload'

import { deviceActivatedEmail, licenseIssuedEmail, licenseStatusEmail } from '@/emails'
import type { Locale } from '@/i18n/routing'
import { getClient } from '@/lib/cms'
import { requireRole, routeId } from '@/lib/commerce/adminEndpoint'
import { runQueuedJobs } from '@/lib/commerce/fulfil'
import { errorCode } from '@/lib/commerce/http'
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
  // Credit notes: the refund email (src/lib/invoices/deliver.ts).
  invoices: { claimed: 'email_claimed_at', sent: 'emailed_at' },
} as const

/**
 * Sends once, like the order email: a 12-minute claim in SQL first (shorter than the 30-minute job
 * release in src/jobs and than the retries' span), the sent time after sending.
 * A failed send releases the claim; a claim still held without the email sent fails the run, so
 * Payload retries and then alerts instead of ending silently without an email.
 */
export async function once(
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
      AND (${claimed} IS NULL OR ${claimed} < now() - interval '12 minutes')
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

/** Whether a license's suspension or revocation still has to be told to its customer. */
const statusUntold = sql`status IN ('suspended', 'revoked')
  AND status_notified_as::text IS DISTINCT FROM status::text`

/**
 * The license suspended / revoked email (spec §11.7), whoever changed the status: Support, the
 * Owner or a payment dispute. `statusNotifiedAs` is the status the customer was last told, so each
 * change emails once: a 12-minute claim in SQL first (like `once`), the told status after sending,
 * the claim released if sending fails. Reinstating clears it (Licenses hook), so a later
 * suspension emails again. A deleted customer gets nothing; the status still counts as told.
 */
export async function sendLicenseStatusEmail(id: number) {
  const payload = await getClient()
  const db = drizzle(payload)
  const { rows } = await db.execute(sql`
    UPDATE licenses SET status_claimed_at = now()
    WHERE id = ${id} AND ${statusUntold}
      AND (status_claimed_at IS NULL OR status_claimed_at < now() - interval '12 minutes')
    RETURNING status
  `)
  const status = (rows[0] as { status: 'suspended' | 'revoked' } | undefined)?.status
  if (!status) {
    const { rows: due } = await db.execute(
      sql`SELECT 1 FROM licenses WHERE id = ${id} AND ${statusUntold}`,
    )
    if (due.length) throw new Error('The license status email is claimed by another run')
    return
  }
  try {
    const license = await payload.findByID({
      collection: 'licenses',
      id,
      depth: 1,
      overrideAccess: true,
    })
    const to = recipient(license.customer)
    if (to) {
      const [product] = await names(payload, license, to.locale)
      const message = await licenseStatusEmail({
        locale: to.locale,
        status,
        productName: product.name,
        licensesUrl: absoluteUrl(to.locale, '/account/licenses'),
      })
      await sendEmail(payload, to.email, message, {
        replyTo: await inboxAddress(payload, 'support'),
      })
    }
  } catch (error) {
    await db.execute(sql`UPDATE licenses SET status_claimed_at = NULL WHERE id = ${id}`)
    throw error
  }
  await db.execute(sql`
    UPDATE licenses SET status_notified_as = ${status}, status_claimed_at = NULL WHERE id = ${id}
  `)
}

/**
 * Sends a status email once the admin's save has responded, when there is a request to run after
 * (Payload's REST API). Elsewhere, and when a send fails, the reconcile job's sweep sends it.
 */
export function statusEmailSoon(id: number) {
  try {
    after(() =>
      sendLicenseStatusEmail(id).catch((error: unknown) =>
        console.error(`licensing: status email for license ${id} failed:`, errorCode(error)),
      ),
    )
  } catch {
    // Outside a request (a job, a script): left to the sweep.
  }
}

/**
 * The sweep, with the reconcile job every 15 minutes: status emails nobody could send right away
 * (no request to run after, a failed send, a crash). Job slugs are a database enum, so this rides
 * on an existing schedule instead of a task of its own.
 */
export async function sendPendingStatusEmails() {
  const payload = await getClient()
  const { rows } = await drizzle(payload).execute(
    sql`SELECT id FROM licenses WHERE ${statusUntold} ORDER BY id LIMIT 100`,
  )
  for (const { id } of rows as { id: number }[]) {
    try {
      await sendLicenseStatusEmail(id)
    } catch (error) {
      console.error(`licensing: status email for license ${id} failed:`, errorCode(error))
    }
  }
}

/**
 * POST /api/licenses/:id/resend-email (spec §10), Owner and Support: the license email with the
 * key again, purchases included (their key first came in the order email). Only active licenses,
 * and not while a send is in progress.
 */
export const resendLicenseEmailEndpoint: PayloadHandler = async (req) => {
  requireRole(req, 'Only the Owner and Support can resend a license email.', 'owner', 'support')
  const id = routeId(req)
  const payload = req.payload
  const license = await payload
    .findByID({ collection: 'licenses', id, depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!license) throw new APIError('Not found.', 404)
  if (!recipient(license.customer)) {
    throw new APIError('The customer’s account is deleted: there is nobody to email.', 409)
  }
  if (license.status !== 'active') {
    throw new APIError(`This license is ${license.status}: its key isn’t sent.`, 409)
  }
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE licenses SET emailed_at = NULL, email_claimed_at = NULL
    WHERE id = ${id} AND (emailed_at IS NOT NULL OR email_claimed_at IS NULL
      OR email_claimed_at < now() - interval '12 minutes')
    RETURNING id
  `)
  if (!rows.length) throw new APIError('The license email is being sent right now.', 409)
  await payload.jobs.queue({ task: 'sendLicenseEmail', input: { id } })
  after(() => runQueuedJobs(payload))
  return Response.json({ ok: true })
}
