/**
 * Phase 9 "Email this waitlist" against a real database (spec §10, §13): who receives it, one
 * email per address in the lead's language, the unsubscribe link and headers, the job's claims
 * (idempotent, batched, retried after a failed send), the Owner's test send, and the rules for
 * drafts and roles. Endpoints go through the app's /api route handlers; emails are captured.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { REST_GET, REST_POST } from '@payloadcms/next/routes'
import { getPayload, type Payload, type SendEmailOptions } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { User, WaitlistEmail } from '@/payload-types'
import config from '@/payload.config'

const pending: Promise<unknown>[] = []
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => void pending.push(Promise.resolve().then(fn)),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const unsubscribeRoute = await import('@/app/api/v1/forms/unsubscribe/route')
const { sendWaitlistEmail } = await import('@/lib/waitlist')
const { sha256 } = await import('@/lib/rateLimit')
const { verifyUnsubscribeToken } = await import('@/lib/tokens')

let payload: Payload
const run = `wl${Date.now()}`
const address = (name: string) => `${name}.${run}@example.test`
const sent: SendEmailOptions[] = []
let failFor: string | null = null
const users: Record<'owner' | 'editor' | 'support', User> = {} as never
const tokens: Partial<Record<keyof typeof users, string>> = {}
const products: number[] = []
const db = () => (payload.db as unknown as PostgresAdapter).drizzle

/** Waits for after() work, including work that queues more after() work. */
const settled = async () => {
  while (pending.length) await Promise.all(pending.splice(0))
}

/** The app's /api/[...slug] route handlers, signed in with a role's token (or anonymous). */
async function api(path: string, role: keyof typeof users | null, body?: unknown) {
  const handler = body === undefined ? REST_GET : REST_POST
  const res = await handler(config)(
    new Request(`http://localhost:3000/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(role && { Authorization: `JWT ${tokens[role]}` }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: path.split('?')[0]!.split('/').filter(Boolean) }) },
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

/** Anonymous with role null. */
const send = (id: number, role: keyof typeof users | null = 'owner', body: object = {}) =>
  api(`/waitlist-emails/${id}/send`, role, body)

async function newProduct() {
  const product = await payload.create({
    collection: 'products',
    data: {
      name: `Waitlist ${products.length}`,
      slug: `${run}-${products.length}`,
      tagline: 'Tagline',
      type: 'desktop',
      category: 'other',
      status: 'coming-soon',
      hostingMode: 'external',
      externalUrl: 'https://app.example/',
      accentColor: '#123456',
      primaryButton: { type: 'visit' },
      hiStatus: 'missing',
      _status: 'published',
    },
  })
  products.push(product.id)
  return product.id
}

type LeadOptions = {
  locale?: 'en' | 'hi'
  consent?: boolean
  withdrawn?: boolean
  unsubscribed?: boolean
  status?: 'new' | 'spam'
  type?: 'waitlist' | 'newsletter'
}

const lead = (product: number, email: string, o: LeadOptions = {}) =>
  payload.create({
    collection: 'leads',
    data: {
      type: o.type ?? 'waitlist',
      status: o.status ?? 'new',
      product,
      email,
      locale: o.locale ?? 'en',
      marketingConsent: {
        given: o.consent ?? true,
        at: '2026-10-01T10:00:00.000Z',
        withdrawnAt: o.withdrawn ? '2026-10-05T10:00:00.000Z' : undefined,
      },
      unsubscribedAt: o.unsubscribed ? '2026-10-06T10:00:00.000Z' : undefined,
    },
  })

async function draft(product: number, hi?: { subject: string; body: string }) {
  const email = await payload.create({
    collection: 'waitlist-emails',
    locale: 'en',
    data: {
      product,
      status: 'draft',
      subject: `It's ready ${run}`,
      body: 'First paragraph,\nsame paragraph.\n\nSecond paragraph.',
    },
  })
  if (hi)
    await payload.update({ collection: 'waitlist-emails', id: email.id, locale: 'hi', data: hi })
  return email
}

const emailDoc = (id: number) =>
  payload.findByID({ collection: 'waitlist-emails', id, depth: 0 }) as Promise<WaitlistEmail>

