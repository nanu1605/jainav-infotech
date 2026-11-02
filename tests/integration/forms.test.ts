/**
 * Phase 4 forms pipeline against a real database (spec §13): validation, Turnstile, rate limits,
 * honeypot, leads with consent records, CV uploads, notifications, newsletter double opt-in and
 * unsubscribe. Turnstile and Telegram are stubbed; emails are captured from payload.sendEmail.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Payload, type SendEmailOptions } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { inboxKey, ipKey } from '@/lib/rateLimit'
import config from '@/payload.config'

const pending: Promise<unknown>[] = []
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => void pending.push(Promise.resolve().then(fn)),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const { POST: submit } = await import('@/app/api/v1/forms/[form]/route')
const { GET: confirm } = await import('@/app/api/v1/forms/newsletter/confirm/route')
const unsubscribeRoute = await import('@/app/api/v1/forms/unsubscribe/route')

let payload: Payload
const run = `fm${Date.now()}`
const address = (name: string) => `${name}.${run}@example.test`
let ipCounter = 0
const nextIp = () => `198.51.100.${++ipCounter}`
const sent: SendEmailOptions[] = []
const telegrams: string[] = []
let productId: number

/** Waits for after() work (notifications) from the requests so far. */
const settled = async () => {
  await Promise.all(pending.splice(0))
}

function post(
  form: string,
  data: object,
  opts: { ip?: string; meta?: object; cv?: Buffer<ArrayBuffer> | null; cvType?: string } = {},
) {
  const body = new FormData()
  body.set('data', JSON.stringify(data))
  body.set(
    'meta',
    JSON.stringify({ locale: 'en', page: '/contact', turnstile: 'ok', website: '', ...opts.meta }),
  )
  if (opts.cv)
    body.set(
      'cv',
      new File([opts.cv], 'Priya Sharma CV.pdf', { type: opts.cvType ?? 'application/pdf' }),
    )
  const req = new Request(`http://localhost:3000/api/v1/forms/${form}`, {
    method: 'POST',
    body,
    headers: { 'cf-connecting-ip': opts.ip ?? nextIp() },
  })
  return submit(req, { params: Promise.resolve({ form }) })
}

const leadsFor = async (email: string) =>
  (
    await payload.find({
      collection: 'leads',
      where: { email: { equals: email } },
      sort: 'createdAt',
      depth: 0,
      overrideAccess: true,
    })
  ).docs

const contact = (email: string, extra: object = {}) => ({
  topic: 'sales',
  name: 'Priya',
  email,
  phone: '',
  company: '',
  product: '',
  message: 'We need a booking system for our clinic.',
  marketing: false,
  ...extra,
})

// Payload's upload validation also wants the trailer.
const pdf = Buffer.from(`%PDF-1.4\n${' '.repeat(2000)}\nxref\n0 1\ntrailer\nstartxref\n9\n%%EOF\n`)

beforeAll(async () => {
  payload = await getPayload({ config })
  vi.spyOn(payload, 'sendEmail').mockImplementation(async (message) => {
    sent.push(message as SendEmailOptions)
  })
  // The fallback inbox while site settings has no company emails (spec §21 placeholders).
  process.env.EMAIL_REPLY_TO = 'team@example.test'
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.TELEGRAM_CHAT_ID = '42'
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes('turnstile')) {
      const token = (init?.body as URLSearchParams).get('response')
      return Response.json({ success: token === 'ok' })
    }
    if (url.includes('api.telegram.org')) {
      telegrams.push(JSON.parse(String(init?.body)).text)
      return Response.json({ ok: true })
    }
    return realFetch(input, init)
  })
  // Limits persist between runs: start from a clean window.
  await (payload.db as unknown as PostgresAdapter).drizzle
    .execute(sql`DELETE FROM rate_limit.hits`)
    .catch(() => undefined)
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Forms test',
      slug: `${run}-app`,
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
  productId = product.id
})

beforeEach(async () => {
  await settled()
  sent.length = 0
  telegrams.length = 0
})

