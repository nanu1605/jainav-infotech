import 'server-only'

import { setTimeout as sleep } from 'node:timers/promises'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { after } from 'next/server'
import {
  addDataAndFileToRequest,
  APIError,
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadHandler,
  type PayloadRequest,
} from 'payload'
import { z } from 'zod'

import { hasRole } from '@/access/roles'
import { waitlistEmail } from '@/emails'
import { routing, type Locale } from '@/i18n/routing'
import { getClient } from '@/lib/cms'
import { runQueuedJobs } from '@/lib/commerce/fulfil'
import { inboxAddress, sendEmail } from '@/lib/notify'
import { absoluteUrl } from '@/lib/seo'
import { unsubscribeHeaders, unsubscribeUrl } from '@/lib/tokens'
import type { WaitlistEmail } from '@/payload-types'

// ponytail: one job run stays short (about a minute); a next job is queued for the rest.
const BATCH = 100
/** About 2 sends a second: Resend's default API rate limit, shared with every other email. */
const GAP_MS = 500

const drizzle = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle
const productOf = (email: WaitlistEmail) =>
  typeof email.product === 'object' ? email.product.id : email.product

/**
 * Who may get a product's waitlist email (spec §13): waitlist sign-ups for it whose marketing
 * consent is given, not withdrawn and not unsubscribed, and not marked spam. Each row carries the
 * normalized address and its sha256 (the hash a delivery is stored under, as rateLimit.ts's sha256
 * computes it: hex of the UTF-8 bytes).
 */
const eligible = (productId: number) => sql`
  SELECT l.id, l.locale, l.created_at, a.address,
    encode(sha256(convert_to(a.address, 'UTF8')), 'hex') AS hash
  FROM leads l CROSS JOIN LATERAL (SELECT lower(btrim(l.email)) AS address) a
  WHERE l.type = 'waitlist' AND l.product_id = ${productId}
    AND l.marketing_consent_given = true AND l.marketing_consent_withdrawn_at IS NULL
    AND l.unsubscribed_at IS NULL AND l.status <> 'spam'
`

/** Eligible addresses this email hasn't claimed yet. */
const pending = (emailId: number, productId: number) => sql`
  SELECT * FROM (${eligible(productId)}) e
  WHERE NOT EXISTS (
    SELECT 1 FROM waitlist_deliveries d WHERE d.email_id = ${emailId} AND d.address_hash = e.hash
  )
`

/** How many addresses a waitlist email would reach now (one per address, spec §13). */
async function countRecipients(payload: Payload, productId: number): Promise<number> {
  const { rows } = await drizzle(payload).execute(
    sql`SELECT count(DISTINCT address)::int AS n FROM (${eligible(productId)}) e`,
  )
  return (rows[0] as { n: number }).n
}

type Claim = { delivery: number; lead: number; address: string; locale: Locale | null }

/**
 * Claims the next address in SQL before sending, so no run sends to it twice: the newest eligible
 * lead of the address gives the language and the unsubscribe link. Eligibility is checked in the
 * same statement, right before the send. Null when nothing is left or another run won the race.
 */
async function claimNext(payload: Payload, emailId: number, productId: number) {
  const { rows } = await drizzle(payload).execute(sql`
    WITH next AS (
      SELECT DISTINCT ON (address) id, locale, address, hash FROM (${pending(emailId, productId)}) p
      ORDER BY address, created_at DESC, id DESC
      LIMIT 1
    ), claimed AS (
      INSERT INTO waitlist_deliveries (email_id, lead_id, address_hash, claimed_at)
      SELECT ${emailId}, id, hash, now() FROM next
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT claimed.id AS delivery, next.id AS lead, next.address, next.locale
    FROM claimed CROSS JOIN next
  `)
  return (rows[0] as Claim | undefined) ?? null
}

type Version = { subject: string; body: string }

