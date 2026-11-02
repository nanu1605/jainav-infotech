/**
 * Phase 7 store against a real database (spec §11.2–§11.4, §19): email-code sign-in and sessions,
 * checkout create / verify, the webhook, the fulfilment transaction, paid-twice flagging, late
 * captures and reconciliation, coupons, invoice numbering under concurrency and the post-commit
 * jobs. Razorpay is the development stand-in gateway (no keys in tests), called in-process.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Payload, type SendEmailOptions } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

import { publishCheckoutPages } from './legalPages'

const pending: Promise<unknown>[] = []
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => void pending.push(Promise.resolve().then(fn)),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const otpRequest = (await import('@/app/api/v1/account/otp/request/route')).POST
const otpVerify = (await import('@/app/api/v1/account/otp/verify/route')).POST
const signOutRoute = (await import('@/app/api/v1/account/sign-out/route')).POST
const profileRoute = (await import('@/app/api/v1/account/profile/route')).POST
const deleteRoute = (await import('@/app/api/v1/account/delete/route')).POST
const invoiceRoute = (await import('@/app/api/v1/account/invoices/[id]/route')).GET
const quoteRoute = (await import('@/app/api/v1/checkout/quote/route')).POST
const createRoute = (await import('@/app/api/v1/checkout/create/route')).POST
const verifyRoute = (await import('@/app/api/v1/checkout/verify/route')).POST
const statusRoute = (await import('@/app/api/v1/checkout/status/route')).GET
const webhookRoute = (await import('@/app/api/v1/webhooks/razorpay/route')).POST
const gateway = await import('@/app/api/v1/dev/razorpay/[...path]/route')
const { fulfilOrder } = await import('@/lib/commerce/fulfil')
const { reconcileOrders } = await import('@/lib/commerce/reconcile')
const { DEV_GATEWAY, hmacHex } = await import('@/lib/commerce/razorpay')
const { SITE_URL } = await import('@/lib/seo')

let payload: Payload
const run = `st${Date.now()}`
const email = (name: string) => `${name}.${run}@example.test`
let ipCounter = 0
const nextIp = () => `198.51.101.${++ipCounter % 250}`
const sent: SendEmailOptions[] = []
const telegrams: string[] = []
const ids: { product?: number; plan?: number; coupons: number[] } = { coupons: [] }
const restore: (() => Promise<unknown>)[] = []
const db = () => (payload.db as unknown as PostgresAdapter).drizzle

/** Waits for after() work, including work that queues more after() work. */
const settled = async () => {
  while (pending.length) await Promise.all(pending.splice(0))
}