const to = (email: string) => sent.filter((m) => m.to === email)
const headersOf = (m: SendEmailOptions | undefined) => (m?.headers ?? {}) as Record<string, string>

async function deliveries(emailId: number) {
  const { rows } = await db().execute(
    sql`SELECT lead_id, address_hash, sent_at FROM waitlist_deliveries WHERE email_id = ${emailId}`,
  )
  return rows as { lead_id: number; address_hash: string; sent_at: string | null }[]
}

beforeAll(async () => {
  payload = await getPayload({ config })
  vi.spyOn(payload, 'sendEmail').mockImplementation(async (message) => {
    const m = message as SendEmailOptions
    if (failFor && m.to === failFor) throw new Error('Mail API unavailable')
    sent.push(m)
  })
  process.env.EMAIL_REPLY_TO = 'team@example.test'
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes('api.telegram.org')) return Response.json({ ok: true })
    return realFetch(input, init)
  })
  // The owner first: the very first account always becomes the owner.
  for (const role of ['owner', 'editor', 'support'] as const) {
    const password = `pw-${run}-${role}`
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password, roles: [role] },
    })
    tokens[role] = (
      await payload.login({ collection: 'users', data: { email: users[role].email, password } })
    ).token
  }
})

beforeEach(async () => {
  await settled()
  sent.length = 0
  failFor = null
})

afterAll(async () => {
  await settled()
  vi.unstubAllGlobals()
  await db().execute(sql`
    DELETE FROM waitlist_deliveries WHERE email_id IN (
      SELECT id FROM waitlist_emails WHERE product_id = ANY(${`{${products.join(',')}}`}::int[]))
  `)
  await db().execute(
    sql`DELETE FROM waitlist_emails WHERE product_id = ANY(${`{${products.join(',')}}`}::int[])`,
  )
  await payload.delete({ collection: 'leads', where: { email: { like: run } } })
  await payload.delete({
    collection: 'payload-jobs',
    where: { taskSlug: { equals: 'sendWaitlistEmail' } },
  })
  for (const id of products) await payload.delete({ collection: 'products', id })
  for (const user of Object.values(users))
    await payload.delete({ collection: 'users', id: user.id })
})

