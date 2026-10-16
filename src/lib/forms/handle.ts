import 'server-only'

import { randomUUID } from 'node:crypto'

import { after } from 'next/server'
import type { Payload, RequiredDataFromCollectionSlug, Where } from 'payload'
import type { z } from 'zod'

import {
  autoReplyEmail,
  newsletterConfirmEmail,
  notificationEmail,
  type AutoReplyKind,
} from '@/emails'
import { routing, type Locale } from '@/i18n/routing'
import { getClient } from '@/lib/cms'
import { inboxAddress, sendEmail, sendTelegram, settle, type Inbox } from '@/lib/notify'
import { clientIp, hashIp, limit, sha256 } from '@/lib/rateLimit'
import { localizedPath, SITE_URL } from '@/lib/seo'
import {
  randomToken,
  unsubscribeHeaders,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from '@/lib/tokens'
import { verifyTurnstile } from '@/lib/turnstile'

import {
  CONSENT_VERSION,
  CV_MAX_BYTES,
  formSchemas,
  MARKETING_VERSION,
  metaSchema,
  type CONTACT_TOPICS,
  type FormMeta,
  type FormName,
} from './schemas'

/** Newsletter confirmation links work this long (the email says so). */
const CONFIRM_DAYS = 7

const TOPIC_INBOX: Record<(typeof CONTACT_TOPICS)[number], Inbox> = {
  sales: 'sales',
  support: 'support',
  partnership: 'sales',
  careers: 'careers',
  press: 'hello',
  other: 'hello',
}

type Ctx = { payload: Payload; meta: FormMeta; ipHash: string; now: string; cv: Buffer | null }

/** What a saved submission still needs: alerts for staff and emails for the visitor. */
type Outcome = {
  collection: 'leads' | 'data-requests'
  id: number
  staff?: { inbox: Inbox; title: string; telegram: string; fields: [string, string][] }
  autoReply?: { kind: AutoReplyKind; product?: string | null; notify?: boolean }
  /** Newsletter: the raw confirmation token (only its hash is stored). */
  confirm?: string
}

class InvalidForm extends Error {}

const json = (status: number, body: object, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

const optional = (value: string) => value || undefined

/** What may be logged about a failure: a database error's message lists every bound value. */
const errorCode = (error: unknown) => {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code
  return typeof code === 'string' ? code : error instanceof Error ? error.name : 'unknown'
}

const marketingConsent = (given: boolean, now: string) =>
  given ? { given: true, at: now, textVersion: MARKETING_VERSION } : { given: false }

/** The visitor's typed fields, for the internal notification only (never the auto-reply). */
const rows = (entries: [string, string | null | undefined][]): [string, string][] =>
  entries.filter((entry): entry is [string, string] => Boolean(entry[1]))

type LeadData = Omit<
  RequiredDataFromCollectionSlug<'leads'>,
  'status' | 'locale' | 'source' | 'consent'
>

async function createLead(ctx: Ctx, data: LeadData) {
  const lead = await ctx.payload.create({
    collection: 'leads',
    data: {
      ...data,
      status: 'new',
      locale: ctx.meta.locale,
      source: {
        page: optional(ctx.meta.page),
        referrer: optional(ctx.meta.referrer),
        utm: ctx.meta.utm,
      },
      consent: { textVersion: CONSENT_VERSION, givenAt: ctx.now, ipHash: ctx.ipHash },
    },
    overrideAccess: true,
    depth: 0,
  })
  return lead.id
}

/** A published product (the visitor-facing read) by slug. */
async function findProduct(payload: Payload, slug: string) {
  if (!slug) return null
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    select: { name: true },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  return docs[0] ?? null
}

const exists = async (payload: Payload, where: Where) =>
  (await payload.count({ collection: 'leads', where, overrideAccess: true })).totalDocs > 0

type Values<F extends FormName> = z.infer<(typeof formSchemas)[F]>

const save: { [F in FormName]: (values: Values<F>, ctx: Ctx) => Promise<Outcome | null> } = {
  async contact(v, ctx) {
    const product = await findProduct(ctx.payload, v.product)
    const id = await createLead(ctx, {
      type: v.topic === 'partnership' ? 'partnership' : 'contact',
      product: product?.id,
      name: v.name,
      email: v.email,
      phone: optional(v.phone),
      company: optional(v.company),
      message: v.message,
      details: { topic: v.topic },
      marketingConsent: marketingConsent(v.marketing, ctx.now),
    })
    return {
      collection: 'leads',
      id,
      staff: {
        inbox: TOPIC_INBOX[v.topic],
        title: `Contact: ${v.topic}`,
        telegram: `New contact message (${v.topic})${product ? ` about ${product.name}` : ''}`,
        fields: rows([
          ['Topic', v.topic],
          ['Product', product?.name],
          ['Name', v.name],
          ['Email', v.email],
          ['Phone', v.phone],
          ['Company', v.company],
          ['Message', v.message],
          ['Marketing emails', v.marketing ? 'yes' : 'no'],
          ['Language', ctx.meta.locale],
          ['Page', ctx.meta.page],
        ]),
      },
      autoReply: { kind: 'contact' },
    }
  },

  async project(v, ctx) {
    const id = await createLead(ctx, {
      type: 'project',
      name: v.name,
      email: v.email,
      phone: optional(v.phone),
      company: optional(v.company),
      message: v.description,
      details: { service: v.service, budget: v.budget, timeline: v.timeline },
      marketingConsent: marketingConsent(v.marketing, ctx.now),
    })
    return {
      collection: 'leads',
      id,
      staff: {
        inbox: 'sales',
        title: 'Project brief',
        telegram: `New project brief (${v.service}, ${v.budget})`,
        fields: rows([
          ['Service', v.service],
          ['Budget', v.budget],
          ['Timeline', v.timeline],
          ['Name', v.name],
          ['Email', v.email],
          ['Phone', v.phone],
          ['Company', v.company],
          ['Project', v.description],
          ['Marketing emails', v.marketing ? 'yes' : 'no'],
          ['Language', ctx.meta.locale],
          ['Page', ctx.meta.page],
        ]),
      },
      autoReply: { kind: 'project' },
    }
  },

  async waitlist(v, ctx) {
    const product = await findProduct(ctx.payload, v.product)
    if (!product) throw new InvalidForm()
    // Already waiting: say yes again without a second lead or a second email, but keep a newly
    // ticked box (the launch email needs it).
    const waiting: Where[] = [
      { type: { equals: 'waitlist' } },
      { product: { equals: product.id } },
      { email: { equals: v.email } },
      { unsubscribedAt: { exists: false } },
    ]
    if (await exists(ctx.payload, { and: waiting })) {
      if (v.marketing) {
        await ctx.payload.update({
          collection: 'leads',
          where: {
            and: [
              ...waiting,
              {
                or: [
                  { 'marketingConsent.given': { not_equals: true } },
                  { 'marketingConsent.withdrawnAt': { exists: true } },
                ],
              },
            ],
          },
          data: { marketingConsent: { ...marketingConsent(true, ctx.now), withdrawnAt: null } },
          overrideAccess: true,
          depth: 0,
        })
      }
      return null
    }
    const id = await createLead(ctx, {
      type: 'waitlist',
      product: product.id,
      email: v.email,
      marketingConsent: marketingConsent(v.marketing, ctx.now),
    })
    return {
      collection: 'leads',
      id,
      staff: {
        inbox: 'sales',
        title: `Waitlist: ${product.name}`,
        telegram: `New waitlist sign-up for ${product.name}`,
        fields: rows([
          ['Product', product.name],
          ['Email', v.email],
          ['Marketing emails', v.marketing ? 'yes' : 'no'],
          ['Language', ctx.meta.locale],
          ['Page', ctx.meta.page],
        ]),
      },
      autoReply: { kind: 'waitlist', product: product.name, notify: v.marketing },
    }
  },

  // Subscribing is the marketing consent; it counts once confirmed (double opt-in, spec §13).
  async newsletter(v, ctx) {
    const subscribed = await exists(ctx.payload, {
      and: [
        { type: { equals: 'newsletter' } },
        { email: { equals: v.email } },
        { confirmedAt: { exists: true } },
        { unsubscribedAt: { exists: false } },
        { 'marketingConsent.withdrawnAt': { exists: false } },
      ],
    })
    if (subscribed) return null
    const token = randomToken()
    const id = await createLead(ctx, {
      type: 'newsletter',
      email: v.email,
      marketingConsent: marketingConsent(true, ctx.now),
      confirmTokenHash: sha256(token),
    })
    return { collection: 'leads', id, confirm: token }
  },

  async careers(v, ctx) {
    if (!ctx.cv) throw new InvalidForm()
    // A random name: the visitor's own file name often holds their full name.
    const file = await ctx.payload.create({
      collection: 'private-files',
      data: { purpose: 'cv' },
      file: {
        data: ctx.cv,
        mimetype: 'application/pdf',
        name: `cv-${randomUUID()}.pdf`,
        size: ctx.cv.length,
      },
      overrideAccess: true,
      depth: 0,
    })
    let id: number
    try {
      id = await createLead(ctx, {
        type: 'careers',
        name: v.name,
        email: v.email,
        phone: optional(v.phone),
        message: optional(v.message),
        details: { job: v.job || null, links: v.links || null },
        attachments: [file.id],
      })
    } catch (error) {
      await ctx.payload.delete({
        collection: 'private-files',
        id: file.id,
        overrideAccess: true,
        depth: 0,
      })
      throw error
    }
    // A convenience link for the admin (deleting the lead finds the CV through `attachments`):
    // the application is saved, so a failure here must not fail it.
    await ctx.payload
      .update({
        collection: 'private-files',
        id: file.id,
        data: { owner: { relationTo: 'leads', value: id } },
        overrideAccess: true,
        depth: 0,
      })
      .catch((error) => console.error('forms/careers: CV owner not set:', errorCode(error)))
    return {
      collection: 'leads',
      id,
      staff: {
        inbox: 'careers',
        title: v.job ? `Application: ${v.job}` : 'Introduction (careers)',
        telegram: v.job ? `New job application (${v.job})` : 'New careers introduction',
        fields: rows([
          ['Role', v.job || 'Introduce yourself'],
          ['Name', v.name],
          ['Email', v.email],
          ['Phone', v.phone],
          ['Links', v.links],
          ['Message', v.message],
          ['CV', 'Attached to the lead in the admin'],
          ['Language', ctx.meta.locale],
        ]),
      },
      autoReply: { kind: 'careers' },
    }
  },

  async 'data-request'(v, ctx) {
    const doc = await ctx.payload.create({
      collection: 'data-requests',
      data: { email: v.email, type: v.type, details: v.details, status: 'new' },
      overrideAccess: true,
      depth: 0,
    })
    return {
      collection: 'data-requests',
      id: doc.id,
      staff: {
        inbox: 'privacy',
        title: `Privacy request: ${v.type}`,
        telegram: `New privacy request (${v.type})`,
        fields: rows([
          ['Request', v.type],
          ['Email', v.email],
          ['Details', v.details],
          ['Language', ctx.meta.locale],
        ]),
      },
      autoReply: { kind: 'data-request' },
    }
  },
}

/**
 * A PDF by its bytes (the browser's type and the file name prove nothing): the same header and
 * trailer check Payload's upload validation runs, so a file passing here is never refused there.
 */
async function readPdf(file: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!(file instanceof File) || file.size === 0 || file.size > CV_MAX_BYTES) return null
  const bytes = Buffer.from(await file.arrayBuffer())
  const end = bytes.subarray(-1024).toString('latin1')
  const pdf =
    bytes.subarray(0, 5).toString('latin1') === '%PDF-' &&
    end.includes('%%EOF') &&
    end.includes('xref')
  return pdf ? bytes : null
}

const parseJson = (value: FormDataEntryValue | null | undefined): unknown => {
  if (typeof value !== 'string') return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * The forms pipeline (spec §13): validate → Turnstile → rate limits (IP and email) → honeypot →
 * save with the consent record → staff alerts and the visitor's localized email, sent after the
 * response so a slow mail or Telegram API never delays it or loses the lead.
 */
export async function handleForm(form: FormName, req: Request): Promise<Response> {
  // CV plus fields; anything bigger is not one of our forms. Counted as it is read too: a
  // chunked request has no Content-Length to check.
  const max = CV_MAX_BYTES + 512 * 1024
  if (Number(req.headers.get('content-length')) > max) return json(413, { error: 'invalid' })
  let read = 0
  const capped = req.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        read += chunk.byteLength
        if (read > max) controller.error(new Error('Body too large'))
        else controller.enqueue(chunk)
      },
    }),
  )
  const body = await new Response(capped ?? null, {
    headers: { 'content-type': req.headers.get('content-type') ?? '' },
  })
    .formData()
    .catch(() => null)
  if (read > max) return json(413, { error: 'invalid' })

  const parsed = formSchemas[form].safeParse(parseJson(body?.get('data')))
  const meta = metaSchema.safeParse(parseJson(body?.get('meta'))).data ?? metaSchema.parse({})
  const cv = form === 'careers' ? await readPdf(body?.get('cv') ?? null) : null
  if (!parsed.success) return json(400, { error: 'invalid' })
  // The browser only checked the file's name; say which field to fix.
  if (form === 'careers' && !cv) return json(400, { error: 'invalid', field: 'cv' })
  const values = { ...parsed.data, email: parsed.data.email.toLowerCase() }

  const ip = clientIp(req.headers)
  if (!(await verifyTurnstile(meta.turnstile, ip))) return json(400, { error: 'verification' })

  const wait = Math.max(await limit('formIp', ip), await limit('formEmail', values.email))
  if (wait) return json(429, { error: 'rateLimited' }, { 'Retry-After': String(wait) })

  // A bot filled the hidden field: look successful, keep nothing.
  if (meta.website) return json(200, { ok: true })

  const payload = await getClient()
  const ctx: Ctx = { payload, meta, ipHash: hashIp(ip), now: new Date().toISOString(), cv }
  let outcome: Outcome | null
  try {
    // `save[form]` and `values` match per form; TypeScript can't correlate the two unions.
    outcome = await (save[form] as (v: typeof values, c: Ctx) => Promise<Outcome | null>)(
      values,
      ctx,
    )
  } catch (error) {
    if (error instanceof InvalidForm) return json(400, { error: 'invalid' })
    console.error(`forms/${form}: save failed:`, errorCode(error))
    return json(500, { error: 'server' })
  }
  if (outcome) {
    const done = outcome
    after(() => notify(payload, done, values.email, meta.locale))
  }
  return json(200, { ok: true })
}