afterAll(async () => {
  await settled()
  vi.unstubAllGlobals()
  const leads = await payload.find({
    collection: 'leads',
    where: { email: { like: run } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const lead of leads.docs) {
    await payload.delete({ collection: 'leads', id: lead.id, overrideAccess: true })
  }
  await payload.delete({
    collection: 'data-requests',
    where: { email: { like: run } },
    overrideAccess: true,
  })
  await payload.delete({ collection: 'products', id: productId, overrideAccess: true })
})

describe('contact form', () => {
  it('saves a lead with its consent record and sends the alerts and a localized auto-reply', async () => {
    const email = address('contact')
    const res = await post('contact', contact(email.toUpperCase(), { topic: 'support' }), {
      ip: '203.0.113.7',
      meta: { locale: 'hi', page: '/hi/contact', utm: { source: 'newsletter' } },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    await settled()

    const [lead] = await leadsFor(email)
    expect(lead).toMatchObject({
      type: 'contact',
      status: 'new',
      locale: 'hi',
      details: { topic: 'support' },
      source: { page: '/hi/contact', utm: { source: 'newsletter' } },
      marketingConsent: { given: false },
    })
    expect(lead!.consent?.textVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(lead!.consent?.givenAt).toBeTruthy()
    // Hashed, never the IP itself.
    expect(lead!.consent?.ipHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(lead)).not.toContain('203.0.113.7')

    const autoReply = sent.find((m) => m.to === email)
    expect(autoReply?.subject).toBeTruthy()
    // The visitor's text is never echoed to the address they typed in.
    expect(`${autoReply?.html}${autoReply?.text}`).not.toContain('booking system')
    const alert = sent.find((m) => m.to !== email)
    expect(alert?.replyTo).toBe(email)
    expect(alert?.text).toContain('booking system')

    expect(telegrams).toHaveLength(1)
    expect(telegrams[0]).toContain(`/admin/collections/leads/${lead!.id}`)
    expect(telegrams[0]).not.toContain(email)
    expect(telegrams[0]).not.toContain('Priya')
  })

  it('records partnership requests as their own type and marketing consent when given', async () => {
    const email = address('partner')
    expect(
      (await post('contact', contact(email, { topic: 'partnership', marketing: true }))).status,
    ).toBe(200)
    const [lead] = await leadsFor(email)
    expect(lead?.type).toBe('partnership')
    expect(lead?.marketingConsent).toMatchObject({ given: true })
    expect(lead?.marketingConsent?.textVersion).toBeTruthy()
  })

  it('rejects invalid fields, failed spam checks and unknown forms', async () => {
    const email = address('invalid')
    expect((await post('contact', contact(email, { message: '' }))).status).toBe(400)
    const failed = await post('contact', contact(email), { meta: { turnstile: 'bad' } })
    expect(failed.status).toBe(400)
    expect(await failed.json()).toEqual({ error: 'verification' })
    expect((await post('nope', {})).status).toBe(404)
    // z.email allows a label ending in "-"; Payload's email field doesn't, so neither do we.
    expect((await post('contact', contact(`${run}@gmail-.com`))).status).toBe(400)
    expect(await leadsFor(email)).toHaveLength(0)
  })

  it('strips NUL characters, which Postgres refuses, instead of failing the save', async () => {
    const email = address('nul')
    const res = await post('contact', contact(email, { message: 'hello\u0000 world' }))
    expect(res.status).toBe(200)
    expect((await leadsFor(email))[0]?.message).toBe('hello world')
  })

  it('caps the body as it is read, with or without a Content-Length', async () => {
    const chunk = new Uint8Array(64 * 1024)
    let left = 100 // 6.4 MB, more than a CV plus fields
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (left-- > 0) controller.enqueue(chunk)
        else controller.close()
      },
    })
    const req = new Request('http://localhost:3000/api/v1/forms/contact', {
      method: 'POST',
      body,
      // @ts-expect-error -- Node needs this for a streamed body; the DOM types don't know it.
      duplex: 'half',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'cf-connecting-ip': nextIp() },
    })
    expect(req.headers.get('content-length')).toBeNull()
    expect((await submit(req, { params: Promise.resolve({ form: 'contact' }) })).status).toBe(413)
  })

  it('answers a filled honeypot like a success but keeps and sends nothing', async () => {
    const email = address('bot')
    const res = await post('contact', contact(email), { meta: { website: 'https://spam.example' } })
    expect(res.status).toBe(200)
    await settled()
    expect(await leadsFor(email)).toHaveLength(0)
    expect(sent).toHaveLength(0)
  })
})

describe('rate limits', () => {
  it('limits submissions per IP', async () => {
    const ip = '192.0.2.10'
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      statuses.push((await post('contact', contact(address(`ip${i}`)), { ip })).status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    const blocked = await post('contact', contact(address('ip-last')), { ip })
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(await blocked.json()).toEqual({ error: 'rateLimited' })
  })

  it('limits submissions naming one email address, from any IP', async () => {
    const email = address('flood')
    for (let i = 0; i < 5; i++) expect((await post('contact', contact(email))).status).toBe(200)
    expect((await post('contact', contact(email))).status).toBe(429)
  })

  it('counts one inbox across +tags and one IPv6 client across its /64', async () => {
    expect(inboxKey('V.I.C+x@googlemail.com')).toBe('vic@gmail.com')
    expect(inboxKey('a.b+news@outlook.com')).toBe('a.b@outlook.com')
    expect(ipKey('2405:201:abcd:12::1')).toBe('2405:201:abcd:12::/64')
    expect(ipKey('2405:0201:abcd:0012:aaaa:bbbb:cccc:dddd')).toBe('2405:201:abcd:12::/64')
    expect(ipKey('203.0.113.9')).toBe('203.0.113.9')
    expect(ipKey('::ffff:203.0.113.9')).toBe('::ffff:203.0.113.9')

    const tagged = (i: number) => `tags.${run}+${i}@example.test`
    for (let i = 0; i < 5; i++) expect((await post('contact', contact(tagged(i)))).status).toBe(200)
    expect((await post('contact', contact(tagged(5)))).status).toBe(429)

    const prefix = `2001:db8:${(Date.now() % 0xffff).toString(16)}:7`
    const v6 = (i: number) => `${prefix}::${i + 1}`
    for (let i = 0; i < 10; i++) {
      expect((await post('contact', contact(address(`v6-${i}`)), { ip: v6(i) })).status).toBe(200)
    }
    expect((await post('contact', contact(address('v6-last')), { ip: v6(10) })).status).toBe(429)
  })
})

describe('waitlist', () => {
  it('needs a real product and joins each person once', async () => {
    const email = address('waitlist')
    const join = { product: `${run}-app`, email, marketing: true }
    expect((await post('waitlist', { ...join, product: 'no-such-product' })).status).toBe(400)
    expect((await post('waitlist', join)).status).toBe(200)
    await settled()
    expect(sent.some((m) => m.to === email && String(m.subject).includes('Forms test'))).toBe(true)
    sent.length = 0
    expect((await post('waitlist', join)).status).toBe(200)
    await settled()
    const leads = await leadsFor(email)
    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({ type: 'waitlist', product: productId })
    expect(sent).toHaveLength(0)
  })

  it('promises the launch email only with the box ticked, and keeps a later tick', async () => {
    const email = address('waitlist-later')
    const join = { product: `${run}-app`, email, marketing: false }
    expect((await post('waitlist', join)).status).toBe(200)
    await settled()
    expect(String(sent.find((m) => m.to === email)?.text)).toContain('only email')
    expect((await leadsFor(email))[0]?.marketingConsent?.given).toBe(false)

    sent.length = 0
    expect((await post('waitlist', { ...join, marketing: true })).status).toBe(200)
    await settled()
    const leads = await leadsFor(email)
    expect(leads).toHaveLength(1)
    expect(leads[0]?.marketingConsent).toMatchObject({ given: true, withdrawnAt: null })
    expect(leads[0]?.marketingConsent?.textVersion).toBeTruthy()
    expect(sent).toHaveLength(0)
  })

  it('takes a new tick after a withdrawal as consent again', async () => {
    const email = address('waitlist-withdrawn')
    const join = { product: `${run}-app`, email, marketing: true }
    expect((await post('waitlist', join)).status).toBe(200)
    const [lead] = await leadsFor(email)
    // Staff can record a withdrawal but not clear it; ticking the box again does.
    await payload.update({
      collection: 'leads',
      id: lead!.id,
      data: { marketingConsent: { withdrawnAt: '2026-10-10T10:00:00.000Z' } },
      depth: 0,
      overrideAccess: true,
    })
    expect((await post('waitlist', join)).status).toBe(200)
    const leads = await leadsFor(email)
    expect(leads).toHaveLength(1)
    expect(leads[0]?.marketingConsent).toMatchObject({ given: true, withdrawnAt: null })
  })
})

describe('newsletter double opt-in and unsubscribe', () => {
  const tokenFrom = (message: SendEmailOptions | undefined) =>
    String(message?.text).match(/confirm\?token=([\w-]{43})/)?.[1]

  it('confirms once through the emailed link, then unsubscribes every lead of the address', async () => {
    const email = address('news')
    expect((await post('newsletter', { email }, { meta: { locale: 'hi' } })).status).toBe(200)
    await settled()
    const [lead] = await leadsFor(email)
    expect(lead).toMatchObject({ type: 'newsletter', marketingConsent: { given: true } })
    expect(lead?.confirmedAt).toBeFalsy()
    // Staff are not alerted for every sign-up.
    expect(telegrams).toHaveLength(0)

    const message = sent.find((m) => m.to === email)
    const token = tokenFrom(message)
    expect(token).toBeTruthy()
    const headers = message?.headers as Record<string, string>
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    const unsubscribeUrl = headers['List-Unsubscribe']!.slice(1, -1)

    const confirmed = await confirm(
      new Request(`http://localhost:3000/api/v1/forms/newsletter/confirm?token=${token}`),
    )
    expect(confirmed.status).toBe(303)
    expect(new URL(confirmed.headers.get('location')!).pathname).toBe('/hi/newsletter/confirmed')
    const [after] = await leadsFor(email)
    expect(after?.confirmedAt).toBeTruthy()

    // Single use.
    const again = await confirm(
      new Request(`http://localhost:3000/api/v1/forms/newsletter/confirm?token=${token}`),
    )
    expect(new URL(again.headers.get('location')!).pathname).toBe('/newsletter/invalid')

    // Already subscribed: no second lead, no second email.
    sent.length = 0
    expect((await post('newsletter', { email })).status).toBe(200)
    await settled()
    expect(await leadsFor(email)).toHaveLength(1)
    expect(sent).toHaveLength(0)

    // A waitlist lead of the same address is unsubscribed too.
    await post('waitlist', { product: `${run}-app`, email, marketing: true })
    const res = await unsubscribeRoute.GET(new Request(unsubscribeUrl))
    expect(res.status).toBe(303)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/hi/newsletter/unsubscribed')
    const leads = await leadsFor(email)
    expect(leads).toHaveLength(2)
    expect(leads.every((l) => l.unsubscribedAt)).toBe(true)
  })

  it('accepts the one-click POST and rejects forged tokens', async () => {
    const email = address('oneclick')
    await post('newsletter', { email })
    await settled()
    const message = sent.find((m) => m.to === email)
    const url = (message?.headers as Record<string, string>)['List-Unsubscribe']!.slice(1, -1)
    const res = await unsubscribeRoute.POST(
      new Request(url, { method: 'POST', body: 'List-Unsubscribe=One-Click' }),
    )
    expect(res.status).toBe(200)
    expect((await leadsFor(email))[0]?.unsubscribedAt).toBeTruthy()

    const [id] = new URL(url).searchParams.get('token')!.split('.')
    const forged = await unsubscribeRoute.GET(
      new Request(`http://localhost:3000/api/v1/forms/unsubscribe?token=${id}.forged`),
    )
    expect(new URL(forged.headers.get('location')!).pathname).toBe('/newsletter/unsubscribeFailed')
  })

  it('starts a new opt-in when a confirmed subscriber had withdrawn consent', async () => {
    const email = address('withdrawn')
    await payload.create({
      collection: 'leads',
      data: {
        type: 'newsletter',
        status: 'new',
        email,
        confirmedAt: '2026-10-01T10:00:00.000Z',
        marketingConsent: { given: true, withdrawnAt: '2026-10-10T10:00:00.000Z' },
      },
      overrideAccess: true,
    })
    expect((await post('newsletter', { email })).status).toBe(200)
    await settled()
    expect(await leadsFor(email)).toHaveLength(2)
    expect(tokenFrom(sent.find((m) => m.to === email))).toBeTruthy()
  })

  it('rejects confirmation links older than seven days', async () => {
    const email = address('late')
    await post('newsletter', { email })
    await settled()
    const token = tokenFrom(sent.find((m) => m.to === email))
    const [lead] = await leadsFor(email)
    await (payload.db as unknown as PostgresAdapter).drizzle.execute(
      sql`UPDATE leads SET created_at = now() - interval '8 days' WHERE id = ${lead!.id}`,
    )
    const res = await confirm(
      new Request(`http://localhost:3000/api/v1/forms/newsletter/confirm?token=${token}`),
    )
    expect(new URL(res.headers.get('location')!).pathname).toBe('/newsletter/invalid')
    expect((await leadsFor(email))[0]?.confirmedAt).toBeFalsy()
  })
})

describe('careers', () => {
  const application = (email: string) => ({
    job: 'frontend-developer',
    name: 'Priya',
    email,
    phone: '',
    links: 'https://github.com/priya',
    message: '',
  })

  it('stores the CV as a private file owned by the lead, under a random name', async () => {
    const email = address('cv')
    expect((await post('careers', application(email), { cv: pdf })).status).toBe(200)
    const [lead] = await leadsFor(email)
    expect(lead).toMatchObject({ type: 'careers', details: { job: 'frontend-developer' } })
    expect(lead?.attachments).toHaveLength(1)
    const file = await payload.findByID({
      collection: 'private-files',
      id: lead!.attachments![0] as number,
      depth: 0,
      overrideAccess: true,
    })
    expect(file).toMatchObject({ purpose: 'cv', owner: { relationTo: 'leads', value: lead!.id } })
    expect(file.filename).toMatch(/^cv-[0-9a-f-]{36}\.pdf$/)
    expect(file.filename).not.toContain('Priya')
  })

  it('rejects a missing, oversized or non-PDF CV', async () => {
    const email = address('badcv')
    expect((await post('careers', application(email))).status).toBe(400)
    // Named PDF, typed PDF, not a PDF: the answer says which field to fix.
    const renamed = await post('careers', application(email), { cv: Buffer.from('MZ not a pdf') })
    expect(renamed.status).toBe(400)
    expect(await renamed.json()).toEqual({ error: 'invalid', field: 'cv' })
    const huge = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024)])
    expect((await post('careers', application(email), { cv: huge })).status).toBe(400)
    expect(await leadsFor(email)).toHaveLength(0)
  })
})

describe('privacy requests', () => {
  it('creates a data request and alerts the privacy inbox', async () => {
    const email = address('dpdp')
    const res = await post('data-request', {
      type: 'erasure',
      email,
      details: 'Please delete my data.',
    })
    expect(res.status).toBe(200)
    await settled()
    const { docs } = await payload.find({
      collection: 'data-requests',
      where: { email: { equals: email } },
      depth: 0,
      overrideAccess: true,
    })
    expect(docs[0]).toMatchObject({ type: 'erasure', status: 'new' })
    expect(sent.some((m) => m.to === email)).toBe(true)
    expect(telegrams[0]).toContain('/admin/collections/data-requests/')
  })
})