/** The email's subject and body per language; a language counts only with both written. */
async function versions(payload: Payload, id: number) {
  // One at a time: run in parallel, these reads queue on one database client (pg warns).
  const docs: (WaitlistEmail | null)[] = []
  for (const locale of routing.locales)
    docs.push(
      await payload.findByID({
        collection: 'waitlist-emails',
        id,
        locale,
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      }),
    )
  return Object.fromEntries(
    routing.locales.map((locale, i) => {
      const doc = docs[i]
      const subject = doc?.subject?.trim()
      return [locale, subject && doc?.body?.trim() ? { subject, body: doc.body } : null]
    }),
  ) as Record<Locale, Version | null>
}

/** Hindi sign-ups get the Hindi version when it is written in full, else the English one. */
const versionFor = (all: Record<Locale, Version | null>, signedUpIn: Locale) => {
  const locale: Locale = all[signedUpIn] ? signedUpIn : 'en'
  return { locale, ...all[locale]! }
}

const productName = async (payload: Payload, id: number) =>
  (
    await payload.findByID({
      collection: 'products',
      id,
      select: { name: true },
      depth: 0,
      overrideAccess: true,
    })
  ).name

/**
 * The sendWaitlistEmail job: up to BATCH addresses per run, each claimed, sent and recorded in
 * SQL. A failed send releases its claim and fails the run, naming the lead (never the address,
 * as job errors are stored and logged); the retry carries on where it stopped. A claim whose send
 * never finished (the process died) is never retried: at most one email per address. When nothing
 * is left, the email is marked sent.
 */
export async function sendWaitlistEmail(id: number, batch = BATCH) {
  const payload = await getClient()
  const email = await payload.findByID({
    collection: 'waitlist-emails',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (email?.status !== 'sending') return
  const productId = productOf(email)
  const all = await versions(payload, id)
  if (!all.en) throw new Error('The waitlist email has no English version')
  const [name, replyTo] = await Promise.all([
    productName(payload, productId),
    inboxAddress(payload, 'hello'),
  ])
  for (let n = 0; n < batch; n++) {
    if (n) await sleep(GAP_MS)
    const claim = await claimNext(payload, id, productId)
    if (!claim) {
      const { rows } = await drizzle(payload).execute(
        sql`SELECT 1 FROM (${pending(id, productId)}) p LIMIT 1`,
      )
      if (rows.length) continue // another run claimed that address first
      await drizzle(payload).execute(sql`
        UPDATE waitlist_emails SET status = 'sent', sent_at = now(), updated_at = now()
        WHERE id = ${id} AND status = 'sending'
      `)
      return
    }
    try {
      const message = await waitlistEmail({
        ...versionFor(all, claim.locale ?? 'en'),
        productName: name,
        unsubscribeUrl: unsubscribeUrl(claim.lead),
      })
      await sendEmail(payload, claim.address, message, {
        replyTo,
        headers: unsubscribeHeaders(claim.lead),
      })
    } catch {
      await drizzle(payload).execute(
        sql`DELETE FROM waitlist_deliveries WHERE id = ${claim.delivery}`,
      )
      // The provider's own message may quote the address. With the lead's id, the Owner can mark
      // a lead the provider keeps refusing as spam (skipped) and resume the email.
      throw new Error(`Waitlist email ${id}: sending to lead ${claim.lead} failed`)
    }
    await drizzle(payload).execute(sql`
      WITH d AS (
        UPDATE waitlist_deliveries SET sent_at = now() WHERE id = ${claim.delivery}
        RETURNING email_id
      ), contacted AS (
        UPDATE leads SET last_activity_at = now() WHERE id = ${claim.lead}
      )
      UPDATE waitlist_emails SET sent = COALESCE(sent, 0) + 1
      FROM d WHERE waitlist_emails.id = d.email_id
    `)
  }
  await payload.jobs.queue({ task: 'sendWaitlistEmail', input: { id } })
}

const idParam = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) })
const sendBody = z.object({ test: z.boolean().optional() }).strict()