describe('sending a waitlist email', () => {
  it('reaches consented waitlist leads once per address, in their language, with one-click unsubscribe', async () => {
    const product = await newProduct()
    const other = await newProduct()
    const ok = await lead(product, address('ok'))
    // One address, two sign-ups: one email, from the newer lead (Hindi).
    await lead(product, address('twice'), { locale: 'en' })
    const newer = await lead(product, address('twice'), { locale: 'hi' })
    await lead(product, address('withdrawn'), { withdrawn: true })
    await lead(product, address('unsubscribed'), { unsubscribed: true })
    await lead(product, address('spam'), { status: 'spam' })
    await lead(product, address('noconsent'), { consent: false })
    await lead(product, address('newsletter'), { type: 'newsletter' })
    await lead(other, address('other'))
    const email = await draft(product, { subject: `तैयार है ${run}`, body: 'हिंदी संदेश।' })
    const longAgo = '2024-01-01T00:00:00.000Z'
    await db().execute(sql`UPDATE leads SET last_activity_at = ${longAgo} WHERE id = ${ok.id}`)

    expect((await api(`/waitlist-emails/${email.id}/recipients`, 'owner')).body).toEqual({
      count: 2,
    })
    const res = await send(email.id)
    expect(res).toEqual({ status: 200, body: { ok: true, recipients: 2 } })
    await settled()
    // A waitlist email is a contact: retention counts from it.
    const contacted = await payload.findByID({ collection: 'leads', id: ok.id, depth: 0 })
    expect(contacted.lastActivityAt).not.toBe(longAgo)

    expect(sent.map((m) => m.to).sort()).toEqual([address('ok'), address('twice')])
    const [en] = to(address('ok'))
    expect(en?.subject).toBe(`It's ready ${run}`)
    expect(en?.replyTo).toBe('team@example.test')
    // Paragraphs on blank lines, line breaks kept, the reason and the unsubscribe link.
    expect(en?.html).toContain('First paragraph,<br/>same paragraph.')
    expect(en?.html).toContain('Second paragraph.')
    expect(en?.text).toMatch(/getting this because you joined the Waitlist \d+ waitlist\./)
    const headers = headersOf(en)
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    const url = headers['List-Unsubscribe']!.slice(1, -1)
    expect(en?.html).toContain(`href="${url}"`)
    expect(verifyUnsubscribeToken(new URL(url).searchParams.get('token')!)).toBe(ok.id)

    const [hi] = to(address('twice'))
    expect(hi?.subject).toBe(`तैयार है ${run}`)
    expect(hi?.html).toContain('lang="hi"')
    expect(hi?.text).toContain('हिंदी संदेश।')
    const hiUrl = headersOf(hi)['List-Unsubscribe']!.slice(1, -1)
    expect(verifyUnsubscribeToken(new URL(hiUrl).searchParams.get('token')!)).toBe(newer.id)

    const doc = await emailDoc(email.id)
    expect(doc).toMatchObject({ status: 'sent', recipients: 2, sent: 2, sentBy: users.owner.id })
    expect(doc.sentAt).toBeTruthy()
    // Stored under the address's sha256, never the address itself.
    const rows = await deliveries(email.id)
    expect(rows.map((r) => r.address_hash).sort()).toEqual(
      [sha256(address('ok')), sha256(address('twice'))].sort(),
    )
    expect(rows.every((r) => r.sent_at)).toBe(true)

    // Sent once: a second send is refused, and running the job again sends nothing, even when
    // the email is put back to "sending" (the deliveries, not the status, stop it).
    expect((await send(email.id)).status).toBe(409)
    await sendWaitlistEmail(email.id)
    await db().execute(sql`UPDATE waitlist_emails SET status = 'sending' WHERE id = ${email.id}`)
    await sendWaitlistEmail(email.id)
    expect(sent).toHaveLength(2)
    expect((await emailDoc(email.id)).status).toBe('sent')

    // Unsubscribing through the link stops later emails to that address.
    const out = await unsubscribeRoute.POST(
      new Request(url, { method: 'POST', body: 'List-Unsubscribe=One-Click' }),
    )
    expect(out.status).toBe(200)
    sent.length = 0
    const later = await draft(product)
    expect((await send(later.id)).body).toEqual({ ok: true, recipients: 1 })
    await settled()
    expect(sent.map((m) => m.to)).toEqual([address('twice')])
    // No complete Hindi version: the Hindi lead gets the English one.
    expect(sent[0]?.subject).toBe(`It's ready ${run}`)
    expect(sent[0]?.html).toContain('lang="en"')
  })

  it('falls back to English when the Hindi message is incomplete', async () => {
    const product = await newProduct()
    await lead(product, address('hindi'), { locale: 'hi' })
    const email = await draft(product, { subject: `केवल विषय ${run}`, body: '' })
    expect((await send(email.id)).status).toBe(200)
    await settled()
    expect(to(address('hindi'))[0]?.subject).toBe(`It's ready ${run}`)
  })

  it('continues a long list in a next job', async () => {
    const product = await newProduct()
    for (const name of ['a', 'b', 'c']) await lead(product, address(`batch-${name}`))
    const email = await draft(product)
    // As the send endpoint leaves it; the batch is 2 here instead of 100.
    await db().execute(
      sql`UPDATE waitlist_emails SET status = 'sending', recipients = 3 WHERE id = ${email.id}`,
    )
    await sendWaitlistEmail(email.id, 2)
    expect(sent).toHaveLength(2)
    expect((await emailDoc(email.id)).status).toBe('sending')
    const { docs: jobs } = await payload.find({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'sendWaitlistEmail' }, completedAt: { exists: false } },
      depth: 0,
    })
    expect(jobs.map((j) => j.input)).toEqual([{ id: email.id }])

    await payload.jobs.run({
      queue: 'default',
      silent: true,
      where: { id: { equals: jobs[0]!.id } },
    })
    expect(sent.map((m) => m.to).sort()).toEqual(['a', 'b', 'c'].map((n) => address(`batch-${n}`)))
    expect(await emailDoc(email.id)).toMatchObject({ status: 'sent', sent: 3 })
  })

  it('retries a failed send without emailing anyone twice', async () => {
    const product = await newProduct()
    const leads = []
    for (const name of ['a', 'b', 'c']) leads.push(await lead(product, address(`retry-${name}`)))
    const email = await draft(product)
    await db().execute(sql`UPDATE waitlist_emails SET status = 'sending' WHERE id = ${email.id}`)
    // Addresses go in order: the first is sent, the second fails and stops the run, naming the
    // lead (the error is stored and logged) and never the address.
    failFor = address('retry-b')
    const error = await sendWaitlistEmail(email.id).catch((e: unknown) => e as Error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(
      `Waitlist email ${email.id}: sending to lead ${leads[1]!.id} failed`,
    )
    expect(sent.map((m) => m.to)).toEqual([address('retry-a')])
    expect(await deliveries(email.id)).toHaveLength(1)

    failFor = null
    await sendWaitlistEmail(email.id)
    expect(sent.map((m) => m.to)).toEqual(['a', 'b', 'c'].map((n) => address(`retry-${n}`)))
    expect(await emailDoc(email.id)).toMatchObject({ status: 'sent', sent: 3 })
  })

  it('resumes an email whose job gave up, once that job has stopped', async () => {
    const product = await newProduct()
    for (const name of ['a', 'b', 'c']) await lead(product, address(`resume-${name}`))
    const email = await draft(product)
    failFor = address('resume-b')
    expect((await send(email.id)).status).toBe(200)
    await settled()
    expect(sent.map((m) => m.to)).toEqual([address('resume-a')])
    const jobs = async () =>
      (
        await payload.find({
          collection: 'payload-jobs',
          where: { taskSlug: { equals: 'sendWaitlistEmail' }, 'input.id': { equals: email.id } },
          sort: 'createdAt',
          depth: 0,
          overrideAccess: true,
        })
      ).docs
    const [job] = await jobs()
    expect(job?.log?.[0]?.error).toMatchObject({ message: expect.stringContaining('to lead ') })
    expect(JSON.stringify(job)).not.toContain('@example.test')

    // Waiting to retry: resuming would only start a second job, so it is refused.
    expect(await send(email.id)).toMatchObject({ status: 409 })
    // Its retries run out (as Payload leaves a job after the last one).
    await payload.update({
      collection: 'payload-jobs',
      id: job!.id,
      data: { hasError: true, processing: false },
      depth: 0,
      overrideAccess: true,
    })
    failFor = null
    expect(await send(email.id)).toEqual({ status: 200, body: { ok: true, resumed: true } })
    await settled()
    expect(sent.map((m) => m.to)).toEqual(['a', 'b', 'c'].map((n) => address(`resume-${n}`)))
    expect(await emailDoc(email.id)).toMatchObject({ status: 'sent', sent: 3 })
    expect(await send(email.id)).toMatchObject({ status: 409 })
  })

  it('erases a deleted lead’s deliveries with its last lead of the address', async () => {
    const product = await newProduct()
    const gone = await lead(product, address('erased'))
    const older = await lead(product, address('shared'))
    const newer = await lead(product, address('shared'))
    await lead(product, address('stays'))
    const email = await draft(product)
    expect((await send(email.id)).status).toBe(200)
    await settled()
    const hashes = async () => (await deliveries(email.id)).map((r) => r.address_hash).sort()
    expect(await hashes()).toHaveLength(3)

    await payload.delete({ collection: 'leads', id: gone.id, depth: 0, overrideAccess: true })
    expect(await hashes()).toEqual([sha256(address('shared')), sha256(address('stays'))].sort())
    // Another lead still has the address: its row stays, so a running send can't email it again.
    await payload.delete({ collection: 'leads', id: newer.id, depth: 0, overrideAccess: true })
    expect(await hashes()).toEqual([sha256(address('shared')), sha256(address('stays'))].sort())
    await payload.delete({ collection: 'leads', id: older.id, depth: 0, overrideAccess: true })
    expect(await hashes()).toEqual([sha256(address('stays'))])
  })

  it('erases an address’s deliveries when all its leads go in one bulk delete', async () => {
    const product = await newProduct()
    const first = await lead(product, address('bulk'))
    const second = await lead(product, address('bulk'))
    await lead(product, address('bulkstays'))
    const email = await draft(product)
    expect((await send(email.id)).status).toBe(200)
    await settled()
    const hashes = async () => (await deliveries(email.id)).map((r) => r.address_hash).sort()
    expect(await hashes()).toHaveLength(2)

    const { docs, errors } = await payload.delete({
      collection: 'leads',
      where: { id: { in: [first.id, second.id] } },
      depth: 0,
      overrideAccess: true,
    })
    expect([docs.length, errors.length]).toEqual([2, 0])
    expect(await hashes()).toEqual([sha256(address('bulkstays'))])
  })
})

