/**
 * Phase 9 store operations against a real database (spec §11.6, §11.7, §10): the Owner's refund
 * endpoint and refunds from Razorpay's dashboard, credit notes (numbers, GST splits that add up to
 * the invoice), license revocation and suspension with their emails, failed refunds, disputes,
 * duplicate payments, and the license and invoice admin actions with their roles. Razorpay is the
 * development stand-in gateway, called in-process, as in store.test.ts.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  createLocalReq,
  getPayload,
  type Payload,
  type PayloadHandler,
  type SendEmailOptions,
} from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Invoice, Order, User } from '@/payload-types'
import config from '@/payload.config'

// after() work waits for settled(), as it waits for the response (and its commit) in Next.
const pending: (() => unknown)[] = []
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => void pending.push(fn),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const createRoute = (await import('@/app/api/v1/checkout/create/route')).POST
const verifyRoute = (await import('@/app/api/v1/checkout/verify/route')).POST
const webhookRoute = (await import('@/app/api/v1/webhooks/razorpay/route')).POST
const gateway = await import('@/app/api/v1/dev/razorpay/[...path]/route')
const { createSession, SESSION_COOKIE } = await import('@/lib/account/session')
const { findOrCreateCustomer } = await import('@/lib/account/otp')
const { DEV_GATEWAY, hmacHex } = await import('@/lib/commerce/razorpay')
const { sendPendingStatusEmails } = await import('@/lib/licensing/deliver')
const { financialYear } = await import('@/lib/invoices/numbering')
const { SITE_URL } = await import('@/lib/seo')

let payload: Payload
const run = `rf${Date.now()}`
const email = (name: string) => `${name}.${run}@example.test`
let ipCounter = 0
const nextIp = () => `198.51.102.${++ipCounter % 250}`
const sent: SendEmailOptions[] = []
const telegrams: string[] = []
const ids: { product?: number; plan?: number; users: number[] } = { users: [] }
const restore: (() => Promise<unknown>)[] = []
const users: Record<'owner' | 'support' | 'editor', User> = {} as never
const db = () => (payload.db as unknown as PostgresAdapter).drizzle
const fy = financialYear(new Date()).slice(2)

/** Waits for after() work, including work that queues more after() work. */
const settled = async () => {
  while (pending.length) await Promise.all(pending.splice(0).map((fn) => fn()))
}

function request(path: string, { body, cookie }: { body?: unknown; cookie?: string } = {}) {
  return new Request(`${SITE_URL}${path}`, {
    method: 'POST',
    headers: {
      'cf-connecting-ip': nextIp(),
      'content-type': 'application/json',
      ...(cookie && { cookie }),
    },
    body: JSON.stringify(body ?? {}),
  })
}

/** The stand-in gateway's test routes. */
const gw = async (path: string, body: object) => {
  const res = await gateway.POST(request(`/api/v1/dev/razorpay/${path}`, { body }), {
    params: Promise.resolve({ path: path.split('/') }),
  })
  return res.json()
}