/** The waitlist email an Owner-only endpoint acts on (Payload checks no access on endpoints). */
async function ownersEmail(req: PayloadRequest) {
  if (!hasRole(req.user, 'owner')) {
    throw new APIError('Only the Owner can send waitlist emails.', 403)
  }
  const params = idParam.safeParse(req.routeParams)
  const email = params.success
    ? await req.payload.findByID({
        collection: 'waitlist-emails',
        id: params.data.id,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
    : null
  if (!email) throw new APIError('Waitlist email not found.', 404)
  return email
}

/** GET /api/waitlist-emails/:id/recipients (Owner): how many addresses it would reach now. */
export const recipientsHandler: PayloadHandler = async (req) => {
  const email = await ownersEmail(req)
  const count = await countRecipients(req.payload, productOf(email))
  return Response.json({ count }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Resumes an email left "sending" when its job ran out of retries: a fresh job carries on where
 * the claims stopped, so nobody gets it twice. Refused while a job for it is queued, running or
 * waiting to retry.
 */
async function resume(payload: Payload, id: number) {
  const { totalDocs } = await payload.count({
    collection: 'payload-jobs',
    where: {
      taskSlug: { equals: 'sendWaitlistEmail' },
      'input.id': { equals: id },
      completedAt: { exists: false },
      hasError: { not_equals: true },
    },
    overrideAccess: true,
  })
  if (totalDocs)
    throw new APIError('This email is still sending. Resume it only after its job has failed.', 409)
  await payload.jobs.queue({ task: 'sendWaitlistEmail', input: { id } })
  after(() => runQueuedJobs(payload))
  return Response.json({ ok: true, resumed: true })
}

/**
 * POST /api/waitlist-emails/:id/send (Owner), body {test?: boolean}. A test goes to the Owner
 * only, once per version (English and Hindi), and changes nothing. Otherwise the draft becomes
 * "sending" and the job is queued in one transaction, so a started email always has its job; an
 * email already "sending" is resumed.
 */
export const sendHandler: PayloadHandler = async (req) => {
  const email = await ownersEmail(req)
  await addDataAndFileToRequest(req)
  const body = sendBody.safeParse(req.data ?? {})
  if (!body.success) throw new APIError('Invalid request.', 400)
  const { payload } = req
  const all = await versions(payload, email.id)
  if (!all.en) throw new APIError('Write the English subject and message first.', 400)
  const productId = productOf(email)

  if (body.data.test) {
    const [name, replyTo] = await Promise.all([
      productName(payload, productId),
      inboxAddress(payload, 'hello'),
    ])
    for (const signedUpIn of routing.locales) {
      const version = versionFor(all, signedUpIn)
      const message = await waitlistEmail({
        ...version,
        productName: name,
        unsubscribeUrl: absoluteUrl(version.locale, '/legal/privacy'),
        test: { signedUpIn },
      })
      await sendEmail(payload, req.user!.email, message, { replyTo })
    }
    return Response.json({ ok: true, recipients: 1 })
  }

  if (email.status === 'sending') return resume(payload, email.id)
  if (email.status !== 'draft') throw new APIError('This email has already been sent.', 409)
  const recipients = await countRecipients(payload, productId)
  if (!recipients) throw new APIError('Nobody on this waitlist can receive it yet.', 400)
  await initTransaction(req)
  try {
    const tx = (payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]
      ?.db
    if (!tx) throw new Error('send waitlist email: no transaction')
    const { rows } = await tx.execute(sql`
      UPDATE waitlist_emails
      SET status = 'sending', recipients = ${recipients}, sent = 0, sent_by_id = ${req.user!.id},
          updated_at = now()
      WHERE id = ${email.id} AND status = 'draft'
      RETURNING id
    `)
    if (!rows.length) throw new APIError('This email has already been sent.', 409)
    await payload.jobs.queue({ task: 'sendWaitlistEmail', input: { id: email.id }, req })
    await commitTransaction(req)
  } catch (error) {
    await killTransaction(req)
    throw error
  }
  after(() => runQueuedJobs(payload))
  return Response.json({ ok: true, recipients })
}