function request(
  path: string,
  {
    method = 'POST',
    body,
    cookie,
    ip,
  }: { method?: string; body?: unknown; cookie?: string; ip?: string } = {},
) {
  return new Request(`${SITE_URL}${path}`, {
    method,
    headers: {
      'cf-connecting-ip': ip ?? nextIp(),
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(cookie && { cookie }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const gw = async (path: string, body: object) => {
  const res = await gateway.POST(request(`/api/v1/dev/razorpay/${path}`, { body }), {
    params: Promise.resolve({ path: path.split('/') }),
  })
  return res.json()
}

/** Signs in through the email code and returns the session cookie. */
async function signIn(address: string): Promise<string> {
  const before = sent.length
  const res = await otpRequest(
    request('/api/v1/account/otp/request', {
      body: { email: address, locale: 'en', turnstile: 'ok' },
    }),
  )
  expect(res.status).toBe(200)
  await settled()
  const message = sent.slice(before).find((m) => m.to === address)
  const code = String(message?.text).match(/\b(\d{6})\b/)?.[1]
  expect(code).toBeTruthy()
  const verified = await otpVerify(
    request('/api/v1/account/otp/verify', { body: { email: address, code } }),
  )
  expect(verified.status).toBe(200)
  const cookie = verified.headers.get('set-cookie')?.split(';')[0]
  expect(cookie).toMatch(/^jv_session=[\w-]{43}$/)
  return cookie!
}

const billing = (extra: object = {}) => ({
  name: 'Priya Sharma',
  phone: '',
  state: '23',
  businessName: '',
  gstin: '',
  ...extra,
})

async function createOrder(cookie: string, extra: { coupon?: string; billing?: object } = {}) {
  const res = await createRoute(
    request('/api/v1/checkout/create', {
      cookie,
      body: {
        product: `${run}-app`,
        plan: 'pro',
        coupon: extra.coupon ?? '',
        billing: billing(extra.billing),
        accept: true,
        locale: 'en',
      },
    }),
  )
  return { status: res.status, body: await res.json() }
}

const verify = async (cookie: string, response: object) =>
  verifyRoute(request('/api/v1/checkout/verify', { cookie, body: response }))

const orderByNumber = async (orderNumber: string) =>
  (
    await payload.find({
      collection: 'orders',
      where: { orderNumber: { equals: orderNumber } },
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]!

const invoicesFor = async (orderId: number) =>
  (
    await payload.find({
      collection: 'invoices',
      where: { order: { equals: orderId } },
      depth: 0,
      overrideAccess: true,
    })
  ).docs

/** Site settings in SQL: other suites leave values there that a full validation would refuse. */
async function setSite(storeEnabled: boolean, gstin: string | null) {
  // A fresh database has no row until the global is first saved.
  await db().execute(
    sql`INSERT INTO site_settings (updated_at, created_at) SELECT now(), now() WHERE NOT EXISTS (SELECT 1 FROM site_settings)`,
  )
  const { rows } = await db().execute(
    sql`SELECT store_enabled, company_gstin FROM site_settings LIMIT 1`,
  )
  const before = rows[0] as { store_enabled: boolean | null; company_gstin: string | null }
  await db().execute(
    sql`UPDATE site_settings SET store_enabled = ${storeEnabled}, company_gstin = ${gstin}`,
  )
  restore.push(() =>
    db().execute(
      sql`UPDATE site_settings SET store_enabled = ${before.store_enabled}, company_gstin = ${before.company_gstin}`,
    ),
  )
}

async function setGlobal(slug: 'commerce-settings', data: Record<string, unknown>) {
  const before = await payload.findGlobal({ slug, depth: 0, overrideAccess: true })
  await payload.updateGlobal({
    slug,
    data,
    depth: 0,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  restore.push(() =>
    payload.updateGlobal({
      slug,
      data: Object.fromEntries(
        Object.keys(data).map((k) => [
          k,
          (before as unknown as Record<string, unknown>)[k] ?? null,
        ]),
      ),
      depth: 0,
      overrideAccess: true,
      context: { disableRevalidate: true },
    }),
  )
}

beforeAll(async () => {
  payload = await getPayload({ config })
  vi.spyOn(payload, 'sendEmail').mockImplementation(async (message) => {
    sent.push(message as SendEmailOptions)
  })
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.TELEGRAM_CHAT_ID = '42'
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.includes('turnstile')) {
      return Response.json({ success: (init?.body as URLSearchParams).get('response') === 'ok' })
    }
    if (url.includes('api.telegram.org')) {
      telegrams.push(JSON.parse(String(init?.body)).text)
      return Response.json({ ok: true })
    }
    const gatewayBase = `${SITE_URL}/api/v1/dev/razorpay/`
    if (url.startsWith(gatewayBase)) {
      const path = new URL(url).pathname.replace('/api/v1/dev/razorpay/', '').split('/')
      const req = new Request(url, init)
      const ctx = { params: Promise.resolve({ path }) }
      return (init?.method ?? 'GET') === 'GET' ? gateway.GET(req, ctx) : gateway.POST(req, ctx)
    }
    if (url === `${SITE_URL}/api/v1/webhooks/razorpay`) return webhookRoute(new Request(url, init))
    return realFetch(input, init)
  })
  await db()
    .execute(sql`DELETE FROM rate_limit.hits`)
    .catch(() => undefined)

  await setSite(true, null)
  await setGlobal('commerce-settings', {
    currentTermsVersion: '1.0',
    currentEulaVersion: '1.0',
    gstEnabled: false,
    invoicePrefix: 'JT',
  })
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Store test',
      slug: `${run}-app`,
      tagline: 'Tagline',
      type: 'desktop',
      category: 'other',
      status: 'live',
      hostingMode: 'hosted',
      accentColor: '#123456',
      primaryButton: { type: 'contact' },
      hiStatus: 'missing',
      _status: 'published',
    },
    overrideAccess: true,
  })
  ids.product = product.id
  const plan = await payload.create({
    collection: 'plans',
    data: {
      product: product.id,
      code: 'pro',
      name: 'Pro',
      billing: 'one_time',
      priceINR: 99_900,
      active: true,
    },
    overrideAccess: true,
  })
  ids.plan = plan.id
  restore.push(await publishCheckoutPages(payload, `${run}-app`))
})

beforeEach(async () => {
  await settled()
  sent.length = 0
  telegrams.length = 0
  // The per-customer checkout limit would trip across tests (the table appears on first use).
  await db()
    .execute(sql`DELETE FROM rate_limit.hits`)
    .catch(() => undefined)
})

afterAll(async () => {
  await settled()
  vi.unstubAllGlobals()
  const customers = await payload.find({
    collection: 'customers',
    where: { or: [{ email: { like: run } }, { status: { equals: 'deleted' } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const customerIds = customers.docs.map((c) => c.id)
  if (customerIds.length) {
    const orders = await payload.find({
      collection: 'orders',
      where: { customer: { in: customerIds } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    const orderIds = orders.docs.map((o) => o.id)
    if (orderIds.length) {
      const invoices = await payload.find({
        collection: 'invoices',
        where: { order: { in: orderIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      const pdfs = invoices.docs.flatMap((i) =>
        i.pdf ? [typeof i.pdf === 'object' ? i.pdf.id : i.pdf] : [],
      )
      // Through the Local API, so the files go too.
      if (pdfs.length)
        await payload.delete({
          collection: 'private-files',
          where: { id: { in: pdfs } },
          overrideAccess: true,
        })
      await db().execute(sql`UPDATE orders SET invoice_id = NULL WHERE id IN ${orderIds}`)
      await db().execute(sql`DELETE FROM invoices WHERE order_id IN ${orderIds}`)
      await db().execute(sql`DELETE FROM orders WHERE id IN ${orderIds}`)
    }
    await db().execute(
      sql`DELETE FROM activations WHERE license_id IN (SELECT id FROM licenses WHERE customer_id IN ${customerIds})`,
    )
    await db().execute(sql`DELETE FROM licenses WHERE customer_id IN ${customerIds}`)
    await db().execute(sql`DELETE FROM customer_sessions WHERE customer_id IN ${customerIds}`)
    await db().execute(sql`DELETE FROM customers WHERE id IN ${customerIds}`)
  }
  await db().execute(sql`DELETE FROM invoice_counters WHERE series = 'JT'`)
  await db().execute(sql`DELETE FROM payload_jobs`)
  await db().execute(sql`DELETE FROM webhook_events WHERE event_id LIKE 'evt_dev%'`)
  for (const id of ids.coupons)
    await payload.delete({ collection: 'coupons', id, overrideAccess: true })
  if (ids.plan) await payload.delete({ collection: 'plans', id: ids.plan, overrideAccess: true })
  if (ids.product)
    await payload.delete({ collection: 'products', id: ids.product, overrideAccess: true })
  for (const undo of restore.reverse()) await undo()
})

describe('email code sign-in (spec §11.2)', () => {
  it('signs in with the emailed code and creates the account once', async () => {
    const address = email('signin')
    const cookie = await signIn(address)
    const { docs } = await payload.find({
      collection: 'customers',
      where: { email: { equals: address } },
      depth: 0,
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    // Only keyed hashes are stored.
    const { docs: challenges } = await payload.find({
      collection: 'otp-challenges',
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    expect(JSON.stringify(challenges)).not.toContain(address)
    const status = await statusRoute(
      request('/api/v1/checkout/status?order=JO-00000000', { method: 'GET', cookie }),
    )
    expect(status.status).toBe(404) // signed in, but no such order
  })

  it('answers the same for any address, and makes a second code wait a minute', async () => {
    const address = email('cooldown')
    const first = await otpRequest(
      request('/api/v1/account/otp/request', {
        body: { email: address, locale: 'hi', turnstile: 'ok' },
      }),
    )
    expect(await first.json()).toEqual({ ok: true, resendIn: 60 })
    const again = await otpRequest(
      request('/api/v1/account/otp/request', {
        body: { email: address, locale: 'hi', turnstile: 'ok' },
      }),
    )
    expect(again.status).toBe(429)
    expect(await again.json()).toMatchObject({ error: 'cooldown' })
    const bot = await otpRequest(
      request('/api/v1/account/otp/request', {
        body: { email: email('bot'), locale: 'en', turnstile: 'bad' },
      }),
    )
    expect(await bot.json()).toEqual({ error: 'verification' })
    await settled()
    expect(sent.filter((m) => m.to === address)).toHaveLength(1)
  })

  it('allows five tries, then the code is gone', async () => {
    const address = email('guess')
    await otpRequest(
      request('/api/v1/account/otp/request', {
        body: { email: address, locale: 'en', turnstile: 'ok' },
      }),
    )
    await settled()
    const code = String(sent.find((m) => m.to === address)?.text).match(/\b(\d{6})\b/)![1]!
    const wrong = code === '000000' ? '111111' : '000000'
    const tries = []
    for (let i = 0; i < 5; i++) {
      const res = await otpVerify(
        request('/api/v1/account/otp/verify', { body: { email: address, code: wrong } }),
      )
      tries.push(await res.json())
    }
    expect(tries.slice(0, 4).map((t) => t.attemptsLeft)).toEqual([4, 3, 2, 1])
    expect(tries[4]).toEqual({ error: 'codeExpired' })
    const late = await otpVerify(
      request('/api/v1/account/otp/verify', { body: { email: address, code } }),
    )
    expect(await late.json()).toEqual({ error: 'codeExpired' })
  })

  it('refuses an expired code', async () => {
    const address = email('expired')
    await otpRequest(
      request('/api/v1/account/otp/request', {
        body: { email: address, locale: 'en', turnstile: 'ok' },
      }),
    )
    await settled()
    const code = String(sent.find((m) => m.to === address)?.text).match(/\b(\d{6})\b/)![1]!
    await db().execute(
      sql`UPDATE otp_challenges SET expires_at = now() - interval '1 second' WHERE created_at > now() - interval '1 minute'`,
    )
    const res = await otpVerify(
      request('/api/v1/account/otp/verify', { body: { email: address, code } }),
    )
    expect(await res.json()).toEqual({ error: 'codeExpired' })
  })

  it('saves settings, and signing out or deleting the account ends the session', async () => {
    const address = email('settings')
    const cookie = await signIn(address)
    const saved = await profileRoute(
      request('/api/v1/account/profile', {
        cookie,
        body: {
          name: 'Asha',
          phone: '',
          preferredLocale: 'hi',
          state: '27',
          businessName: 'Asha Labs',
          gstin: '29AAGCB7383J1Z4',
          marketing: true,
        },
      }),
    )
    expect(saved.status).toBe(200)
    const [customer] = (
      await payload.find({
        collection: 'customers',
        where: { email: { equals: address } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs
    // The GSTIN fixes the state (Karnataka, 29) over the one picked.
    expect(customer).toMatchObject({
      name: 'Asha',
      preferredLocale: 'hi',
      state: '29',
      marketingConsent: { given: true },
    })

    const second = await signIn(address)
    expect(
      (await signOutRoute(request('/api/v1/account/sign-out', { cookie: second }))).status,
    ).toBe(200)
    expect(
      (
        await statusRoute(
          request('/api/v1/checkout/status?order=JO-00000000', { method: 'GET', cookie: second }),
        )
      ).status,
    ).toBe(401)

    expect(
      (await deleteRoute(request('/api/v1/account/delete', { cookie, body: {} }))).status,
    ).toBe(200)
    const gone = await payload.findByID({
      collection: 'customers',
      id: customer!.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(gone).toMatchObject({ status: 'deleted', name: null, gstin: null })
    expect(gone.email).toMatch(/@deleted\.invalid$/)
    expect(gone.marketingConsent?.withdrawnAt).toBeTruthy()
    expect(
      (await profileRoute(request('/api/v1/account/profile', { cookie, body: {} }))).status,
    ).toBe(401)
  })
})

describe('checkout (spec §11.3)', () => {
  let cookie: string
  let other: string
  beforeAll(async () => {
    cookie = await signIn(email('buyer'))
    other = await signIn(email('other'))
  })

  it('quotes, creates an order with the acceptance record and opens a Razorpay order', async () => {
    const quote = await quoteRoute(
      request('/api/v1/checkout/quote', {
        cookie,
        body: { product: `${run}-app`, plan: 'pro', coupon: '', state: '27', gstin: '' },
      }),
    )
    expect(await quote.json()).toEqual({
      ok: true,
      quote: {
        subtotal: 99_900,
        discount: 0,
        taxable: 99_900,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 99_900,
        mode: 'none',
        ratePercent: 0,
        coupon: null,
      },
    })
    const { status, body } = await createOrder(cookie)
    expect(status).toBe(200)
    expect(body.razorpay).toMatchObject({
      key: DEV_GATEWAY.keyId,
      amount: 99_900,
      currency: 'INR',
      script: '/api/v1/dev/razorpay/checkout.js',
    })
    const order = await orderByNumber(body.order.number)
    expect(order).toMatchObject({
      status: 'created',
      total: 99_900,
      razorpayOrderId: body.razorpay.order_id,
      billing: { name: 'Priya Sharma', stateCode: '23', stateName: 'Madhya Pradesh' },
      acceptance: { termsVersion: '1.0', eulaVersion: '1.0' },
    })
    expect(order.acceptance.ipHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('refuses the order without the acceptance box or with non-Latin billing text', async () => {
    const res = await createRoute(
      request('/api/v1/checkout/create', {
        cookie,
        body: {
          product: `${run}-app`,
          plan: 'pro',
          coupon: '',
          billing: billing(),
          accept: false,
          locale: 'en',
        },
      }),
    )
    expect(await res.json()).toEqual({ error: 'invalid', field: 'accept' })
    const hindi = await createOrder(cookie, { billing: { name: 'प्रिया' } })
    expect(hindi.body).toEqual({ error: 'invalid', field: 'billing.name' })
    const signedOut = await createRoute(request('/api/v1/checkout/create', { body: {} }))
    expect(signedOut.status).toBe(401)
  })

  it('refuses the order while the EULA the checkout links to is unpublished', async () => {
    const setStatus = (status: 'draft' | 'published') =>
      payload.update({
        collection: 'legal-pages',
        where: { slug: { equals: `eula-${run}-app` } },
        data: { _status: status },
        depth: 0,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    await setStatus('draft')
    const refused = await createOrder(cookie)
    expect(refused.status).toBe(409)
    expect(refused.body).toEqual({ error: 'unavailable' })
    await setStatus('published')
    expect((await createOrder(cookie)).status).toBe(200)
  })

  it('verifies, fulfils once and runs the invoice and email jobs', async () => {
    const { body } = await createOrder(cookie)
    const paid = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    const res = await verify(cookie, paid.response)
    expect(await res.json()).toEqual({ ok: true, status: 'paid', order: body.order.number })
    await settled()
    const order = await orderByNumber(body.order.number)
    expect(order).toMatchObject({
      status: 'paid',
      razorpayPaymentId: paid.response.razorpay_payment_id,
    })
    const [invoice, ...more] = await invoicesFor(order.id)
    expect(more).toHaveLength(0)
    expect(invoice).toMatchObject({ kind: 'invoice', taxMode: 'none', totals: { total: 99_900 } })
    expect(invoice!.number).toMatch(/^JT\/\d{2}-\d{2}\/\d{5}$/)
    expect(invoice!.pdf).toBeTruthy()
    expect(order.emailedAt).toBeTruthy()
    const mail = sent.find((m) => m.to === order.billing.email)
    expect(mail?.attachments).toEqual([
      expect.objectContaining({ filename: `${invoice!.number.replaceAll('/', '-')}.pdf` }),
    ])
    // Phase 8: the order created a license, and its key is in the email.
    const licenses = await payload.find({
      collection: 'licenses',
      where: { order: { equals: order.id } },
      depth: 0,
      overrideAccess: true,
    })
    expect(licenses.docs).toHaveLength(1)
    const license = licenses.docs[0]!
    expect(license).toMatchObject({
      source: 'purchase',
      status: 'active',
      maxActivations: 2,
      customer: order.customer,
      plan: ids.plan,
    })
    expect(license.licenseKey).toMatch(/^[A-Z0-9]+(-[0-9A-HJKMNP-TV-Z]{5}){4}$/)
    expect(license.licenseKey!.endsWith(license.keyLast4!)).toBe(true)
    expect(mail?.text).toContain(license.licenseKey)
    // Verifying again, or a late webhook, changes nothing.
    expect(await (await verify(cookie, paid.response)).json()).toMatchObject({ status: 'paid' })
    expect(await fulfilOrder(payload, order.id, paid.response.razorpay_payment_id, 'webhook')).toBe(
      'already',
    )
    expect(await invoicesFor(order.id)).toHaveLength(1)
    expect(
      (
        await payload.count({
          collection: 'licenses',
          where: { order: { equals: order.id } },
          overrideAccess: true,
        })
      ).totalDocs,
    ).toBe(1)

    // The PDF is the owner's alone.
    const pdf = await invoiceRoute(
      request(`/api/v1/account/invoices/${invoice!.id}`, { method: 'GET', cookie }),
      {
        params: Promise.resolve({ id: String(invoice!.id) }),
      },
    )
    expect(pdf.headers.get('content-type')).toBe('application/pdf')
    expect(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe('%PDF-')
    const stranger = await invoiceRoute(
      request(`/api/v1/account/invoices/${invoice!.id}`, { method: 'GET', cookie: other }),
      {
        params: Promise.resolve({ id: String(invoice!.id) }),
      },
    )
    expect(stranger.status).toBe(404)
    // So is the order status.
    const status = await statusRoute(
      request(`/api/v1/checkout/status?order=${body.order.number}`, {
        method: 'GET',
        cookie: other,
      }),
    )
    expect(status.status).toBe(404)
  })

  it('rejects a payment for another order, a wrong amount, a bad signature and another customer', async () => {
    const a = (await createOrder(cookie)).body
    const b = (await createOrder(cookie)).body
    const paidB = await gw('pay', {
      order_id: b.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    const paymentB = paidB.response.razorpay_payment_id
    // A valid signature for order A, but the payment belongs to order B.
    const crossed = {
      razorpay_order_id: a.razorpay.order_id,
      razorpay_payment_id: paymentB,
      razorpay_signature: hmacHex(DEV_GATEWAY.keySecret, `${a.razorpay.order_id}|${paymentB}`),
    }
    expect(await (await verify(cookie, crossed)).json()).toEqual({ error: 'mismatch' })
    // The right order, but Razorpay reports a different amount.
    const store = (
      globalThis as unknown as { __devGateway: { payments: Map<string, { amount: number }> } }
    ).__devGateway
    store.payments.get(paymentB)!.amount = 100
    expect(await (await verify(cookie, paidB.response)).json()).toEqual({ error: 'mismatch' })
    store.payments.get(paymentB)!.amount = 99_900
    const forged = { ...paidB.response, razorpay_signature: 'f'.repeat(64) }
    expect(await (await verify(cookie, forged)).json()).toEqual({ error: 'mismatch' })
    expect((await verify(other, paidB.response)).status).toBe(404)
    expect((await orderByNumber(a.order.number)).status).toBe('created')
    expect((await orderByNumber(b.order.number)).status).toBe('created')
    // The genuine one still goes through.
    expect(await (await verify(cookie, paidB.response)).json()).toMatchObject({ status: 'paid' })
  })

  it('fulfils from the webhook alone and ignores redelivered events', async () => {
    const { body } = await createOrder(cookie)
    const paid = await gw('pay', { order_id: body.razorpay.order_id, outcome: 'success' })
    await settled()
    const order = await orderByNumber(body.order.number)
    expect(order.status).toBe('paid')
    const events = await payload.find({
      collection: 'webhook-events',
      where: { eventId: { in: paid.events } },
      depth: 0,
      overrideAccess: true,
    })
    expect(events.docs.map((e) => [e.event, e.status]).sort()).toEqual([
      ['order.paid', 'processed'],
      ['payment.captured', 'processed'],
    ])
    for (const eventId of paid.events) await gw('replay', { event_id: eventId })
    await settled()
    expect(
      (
        await payload.count({
          collection: 'webhook-events',
          where: { eventId: { in: paid.events } },
          overrideAccess: true,
        })
      ).totalDocs,
    ).toBe(2)
    expect(await invoicesFor(order.id)).toHaveLength(1)
  })

  it('refuses a webhook with a bad signature', async () => {
    const res = await webhookRoute(
      new Request(`${SITE_URL}/api/v1/webhooks/razorpay`, {
        method: 'POST',
        headers: {
          'x-razorpay-signature': 'ab'.repeat(32),
          'x-razorpay-event-id': 'evt_devforged',
        },
        body: JSON.stringify({ event: 'payment.captured', payload: {} }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('flags a second captured payment on a paid order once, with an alert', async () => {
    const { body } = await createOrder(cookie)
    const first = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    await verify(cookie, first.response)
    const second = await gw('pay', { order_id: body.razorpay.order_id, outcome: 'success' })
    await settled()
    for (const eventId of second.events) await gw('replay', { event_id: eventId })
    await settled()
    const order = await orderByNumber(body.order.number)
    expect(order.flags).toEqual(['paid-twice'])
    expect(order.razorpayPaymentId).toBe(first.response.razorpay_payment_id)
    const flagged = (order.events as { type: string }[]).filter((e) => e.type === 'paid-twice')
    expect(flagged).toHaveLength(1)
    expect(telegrams.filter((t) => t.includes(body.order.number))).toHaveLength(1)
    expect(await invoicesFor(order.id)).toHaveLength(1)
  })

  it('still fulfils a late capture on an expired order (reconciliation)', async () => {
    const { body } = await createOrder(cookie)
    const authorized = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'authorized',
      webhooks: false,
    })
    expect(await (await verify(cookie, authorized.response)).json()).toMatchObject({
      status: 'pending',
    })
    const order = await orderByNumber(body.order.number)
    // A day later: reconciliation marks it expired.
    await db().execute(
      sql`UPDATE orders SET created_at = now() - interval '25 hours' WHERE id = ${order.id}`,
    )
    await reconcileOrders()
    expect((await orderByNumber(body.order.number)).status).toBe('expired')
    // The bank confirms; the webhook is lost; the next run finds the capture.
    await gw('capture', { payment_id: authorized.response.razorpay_payment_id, webhooks: false })
    await reconcileOrders()
    const late = await orderByNumber(body.order.number)
    expect(late.status).toBe('paid')
    expect(
      (late.events as { type: string; source?: string }[]).map(
        (e) => `${e.type}${e.source ? `:${e.source}` : ''}`,
      ),
    ).toEqual(expect.arrayContaining(['created', 'expired', 'paid:reconcile']))
  })

  it('records failed payments, and acts on refunds and disputes (refunds.test.ts)', async () => {
    const { body } = await createOrder(cookie)
    await gw('pay', { order_id: body.razorpay.order_id, outcome: 'failure' })
    await settled()
    expect((await orderByNumber(body.order.number)).status).toBe('created')

    const paid = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    await verify(cookie, paid.response)
    const paymentId = paid.response.razorpay_payment_id
    /** A webhook as Razorpay signs it. */
    const send = (event: string, entities: object) => {
      const raw = JSON.stringify({ entity: 'event', event, payload: entities, created_at: 0 })
      return webhookRoute(
        new Request(`${SITE_URL}/api/v1/webhooks/razorpay`, {
          method: 'POST',
          headers: {
            'x-razorpay-signature': hmacHex(DEV_GATEWAY.webhookSecret, raw),
            'x-razorpay-event-id': `evt_dev${run}${event}`,
          },
          body: raw,
        }),
      )
    }
    const refund = { id: 'rfnd_dev1', payment_id: paymentId, amount: 99_900, status: 'processed' }
    expect((await send('refund.processed', { refund: { entity: refund } })).status).toBe(200)
    const dispute = { id: 'disp_dev1', payment_id: paymentId, amount: 99_900, reason_code: 'fraud' }
    expect((await send('payment.dispute.created', { dispute: { entity: dispute } })).status).toBe(
      200,
    )
    await settled()
    const order = await orderByNumber(body.order.number)
    expect((order.events as { type: string }[]).map((e) => e.type)).toEqual(
      expect.arrayContaining([
        'payment-failed',
        'paid',
        'refund-processed',
        'payment.dispute.created',
      ]),
    )
    // Phase 9: the full refund refunded the order (a dispute after it changes nothing more).
    expect(order).toMatchObject({ status: 'refunded', amountRefunded: 99_900 })
    expect(order.creditNotes).toHaveLength(1)
  })

  it('numbers concurrent invoices consecutively, without gaps or repeats', async () => {
    const orders = await Promise.all(Array.from({ length: 6 }, () => createOrder(cookie)))
    const payments = await Promise.all(
      orders.map(({ body }) =>
        gw('pay', { order_id: body.razorpay.order_id, outcome: 'success', webhooks: false }),
      ),
    )
    const rows = await Promise.all(orders.map(({ body }) => orderByNumber(body.order.number)))
    const results = await Promise.all(
      rows.map((order, i) =>
        fulfilOrder(payload, order.id, payments[i].response.razorpay_payment_id, 'verify'),
      ),
    )
    expect(results).toEqual(Array(6).fill('fulfilled'))
    const numbers = (await Promise.all(rows.map((o) => invoicesFor(o.id))))
      .flat()
      .map((i) => i.number)
    const seqs = numbers.map((n) => Number(n.split('/')[2])).sort((x, y) => x - y)
    expect(new Set(numbers).size).toBe(6)
    expect(seqs.at(-1)! - seqs[0]!).toBe(5)
  })

  it('fulfils an order once when verify and the webhook race', async () => {
    const { body } = await createOrder(cookie)
    const paid = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    const order = await orderByNumber(body.order.number)
    const results = await Promise.all([
      fulfilOrder(payload, order.id, paid.response.razorpay_payment_id, 'verify'),
      fulfilOrder(payload, order.id, paid.response.razorpay_payment_id, 'webhook'),
    ])
    expect(results.sort()).toEqual(['already', 'fulfilled'])
    expect(await invoicesFor(order.id)).toHaveLength(1)
  })
})

describe('housekeeping', () => {
  it('lets the Owner delete a customer without orders (sessions go too), never one with orders', async () => {
    const address = email('erase')
    await signIn(address)
    const [customer] = (
      await payload.find({
        collection: 'customers',
        where: { email: { equals: address } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs
    await payload.delete({ collection: 'customers', id: customer!.id, overrideAccess: true })
    const sessions = await payload.count({
      collection: 'customer-sessions',
      where: { customer: { equals: customer!.id } },
      overrideAccess: true,
    })
    expect(sessions.totalDocs).toBe(0)

    const buyer = (
      await payload.find({
        collection: 'customers',
        where: { email: { equals: email('buyer') } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0]!
    await expect(
      payload.delete({ collection: 'customers', id: buyer.id, overrideAccess: true }),
    ).rejects.toThrow(/anonymize/)
  })

  it('sends the order email again when a crash ended the run after its claim', async () => {
    const cookie = await signIn(email('lease'))
    const { body } = await createOrder(cookie)
    const paid = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    const order = await orderByNumber(body.order.number)
    // Fulfilled, and the email claimed by a run that died before sending.
    await fulfilOrder(payload, order.id, paid.response.razorpay_payment_id, 'verify')
    await db().execute(sql`DELETE FROM payload_jobs WHERE input->>'id' = ${String(order.id)}`)
    const claim = (minutes: number) =>
      db().execute(
        sql`UPDATE orders SET emailed_at = now() - make_interval(mins => ${minutes}) WHERE id = ${order.id}`,
      )
    const { sendOrderEmail } = await import('@/lib/invoices/deliver')
    const confirmations = () =>
      sent.filter((m) => m.to === order.billing.email && /confirmed/.test(String(m.subject)))
    // A 12-minute lease: a younger claim may still be sending.
    await claim(5)
    await expect(sendOrderEmail(order.id)).rejects.toThrow(/claimed by another run/)
    expect(confirmations()).toHaveLength(0)
    await claim(13)
    await sendOrderEmail(order.id)
    expect(confirmations()).toHaveLength(1)
    // Recorded as sent: a later run doesn't send it twice.
    await claim(13)
    await sendOrderEmail(order.id)
    expect(confirmations()).toHaveLength(1)
  })

  it('releases jobs a crash left processing, and drops webhook payloads after 90 days', async () => {
    const job = await payload.jobs.queue({ task: 'cleanup', input: {} })
    await db().execute(
      sql`UPDATE payload_jobs SET processing = true, updated_at = now() - interval '31 minutes' WHERE id = ${job.id}`,
    )
    await (payload.config.jobs.shouldAutoRun as (p: Payload) => Promise<boolean>)(payload)
    const released = await payload.findByID({
      collection: 'payload-jobs',
      id: job.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(released.processing).toBe(false)

    const old = await payload.create({
      collection: 'webhook-events',
      data: {
        provider: 'razorpay',
        eventId: `evt_dev${run}old`,
        event: 'payment.failed',
        status: 'failed',
        payload: { contact: '+919999999999' },
        receivedAt: new Date(Date.now() - 91 * 86_400_000).toISOString(),
      },
      overrideAccess: true,
    })
    const { cleanup } = await import('@/lib/commerce/webhooks')
    await cleanup()
    await expect(
      payload.findByID({ collection: 'webhook-events', id: old.id, overrideAccess: true }),
    ).rejects.toThrow()
  })
})

describe('GST and coupons (spec §11.4, §11.5)', () => {
  let cookie: string
  beforeAll(async () => {
    cookie = await signIn(email('gst'))
    await setSite(true, '23AAACJ1234A1ZJ')
    await setGlobal('commerce-settings', {
      gstEnabled: true,
      gstRatePercent: 18,
      sacCode: '998431',
    })
  })
  afterAll(async () => {
    await payload.updateGlobal({
      slug: 'commerce-settings',
      data: { gstEnabled: false },
      depth: 0,
      overrideAccess: true,
    })
  })

  it('charges CGST + SGST at home and IGST elsewhere, as quoted and invoiced', async () => {
    const quote = async (state: string, gstin = '') =>
      (
        await (
          await quoteRoute(
            request('/api/v1/checkout/quote', {
              cookie,
              body: { product: `${run}-app`, plan: 'pro', coupon: '', state, gstin },
            }),
          )
        ).json()
      ).quote
    expect(await quote('23')).toMatchObject({
      mode: 'cgst_sgst',
      taxable: 84_661,
      cgst: 7_620,
      sgst: 7_619,
      total: 99_900,
    })
    expect(await quote('27')).toMatchObject({ mode: 'igst', igst: 15_239 })
    // A GSTIN decides the place of supply, whatever state was picked.
    expect(await quote('23', '29AAGCB7383J1Z4')).toMatchObject({ mode: 'igst' })

    const { body } = await createOrder(cookie, {
      billing: { state: '23', gstin: '29AAGCB7383J1Z4', businessName: 'B Labs' },
    })
    const paid = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    await verify(cookie, paid.response)
    await settled()
    const order = await orderByNumber(body.order.number)
    expect(order.billing).toMatchObject({
      stateCode: '29',
      stateName: 'Karnataka',
      gstin: '29AAGCB7383J1Z4',
    })
    const [invoice] = await invoicesFor(order.id)
    expect(invoice).toMatchObject({
      taxMode: 'igst',
      sacCode: '998431',
      reverseCharge: false,
      seller: { gstin: '23AAACJ1234A1ZJ', stateCode: '23', stateName: 'Madhya Pradesh' },
      buyer: {
        name: 'Priya Sharma',
        businessName: 'B Labs',
        stateCode: '29',
        gstin: '29AAGCB7383J1Z4',
      },
      totals: { taxable: 84_661, igst: 15_239, total: 99_900 },
    })
  })

  it('applies coupons before tax, keeps the ₹1 floor and the redemption limits', async () => {
    const percent = await payload.create({
      collection: 'coupons',
      data: {
        code: `${run}-TEN`.toUpperCase(),
        kind: 'percent',
        value: 10,
        maxRedemptions: 1,
        active: true,
      },
      overrideAccess: true,
    })
    const huge = await payload.create({
      collection: 'coupons',
      data: { code: `${run}-ALL`.toUpperCase(), kind: 'fixed', value: 99_850, active: true },
      overrideAccess: true,
    })
    ids.coupons.push(percent.id, huge.id)
    const quote = async (coupon: string) =>
      (
        await quoteRoute(
          request('/api/v1/checkout/quote', {
            cookie,
            body: { product: `${run}-app`, plan: 'pro', coupon, state: '23', gstin: '' },
          }),
        )
      ).json()
    expect((await quote(percent.code.toLowerCase())).quote).toMatchObject({
      discount: 9_990,
      total: 89_910,
      coupon: percent.code,
    })
    expect(await quote(huge.code)).toEqual({ error: 'coupon', reason: 'too_large' })
    expect(await quote('NOPE-NOPE')).toEqual({ error: 'coupon', reason: 'invalid' })

    const { body } = await createOrder(cookie, { coupon: percent.code })
    expect(body.order.total).toBe(89_910)
    const paid = await gw('pay', {
      order_id: body.razorpay.order_id,
      outcome: 'success',
      webhooks: false,
    })
    await verify(cookie, paid.response)
    const used = await payload.findByID({
      collection: 'coupons',
      id: percent.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(used.redemptions).toBe(1)
    expect(await quote(percent.code)).toEqual({ error: 'coupon', reason: 'used_up' })
  })
})