async function notify(payload: Payload, outcome: Outcome, email: string, locale: Locale) {
  const adminUrl = `${SITE_URL}/admin/collections/${outcome.collection}/${outcome.id}`
  const { staff, autoReply, confirm } = outcome
  const tasks: Promise<unknown>[] = []
  if (staff) {
    tasks.push(sendTelegram(`${staff.telegram}\n${adminUrl}`))
    tasks.push(
      (async () => {
        const to = await inboxAddress(payload, staff.inbox)
        if (!to) return console.warn(`No ${staff.inbox} inbox in site settings: alert not emailed.`)
        const message = await notificationEmail({
          title: staff.title,
          adminUrl,
          fields: staff.fields,
        })
        await sendEmail(payload, to, message, { replyTo: email })
      })(),
    )
  }
  if (autoReply) {
    tasks.push(
      (async () => {
        const replyTo = await inboxAddress(payload, staff?.inbox ?? 'hello')
        await sendEmail(payload, email, await autoReplyEmail({ locale, ...autoReply }), { replyTo })
      })(),
    )
  }
  if (confirm) {
    tasks.push(
      (async () => {
        const message = await newsletterConfirmEmail({
          locale,
          confirmUrl: `${SITE_URL}/api/v1/forms/newsletter/confirm?token=${confirm}`,
          unsubscribeUrl: unsubscribeUrl(outcome.id),
        })
        await sendEmail(payload, email, message, { headers: unsubscribeHeaders(outcome.id) })
      })(),
    )
  }
  await settle(`${outcome.collection} ${outcome.id}`, tasks)
}