describe('the Owner’s controls', () => {
  it('sends a test of both versions to the Owner only and changes nothing', async () => {
    const product = await newProduct()
    await lead(product, address('test-lead'))
    const email = await draft(product, { subject: `परीक्षण ${run}`, body: 'नमस्ते।' })
    expect(await send(email.id, 'owner', { test: true })).toEqual({
      status: 200,
      body: { ok: true, recipients: 1 },
    })
    await settled()
    expect(sent.map((m) => m.to)).toEqual([users.owner.email, users.owner.email])
    expect(sent.map((m) => m.subject)).toEqual([
      `[Test] It's ready ${run}`,
      `[Test] परीक्षण ${run}`,
    ])
    expect(sent.every((m) => !headersOf(m)['List-Unsubscribe'])).toBe(true)
    expect(sent[0]?.html).toContain('/legal/privacy"')
    expect(sent[1]?.html).toContain('/hi/legal/privacy"')
    expect(sent[0]?.text).toContain('Test email')
    expect(await emailDoc(email.id)).toMatchObject({ status: 'draft', sent: 0 })
    expect(await deliveries(email.id)).toHaveLength(0)
  })

  it('refuses a waitlist nobody can receive and a malformed request', async () => {
    const product = await newProduct()
    await lead(product, address('nobody'), { consent: false })
    const email = await draft(product)
    expect(await send(email.id)).toMatchObject({ status: 400 })
    expect(await send(email.id, 'owner', { test: 'yes' })).toMatchObject({ status: 400 })
    expect((await emailDoc(email.id)).status).toBe('draft')
    expect((await api('/waitlist-emails/999999999/recipients', 'owner')).status).toBe(404)
  })

  it('keeps sent emails as they were sent; drafts can be changed and deleted', async () => {
    const product = await newProduct()
    await lead(product, address('locked'))
    const email = await draft(product)
    const owner = { user: { ...users.owner, collection: 'users' as const }, overrideAccess: false }
    await payload.update({
      collection: 'waitlist-emails',
      id: email.id,
      data: { subject: 'Edited' },
      ...owner,
    })
    expect((await send(email.id)).status).toBe(200)
    await settled()

    await expect(
      payload.update({
        collection: 'waitlist-emails',
        id: email.id,
        data: { subject: 'Late' },
        ...owner,
      }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      payload.delete({ collection: 'waitlist-emails', id: email.id, ...owner }),
    ).rejects.toMatchObject({ status: 409 })
    expect((await emailDoc(email.id)).subject).toBe('Edited')

    const spare = await draft(product)
    await payload.delete({ collection: 'waitlist-emails', id: spare.id, ...owner })
    expect(
      await payload.count({ collection: 'waitlist-emails', where: { id: { equals: spare.id } } }),
    ).toEqual({ totalDocs: 0 })
  })

  it('is the Owner’s alone', async () => {
    const product = await newProduct()
    await lead(product, address('roles'))
    const email = await draft(product)
    for (const role of ['support', 'editor', null] as const) {
      const label = role ?? 'anonymous'
      expect((await send(email.id, role)).status, label).toBe(403)
      expect((await send(email.id, role, { test: true })).status, label).toBe(403)
      expect((await api(`/waitlist-emails/${email.id}/recipients`, role)).status, label).toBe(403)
    }
    await settled()
    expect(sent).toHaveLength(0)
    expect((await emailDoc(email.id)).status).toBe('draft')
  })
})