let sends = 0
/** A webhook as Razorpay signs it, under a new event id (a redelivery under another id). */
const send = (event: string, entities: object) => {
  const raw = JSON.stringify({ entity: 'event', event, payload: entities, created_at: 0 })
  return webhookRoute(
    new Request(`${SITE_URL}/api/v1/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'x-razorpay-signature': hmacHex(DEV_GATEWAY.webhookSecret, raw),
        'x-razorpay-event-id': `evt_dev${run}${++sends}`,
      },
      body: raw,
    }),
  )
}

/** The body of a webhook the gateway sent, to send it again. */
const delivered = async (event: string, refundOrDisputeId: string) => {
  const { docs } = await payload.find({
    collection: 'webhook-events',
    where: { event: { equals: event } },
    sort: '-receivedAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  const doc = docs.find((d) => JSON.stringify(d.payload).includes(refundOrDisputeId))
  expect(doc, `${event} for ${refundOrDisputeId}`).toBeTruthy()
  return doc!
}

/** A customer buys the test product; the payment, invoice and order email all go through. */
async function buy(name: string, billing: object = {}) {
  const customer = await findOrCreateCustomer(payload, email(name), 'en')
  const cookie = `${SESSION_COOKIE}=${await createSession(payload, customer.id, 'test')}`
  const created = await createRoute(
    request('/api/v1/checkout/create', {
      cookie,
      body: {
        product: `${run}-app`,
        plan: 'pro',
        coupon: '',
        billing: {
          name: 'Priya Sharma',
          phone: '',
          state: '23',
          businessName: '',
          gstin: '',
          ...billing,
        },
        accept: true,
        locale: 'en',
      },
    }),
  )
  const body = await created.json()
  expect(created.status, JSON.stringify(body)).toBe(200)
  const paid = await gw('pay', {
    order_id: body.razorpay.order_id,
    outcome: 'success',
    webhooks: false,
  })
  await verifyRoute(request('/api/v1/checkout/verify', { cookie, body: paid.response }))
  await settled()
  const order = await orderById(
    (
      await payload.find({
        collection: 'orders',
        where: { orderNumber: { equals: body.order.number } },
        depth: 0,
        overrideAccess: true,
      })
    ).docs[0]!.id,
  )
  expect(order.status).toBe('paid')
  sent.length = 0
  telegrams.length = 0
  return { order, cookie, paymentId: paid.response.razorpay_payment_id as string }
}

const orderById = (id: number) =>
  payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true }) as Promise<Order>

const invoiceOf = async (order: Order) =>
  payload.findByID({
    collection: 'invoices',
    id: order.invoice as number,
    depth: 0,
    overrideAccess: true,
  })

const creditNotes = async (orderId: number) =>
  (
    await payload.find({
      collection: 'invoices',
      where: { and: [{ order: { equals: orderId } }, { kind: { equals: 'credit-note' } }] },
      sort: 'id',
      depth: 0,
      overrideAccess: true,
    })
  ).docs

const licenseOf = async (orderId: number) =>
  (
    await payload.find({
      collection: 'licenses',
      where: { order: { equals: orderId } },
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]!

const eventTypes = (order: Order) => (order.events as { type: string }[]).map((e) => e.type)
const mailsTo = (order: Order, subject: RegExp) =>
  sent.filter((m) => m.to === order.billing.email && subject.test(String(m.subject)))

/** An admin endpoint's handler, as Payload's REST route would call it. */
const handler = (slug: 'orders' | 'licenses' | 'invoices', path: string): PayloadHandler =>
  payload.collections[slug].config.endpoints
    ? payload.collections[slug].config.endpoints.find((e) => e.path === path)!.handler
    : (() => {
        throw new Error(`No ${path} endpoint on ${slug}`)
      })()

async function call(
  slug: 'orders' | 'licenses' | 'invoices',
  path: string,
  id: number,
  user: User | null,
  data: object = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const req = await createLocalReq(user ? { user: { ...user, collection: 'users' } } : {}, payload)
  req.routeParams = { id: String(id) }
  req.data = data
  try {
    const res = await handler(slug, path)(req)
    return { status: res.status, body: await res.json() }
  } catch (error) {
    const { status, message } = error as { status?: number; message: string }
    return { status: status ?? 500, body: { errors: [{ message }] } }
  }
}
const refund = (orderId: number, data: object, user: User | null = users.owner) =>
  call('orders', '/:id/refund', orderId, user, data)

/** Field by field, the credit notes add up to the invoice. */
const sums = (notes: Invoice[]) =>
  Object.fromEntries(
    (['subtotal', 'discount', 'taxable', 'cgst', 'sgst', 'igst', 'total'] as const).map((f) => [
      f,
      notes.reduce((n, note) => n + note.totals[f], 0),
    ]),
  )

/** Site settings in SQL: other suites leave values there that a full validation would refuse. */
async function setSite(storeEnabled: boolean, gstin: string | null) {
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

async function setCommerce(data: Record<string, unknown>) {
  const before = await payload.findGlobal({
    slug: 'commerce-settings',
    depth: 0,
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'commerce-settings',
    data,
    depth: 0,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  restore.push(() =>
    payload.updateGlobal({
      slug: 'commerce-settings',
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

  // The credit note series starts at 1 for the first assertion; a crashed run may have left some.
  await db().execute(sql`DELETE FROM invoices WHERE kind = 'credit-note' AND number LIKE 'JC/%'`)
  await db().execute(sql`DELETE FROM invoice_counters WHERE series IN ('JC', 'JU')`)
  await setSite(true, null)
  await setCommerce({
    currentTermsVersion: '1.0',
    currentEulaVersion: '1.0',
    gstEnabled: false,
    invoicePrefix: 'JU',
    creditNotePrefix: 'JC',
  })
  const product = await payload.create({
    collection: 'products',
    data: {
      name: 'Refund test',
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
  for (const role of ['owner', 'support', 'editor'] as const) {
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password: `pw-${run}-${role}`, roles: [role] },
      overrideAccess: true,
    })
    ids.users.push(users[role].id)
  }
})

beforeEach(async () => {
  await settled()
  sent.length = 0
  telegrams.length = 0
  await db()
    .execute(sql`DELETE FROM rate_limit.hits`)
    .catch(() => undefined)
})

afterAll(async () => {
  await settled()
  vi.unstubAllGlobals()
  const customers = await payload.find({
    collection: 'customers',
    where: { email: { like: run } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const customerIds = customers.docs.map((c) => c.id)
  if (customerIds.length) {
    const { docs: orders } = await payload.find({
      collection: 'orders',
      where: { customer: { in: customerIds } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    const orderIds = orders.map((o) => o.id)
    if (orderIds.length) {
      const { docs: invoices } = await payload.find({
        collection: 'invoices',
        where: { order: { in: orderIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      const pdfs = invoices.flatMap((i) =>
        i.pdf ? [typeof i.pdf === 'object' ? i.pdf.id : i.pdf] : [],
      )
      // Through the Local API, so the stored files go too.
      if (pdfs.length) {
        await payload.delete({
          collection: 'private-files',
          where: { id: { in: pdfs } },
          overrideAccess: true,
        })
      }
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
  await db().execute(sql`DELETE FROM invoice_counters WHERE series IN ('JC', 'JU')`)
  await db().execute(sql`DELETE FROM payload_jobs`)
  await db().execute(sql`DELETE FROM webhook_events WHERE event_id LIKE 'evt_dev%'`)
  for (const id of ids.users)
    await payload.delete({ collection: 'users', id, overrideAccess: true })
  if (ids.plan) await payload.delete({ collection: 'plans', id: ids.plan, overrideAccess: true })
  if (ids.product)
    await payload.delete({ collection: 'products', id: ids.product, overrideAccess: true })
  for (const undo of restore.reverse()) await undo()
})

describe('refunds (spec §11.6)', () => {
  it('refunds part of an order from the admin, then the rest, with credit notes that add up', async () => {
    const { order } = await buy('partial')
    const invoice = await invoiceOf(order)

    const first = await refund(order.id, {
      amount: 40_000,
      reason: '  Asked for a partial refund ',
    })
    expect(first).toMatchObject({
      status: 200,
      body: { ok: true, refund: { amount: 40_000, status: 'processed' } },
    })
    const firstId = (first.body.refund as { id: string }).id
    // Nothing changes until Razorpay's webhook arrives: the request is recorded with its reason.
    const asked = await orderById(order.id)
    expect(asked.status).toBe('paid')
    expect(asked.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'refund-requested',
          source: 'admin',
          refundId: firstId,
          amount: 40_000,
          by: users.owner.id,
          detail: `${firstId}: 40000 paise: Asked for a partial refund`,
        }),
      ]),
    )
    await settled()

    let fresh = await orderById(order.id)
    expect(fresh).toMatchObject({ status: 'partially-refunded', amountRefunded: 40_000 })
    const [note] = await creditNotes(order.id)
    expect(note).toMatchObject({
      number: `JC/${fy}/00001`,
      kind: 'credit-note',
      originalInvoice: invoice.id,
      razorpayRefundId: firstId,
      taxMode: 'none',
      seller: invoice.seller,
      buyer: invoice.buyer,
      totals: {
        subtotal: 40_000,
        discount: 0,
        taxable: 40_000,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 40_000,
      },
    })
    expect(note!.lines[0]!.description).toBe(`Refund: ${invoice.lines[0]!.description}`)
    expect(note!.pdf).toBeTruthy()
    expect(note!.emailedAt).toBeTruthy()
    expect(fresh.creditNotes).toEqual([note!.id])
    expect((await licenseOf(order.id)).status).toBe('active')
    const [mail, ...more] = mailsTo(order, /^Refund for order/)
    expect(more).toHaveLength(0)
    expect(mail!.attachments).toEqual([
      expect.objectContaining({ filename: `JC-${fy}-00001.pdf`, contentType: 'application/pdf' }),
    ])
    expect(mail!.text).toContain('₹400')
    expect(mail!.text).not.toContain('revoked')

    // More than is left is refused before Razorpay is asked.
    expect(await refund(order.id, { amount: 60_000, reason: 'Too much' })).toMatchObject({
      status: 400,
      body: { errors: [{ message: 'At most ₹599 can be refunded.' }] },
    })
    expect(await refund(order.id, { reason: 'x' })).toMatchObject({ status: 400 })

    // The rest ("Full refund"): the order is refunded and the license revoked.
    sent.length = 0
    const second = await refund(order.id, { reason: 'Refund the rest' })
    expect(second.body.refund).toMatchObject({ amount: 59_900 })
    const secondId = (second.body.refund as { id: string }).id
    await settled()
    fresh = await orderById(order.id)
    expect(fresh).toMatchObject({ status: 'refunded', amountRefunded: 99_900 })
    const notes = await creditNotes(order.id)
    expect(notes.map((n) => n.number)).toEqual([`JC/${fy}/00001`, `JC/${fy}/00002`])
    expect(sums(notes)).toEqual(invoice.totals)
    expect(fresh.creditNotes).toEqual(notes.map((n) => n.id))
    const license = await licenseOf(order.id)
    expect(license).toMatchObject({ status: 'revoked', statusNotifiedAs: 'revoked' })
    const full = mailsTo(order, /^Refund for order/)
    expect(full).toHaveLength(1)
    expect(full[0]!.text).toContain('in full')
    expect(full[0]!.text).toContain('revoked')
    // The refund email said it: no separate revoked email, now or from the sweep.
    await sendPendingStatusEmails()
    expect(mailsTo(order, /license/i)).toHaveLength(0)

    // Redelivered, under the same or another event id: nothing new.
    const event = await delivered('refund.processed', secondId)
    await gw('replay', { event_id: event.eventId })
    expect(
      (await send('refund.processed', (event.payload as { payload: object }).payload)).status,
    ).toBe(200)
    await settled()
    expect(await creditNotes(order.id)).toHaveLength(2)
    expect(await orderById(order.id)).toMatchObject({
      amountRefunded: 99_900,
      events: fresh.events,
    })
    expect(sent).toHaveLength(1)

    expect(await refund(order.id, { reason: 'Once more' })).toMatchObject({
      status: 409,
      body: { errors: [{ message: 'A refunded order can’t be refunded.' }] },
    })
  })

  it('takes a refund made in the Razorpay dashboard the same way', async () => {
    const { order, paymentId } = await buy('dashboard')
    const invoice = await invoiceOf(order)
    const made = await gw('refund', { payment_id: paymentId, amount: 99_900, outcome: 'processed' })
    await settled()
    const fresh = await orderById(order.id)
    expect(fresh).toMatchObject({ status: 'refunded', amountRefunded: 99_900 })
    expect(eventTypes(fresh)).not.toContain('refund-requested')
    expect(eventTypes(fresh)).toEqual(
      expect.arrayContaining(['refund.created', 'refund-processed']),
    )
    const [note, ...more] = await creditNotes(order.id)
    expect(more).toHaveLength(0)
    expect(note).toMatchObject({ razorpayRefundId: made.refund.id, originalInvoice: invoice.id })
    expect(note!.totals).toEqual(invoice.totals)
    expect((await licenseOf(order.id)).status).toBe('revoked')
    expect(mailsTo(order, /^Refund for order/)).toHaveLength(1)
  })

  it('alerts on a failed refund and issues nothing', async () => {
    const { order, paymentId } = await buy('failed')
    const made = await gw('refund', { payment_id: paymentId, amount: 10_000, outcome: 'failed' })
    await settled()
    const fresh = await orderById(order.id)
    expect(fresh).toMatchObject({ status: 'paid', amountRefunded: 0 })
    expect(eventTypes(fresh)).toContain('refund.failed')
    expect(await creditNotes(order.id)).toHaveLength(0)
    expect(telegrams).toEqual([
      `Refund ${made.refund.id} for order ${order.orderNumber} failed.\n${SITE_URL}/admin/collections/orders/${order.id}`,
    ])
    expect(sent).toHaveLength(0)
    expect((await licenseOf(order.id)).status).toBe('active')
  })

  it('refunds a duplicate payment with one click, without a credit note', async () => {
    const { order } = await buy('twice')
    const second = await gw('pay', { order_id: order.razorpayOrderId, outcome: 'success' })
    await settled()
    const duplicate = second.response.razorpay_payment_id as string
    expect((await orderById(order.id)).flags).toEqual(['paid-twice'])
    telegrams.length = 0

    // Only this order's own payments.
    expect(
      await refund(order.id, { paymentId: 'pay_devnotours', reason: 'Duplicate' }),
    ).toMatchObject({
      status: 400,
    })
    const res = await refund(order.id, { paymentId: duplicate, reason: 'Duplicate payment' })
    expect(res).toMatchObject({ status: 200, body: { refund: { amount: 99_900 } } })
    await settled()
    const fresh = await orderById(order.id)
    expect(fresh).toMatchObject({ status: 'paid', amountRefunded: 0, flags: [] })
    expect(eventTypes(fresh)).toEqual(
      expect.arrayContaining(['duplicate-refunded', 'duplicate-refund-emailed']),
    )
    expect(await creditNotes(order.id)).toHaveLength(0)
    expect((await licenseOf(order.id)).status).toBe('active')
    expect(mailsTo(order, /duplicate payment/)).toHaveLength(1)

    const refundId = (res.body.refund as { id: string }).id
    const event = await delivered('refund.processed', refundId)
    await send('refund.processed', (event.payload as { payload: object }).payload)
    await settled()
    expect(mailsTo(order, /duplicate payment/)).toHaveLength(1)
    expect(await refund(order.id, { paymentId: duplicate, reason: 'Again' })).toMatchObject({
      status: 409,
    })
  })
})

describe('disputes (spec §11.6)', () => {
  it('marks the order disputed, suspends the license and emails once; later stages only alert', async () => {
    const { order, paymentId } = await buy('dispute')
    const opened = await gw('dispute', { payment_id: paymentId, reason_code: 'fraudulent' })
    await settled()
    let fresh = await orderById(order.id)
    expect(fresh.status).toBe('disputed')
    const license = await licenseOf(order.id)
    expect(license).toMatchObject({ status: 'suspended', statusNotifiedAs: 'suspended' })
    expect(mailsTo(order, /license is suspended/)).toHaveLength(1)
    expect(telegrams).toHaveLength(1)
    expect(telegrams[0]).toMatch(
      new RegExp(
        `^Payment dispute ${opened.dispute.id} on order ${order.orderNumber} \\(fraudulent\\), respond by \\d{1,2} \\w{3} \\d{4}\\. The order is disputed and its license suspended\\.`,
      ),
    )

    const event = await delivered('payment.dispute.created', opened.dispute.id)
    await send('payment.dispute.created', (event.payload as { payload: object }).payload)
    await settled()
    expect(mailsTo(order, /license/)).toHaveLength(1)
    expect(telegrams).toHaveLength(1)

    await gw('dispute', { payment_id: paymentId, dispute_id: opened.dispute.id, event: 'won' })
    await settled()
    fresh = await orderById(order.id)
    expect(fresh.status).toBe('disputed')
    expect(eventTypes(fresh)).toContain('payment.dispute.won')
    expect((await licenseOf(order.id)).status).toBe('suspended')
    expect(telegrams[1]).toContain(`on order ${order.orderNumber}: won. Nothing changes by itself`)
    expect(sent).toHaveLength(1)
  })
})

describe('admin actions (spec §10, §9.3)', () => {
  it('lets only the Owner refund and re-render, and refuses anonymous calls', async () => {
    const { order } = await buy('roles')
    for (const user of [users.support, users.editor, null]) {
      expect((await refund(order.id, { reason: 'Not allowed' }, user)).status).toBe(403)
      expect(
        (await call('invoices', '/:id/render-pdf', order.invoice as number, user)).status,
      ).toBe(403)
    }
    const license = await licenseOf(order.id)
    expect((await call('licenses', '/:id/resend-email', license.id, users.editor)).status).toBe(403)
    expect((await call('licenses', '/:id/resend-email', license.id, null)).status).toBe(403)
    expect((await orderById(order.id)).status).toBe('paid')
    // Payload runs the first endpoint that matches: ours come before its own /:id routes.
    for (const [slug, path] of [
      ['orders', '/:id/refund'],
      ['licenses', '/:id/resend-email'],
      ['invoices', '/:id/render-pdf'],
    ] as const) {
      const paths = payload.collections[slug].config.endpoints || []
      expect(paths.findIndex((e) => e.path === path)).toBeGreaterThanOrEqual(0)
      expect(paths.findIndex((e) => e.path === path)).toBeLessThan(
        paths.findIndex((e) => e.path === '/:id'),
      )
    }
  })

  it('lets Support resend the license email, with the key', async () => {
    const { order } = await buy('resend')
    const license = await licenseOf(order.id)
    const res = await call('licenses', '/:id/resend-email', license.id, users.support)
    expect(res).toEqual({ status: 200, body: { ok: true } })
    await settled()
    const [mail, ...more] = mailsTo(order, /license key/)
    expect(more).toHaveLength(0)
    expect(mail!.text).toContain(license.licenseKey)
    // Again: each request sends one more.
    await call('licenses', '/:id/resend-email', license.id, users.owner)
    await settled()
    expect(mailsTo(order, /license key/)).toHaveLength(2)
  })

  it('re-renders an invoice PDF under the same number and replaces the stored file', async () => {
    const { order } = await buy('rerender')
    const before = await invoiceOf(order)
    const oldPdf = before.pdf as number
    expect(oldPdf).toBeTruthy()
    const res = await call('invoices', '/:id/render-pdf', before.id, users.owner)
    expect(res).toMatchObject({ status: 200, body: { ok: true } })
    const after = await invoiceOf(order)
    expect(after.pdf).toBe(res.body.pdf)
    expect(after.pdf).not.toBe(oldPdf)
    expect(after.number).toBe(before.number)
    expect(after.totals).toEqual(before.totals)
    await expect(
      payload.findByID({ collection: 'private-files', id: oldPdf, overrideAccess: true }),
    ).rejects.toThrow()
  })

  it('emails a suspension by Support once, and again after a reinstatement', async () => {
    const { order } = await buy('suspend')
    const { id } = await licenseOf(order.id)
    const asSupport = (status: 'active' | 'suspended') =>
      payload.update({
        collection: 'licenses',
        id,
        data: { status },
        user: { ...users.support, collection: 'users' },
        overrideAccess: false,
        depth: 0,
      })
    await asSupport('suspended')
    await settled()
    await sendPendingStatusEmails()
    expect(mailsTo(order, /license is suspended/)).toHaveLength(1)
    await asSupport('active')
    await settled()
    expect((await licenseOf(order.id)).statusNotifiedAs).toBeFalsy()
    expect(mailsTo(order, /license/)).toHaveLength(1)
    await asSupport('suspended')
    await settled()
    expect(mailsTo(order, /license is suspended/)).toHaveLength(2)
  })

  it('sends a status email the request couldn’t send from the sweep', async () => {
    const { order } = await buy('sweep')
    const { id } = await licenseOf(order.id)
    // As a job or script would: no request, so nothing runs after it.
    await db().execute(sql`UPDATE licenses SET status = 'suspended' WHERE id = ${id}`)
    await sendPendingStatusEmails()
    expect(mailsTo(order, /license is suspended/)).toHaveLength(1)
    await sendPendingStatusEmails()
    expect(mailsTo(order, /license/)).toHaveLength(1)
  })
})

describe('credit notes with GST (spec §11.4)', () => {
  beforeAll(async () => {
    await setSite(true, '23AAACJ1234A1ZJ')
    await setCommerce({ gstEnabled: true, gstRatePercent: 18, sacCode: '998431' })
  })

  it('splits CGST and SGST at home, from the invoice, and the notes add up to it', async () => {
    const { order, paymentId } = await buy('gsthome')
    const invoice = await invoiceOf(order)
    expect(invoice).toMatchObject({
      taxMode: 'cgst_sgst',
      totals: { taxable: 84_661, cgst: 7_620 },
    })
    // Settings change later; a credit note follows the invoice as issued.
    await setCommerce({ gstRatePercent: 12 })
    await refund(order.id, { amount: 50_000, reason: 'Half back' })
    await settled()
    const [half] = await creditNotes(order.id)
    expect(half).toMatchObject({
      taxMode: 'cgst_sgst',
      sacCode: '998431',
      totals: { taxable: 42_373, cgst: 3_814, sgst: 3_813, igst: 0, total: 50_000 },
    })
    expect(half!.lines[0]).toMatchObject({ ratePercent: 18, total: 50_000 })
    await gw('refund', { payment_id: paymentId, amount: 49_900, outcome: 'processed' })
    await settled()
    const notes = await creditNotes(order.id)
    expect(notes[1]!.totals).toEqual({
      subtotal: 49_900,
      discount: 0,
      taxable: 42_288,
      cgst: 3_806,
      sgst: 3_806,
      igst: 0,
      total: 49_900,
    })
    expect(sums(notes)).toEqual(invoice.totals)
    await setCommerce({ gstRatePercent: 18 })
  })

  it('charges IGST back to another state', async () => {
    const { order } = await buy('gstother', { state: '27' })
    expect((await invoiceOf(order)).taxMode).toBe('igst')
    await refund(order.id, { amount: 30_000, reason: 'Part back' })
    await settled()
    const [note] = await creditNotes(order.id)
    expect(note).toMatchObject({
      taxMode: 'igst',
      buyer: { stateCode: '27' },
      totals: { taxable: 25_424, cgst: 0, sgst: 0, igst: 4_576, total: 30_000 },
    })
  })

  it('splits the last note’s CGST and SGST again after several small refunds', async () => {
    const { order, paymentId } = await buy('gstsmall')
    const invoice = await invoiceOf(order)
    for (let i = 0; i < 4; i++) {
      await gw('refund', { payment_id: paymentId, amount: 100, outcome: 'processed' })
      await settled()
    }
    await refund(order.id, { reason: 'The rest' })
    await settled()
    const notes = await creditNotes(order.id)
    expect(notes).toHaveLength(5)
    expect(notes[0]!.totals).toMatchObject({ taxable: 85, cgst: 8, sgst: 7, total: 100 })
    // Left as the sums would leave it: CGST 7,588, SGST 7,591.
    expect(notes[4]!.totals).toMatchObject({ cgst: 7_590, sgst: 7_589, total: 99_500 })
    for (const { totals } of notes) {
      expect(totals.cgst).toBe(Math.ceil((totals.cgst + totals.sgst) / 2))
    }
    const total = sums(notes)
    expect(total).toMatchObject({
      subtotal: invoice.totals.subtotal,
      discount: invoice.totals.discount,
      taxable: invoice.totals.taxable,
      total: invoice.totals.total,
    })
    expect(total.cgst! + total.sgst!).toBe(invoice.totals.cgst + invoice.totals.sgst)
  })

  it('credits prices before GST from the taxable value, never below zero', async () => {
    await setCommerce({ pricesIncludeGst: false })
    const { order } = await buy('gstplus')
    const invoice = await invoiceOf(order)
    expect(invoice.totals).toMatchObject({ subtotal: 99_900, taxable: 99_900, total: 117_882 })
    // More than the subtotal before tax: the rest's subtotal would go negative.
    await refund(order.id, { amount: 100_000, reason: 'Most of it back' })
    await settled()
    await refund(order.id, { reason: 'The rest' })
    await settled()
    const notes = await creditNotes(order.id)
    expect(notes).toHaveLength(2)
    expect(notes[0]!.totals).toMatchObject({ subtotal: 84_746, taxable: 84_746, total: 100_000 })
    for (const note of notes) {
      for (const value of Object.values(note.totals)) expect(value).toBeGreaterThanOrEqual(0)
      const line = note.lines[0]!
      expect(line.unitPrice - line.discount).toBe(note.totals.taxable)
    }
    expect(sums(notes)).toEqual(invoice.totals)
    await setCommerce({ pricesIncludeGst: true })
  })
})