const statusPage = (
  locale: string | null | undefined,
  status: 'confirmed' | 'invalid' | 'unsubscribed' | 'unsubscribeFailed',
) => {
  const known = routing.locales.find((l) => l === locale) ?? routing.defaultLocale
  return Response.redirect(new URL(localizedPath(known, `/newsletter/${status}`), SITE_URL), 303)
}

/** GET /api/v1/forms/newsletter/confirm?token=… (spec §13 double opt-in). */
export async function confirmNewsletter(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!/^[\w-]{43}$/.test(token)) return statusPage(null, 'invalid')
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'leads',
    where: {
      and: [{ type: { equals: 'newsletter' } }, { confirmTokenHash: { equals: sha256(token) } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const lead = docs[0]
  if (!lead) return statusPage(null, 'invalid')
  if (Date.now() - Date.parse(lead.createdAt) > CONFIRM_DAYS * 86_400_000) {
    return statusPage(lead.locale, 'invalid')
  }
  // Single use: the hash goes with the confirmation.
  await payload.update({
    collection: 'leads',
    id: lead.id,
    data: { confirmedAt: new Date().toISOString(), confirmTokenHash: null },
    overrideAccess: true,
    depth: 0,
  })
  return statusPage(lead.locale, 'confirmed')
}

/**
 * GET (the link in an email) or POST (one-click, RFC 8058) /api/v1/forms/unsubscribe?token=….
 * Unsubscribing stops all marketing to that address, not just the one sign-up the link came
 * from: withdrawing must be as easy as giving (spec §16).
 */
export async function unsubscribe(req: Request): Promise<Response> {
  const id = verifyUnsubscribeToken(new URL(req.url).searchParams.get('token') ?? '')
  const payload = await getClient()
  const lead = id
    ? await payload
        .findByID({ collection: 'leads', id, depth: 0, overrideAccess: true })
        .catch(() => null)
    : null
  if (!lead) {
    return req.method === 'POST'
      ? json(400, { error: 'invalid' })
      : statusPage(null, 'unsubscribeFailed')
  }
  try {
    await payload.update({
      collection: 'leads',
      where: { and: [{ email: { equals: lead.email } }, { unsubscribedAt: { exists: false } }] },
      data: { unsubscribedAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
  } catch (error) {
    console.error('forms/unsubscribe: failed:', errorCode(error))
    return req.method === 'POST'
      ? json(500, { error: 'server' })
      : statusPage(lead.locale, 'unsubscribeFailed')
  }
  return req.method === 'POST' ? json(200, { ok: true }) : statusPage(lead.locale, 'unsubscribed')
}
