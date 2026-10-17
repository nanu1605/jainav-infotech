import 'server-only'

import { randomInt } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { after } from 'next/server'
import type { Payload } from 'payload'

import { getClient } from '@/lib/cms'
import { licensingConfig } from '@/lib/licensing/keys'
import { clientIp, hashIp, limit } from '@/lib/rateLimit'
import { gstinState } from '@/lib/tax/gstin'
import { GST_STATES, type StateCode } from '@/lib/tax/states'
import type { Coupon, Customer, Order } from '@/payload-types'

import { addOrderEvent, checkPayment, fulfilOrder, runQueuedJobs } from './fulfil'
import { errorCode, json, readJson, requestCustomer, sameOrigin, tooMany } from './http'
import { couponProblem, MIN_TOTAL, quote, type CouponProblem, type Quote } from './pricing'
import {
  createRazorpayOrder,
  fetchPayment,
  paymentSignatureValid,
  RazorpayError,
  razorpayConfig,
} from './razorpay'
import {
  createSchema,
  quoteSchema,
  verifySchema,
  type CheckoutOptions,
  type QuoteView,
} from './schemas'
import {
  findPurchasable,
  getCommerceSettings,
  storeOpen,
  taxSettings,
  type Purchasable,
} from './store'

/** Statuses that count as a use of a coupon (per-customer limit, spec §11.5). */
const REDEEMED: Order['status'][] = ['paid', 'refunded', 'partially-refunded', 'disputed']
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Order numbers like JO-7K2QDM9X: 40 random bits, so they reveal nothing about volume. */
export const newOrderNumber = () =>
  `JO-${Array.from({ length: 8 }, () => CROCKFORD[randomInt(32)]).join('')}`

type Guarded = { customer: Customer; payload: Payload }

/** Same origin, store open, within the rate limits, signed in. */
async function guard(req: Request, { checkout = false } = {}): Promise<Guarded | Response> {
  if (!sameOrigin(req)) return json(403, { error: 'invalid' })
  if (!(await storeOpen())) return json(404, { error: 'notFound' })
  const wait = await limit('storeIp', clientIp(req.headers))
  if (wait) return tooMany(wait)
  const customer = await requestCustomer(req)
  if (!customer) return json(401, { error: 'signedOut' })
  if (checkout) {
    const busy = await limit('checkoutCustomer', String(customer.id))
    if (busy) return tooMany(busy)
  }
  return { customer, payload: await getClient() }
}

/** The coupon for a code, if it can be used on this purchase by this customer. */
async function findCoupon(
  payload: Payload,
  code: string,
  { product, plan }: Purchasable,
  customer: Customer,
): Promise<{ coupon: Coupon } | { problem: CouponProblem }> {
  const { docs } = await payload.find({
    collection: 'coupons',
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const coupon = docs[0]
  if (!coupon) return { problem: 'invalid' }
  const problem = couponProblem(coupon, { productId: product.id, planId: plan.id })
  if (problem) return { problem }
  if (coupon.perCustomerLimit != null) {
    const { totalDocs } = await payload.count({
      collection: 'orders',
      where: {
        and: [
          { customer: { equals: customer.id } },
          { coupon: { equals: coupon.id } },
          { status: { in: REDEEMED } },
        ],
      },
      overrideAccess: true,
    })
    if (totalDocs >= coupon.perCustomerLimit) return { problem: 'used_up' }
  }
  return { coupon }
}

type Priced = { quote: Quote; coupon: Coupon | null; state: StateCode }

/** Price, discount and tax for a purchase (spec §11.3 step 3, §11.4, §11.5). */
async function price(
  payload: Payload,
  purchasable: Purchasable,
  customer: Customer,
  input: { coupon: string; state: StateCode; gstin: string },
): Promise<Priced | { problem: CouponProblem }> {
  const settings = await getCommerceSettings(payload)
  // A GSTIN fixes the place of supply (spec §11.4).
  const state = (input.gstin && gstinState(input.gstin)) || input.state
  let coupon: Coupon | null = null
  if (input.coupon) {
    const found = await findCoupon(payload, input.coupon, purchasable, customer)
    if ('problem' in found) return found
    coupon = found.coupon
  }
  const result = quote(purchasable.plan.priceINR!, coupon, state, taxSettings(settings))
  if (coupon && result.total < MIN_TOTAL) return { problem: 'too_large' }
  return { quote: result, coupon, state }
}

const view = ({ quote: q, coupon }: Priced): QuoteView => ({
  subtotal: q.subtotal,
  discount: q.discount,
  taxable: q.tax.taxable,
  cgst: q.tax.cgst,
  sgst: q.tax.sgst,
  igst: q.tax.igst,
  total: q.total,
  mode: q.tax.mode,
  ratePercent: q.tax.ratePercent,
  coupon: coupon?.code ?? null,
})

/** POST /api/v1/checkout/quote: the price breakdown as the form changes. */
export async function quoteHandler(req: Request) {
  const guarded = await guard(req)
  if (guarded instanceof Response) return guarded
  const { payload, customer } = guarded
  const parsed = quoteSchema.safeParse(await readJson(req))
  if (!parsed.success) return json(400, { error: 'invalid' })
  const { product, plan, ...input } = parsed.data
  const purchasable = await findPurchasable(payload, product, plan)
  if (!purchasable) return json(409, { error: 'unavailable' })
  const priced = await price(
    payload,
    purchasable,
    customer,
    input as typeof input & { state: StateCode },
  )
  if ('problem' in priced) return json(400, { error: 'coupon', reason: priced.problem })
  return json(200, { ok: true, quote: view(priced) })
}

/**
 * POST /api/v1/checkout/create (spec §11.3 step 3): validate, price, record the order with the
 * customer's acceptance of the current Terms and EULA, then open a Razorpay order for it.
 */
export async function createHandler(req: Request) {
  const guarded = await guard(req, { checkout: true })
  if (guarded instanceof Response) return guarded
  const { payload, customer } = guarded
  const parsed = createSchema.safeParse(await readJson(req))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return json(400, { error: 'invalid', field: issue?.path.join('.') ?? '' })
  }
  const { product: productSlug, plan: planCode, coupon: code, billing, locale } = parsed.data
  const cfg = razorpayConfig()
  const [settings, site] = await Promise.all([
    getCommerceSettings(payload),
    payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }),
  ])
  // A tax invoice must name the seller's GSTIN (spec §11.4), and site settings could lose it
  // after GST was turned on.
  const gstReady = !settings.gstEnabled || Boolean(site.company?.gstin)
  // Fulfilment creates the license: without the licensing keys a payment could not be fulfilled.
  const licensing = licensingConfig()
  if (
    !cfg ||
    !licensing ||
    !settings.currentTermsVersion ||
    !settings.currentEulaVersion ||
    !gstReady
  ) {
    console.error(
      'checkout: unavailable: set the Razorpay and licensing keys, the current Terms and EULA versions and, with GST on, the company GSTIN.',
    )
    return json(409, { error: 'unavailable' })
  }
  // English names for the invoice description; the visitor's language for the checkout modal.
  const [purchasable, shown] = await Promise.all([
    findPurchasable(payload, productSlug, planCode, 'en'),
    findPurchasable(payload, productSlug, planCode, locale),
  ])
  if (!purchasable || !shown) return json(409, { error: 'unavailable' })
  const priced = await price(payload, purchasable, customer, {
    coupon: code,
    state: billing.state as StateCode,
    gstin: billing.gstin,
  })
  if ('problem' in priced) return json(400, { error: 'coupon', reason: priced.problem })
  const { quote: q, coupon, state } = priced
  const { product, plan } = purchasable
  const now = new Date().toISOString()

  const order = await payload.create({
    collection: 'orders',
    data: {
      orderNumber: newOrderNumber(),
      customer: customer.id,
      status: 'created',
      locale,
      items: [
        {
          product: product.id,
          plan: plan.id,
          qty: 1,
          unitPrice: plan.priceINR!,
          description: `${product.name} ${plan.name} license`,
        },
      ],
      currency: 'INR',
      subtotal: q.subtotal,
      discount: q.discount,
      total: q.total,
      amountRefunded: 0,
      coupon: coupon?.id,
      tax: {
        mode: q.tax.mode,
        ratePercent: q.tax.ratePercent,
        taxable: q.tax.taxable,
        cgst: q.tax.cgst,
        sgst: q.tax.sgst,
        igst: q.tax.igst,
      },
      billing: {
        name: billing.name,
        email: customer.email,
        phone: billing.phone || null,
        country: 'IN',
        stateCode: state,
        stateName: GST_STATES[state],
        businessName: billing.businessName || null,
        gstin: billing.gstin || null,
      },
      acceptance: {
        termsVersion: settings.currentTermsVersion,
        eulaVersion: settings.currentEulaVersion,
        at: now,
        ipHash: hashIp(clientIp(req.headers)),
      },
      events: [{ at: now, type: 'created' }],
    },
    overrideAccess: true,
    depth: 0,
  })

  let razorpayOrderId: string
  try {
    const rzp = await createRazorpayOrder(cfg, {
      amount: q.total,
      receipt: order.orderNumber,
      notes: { order: order.orderNumber },
    })
    razorpayOrderId = rzp.id
  } catch (error) {
    const reason = error instanceof RazorpayError ? error.message : errorCode(error)
    console.error(`checkout: Razorpay order for ${order.id} failed: ${reason}`)
    await addOrderEvent(payload, order.id, { type: 'gateway-error', detail: reason })
    return json(502, { error: 'server' })
  }
  await (payload.db as unknown as PostgresAdapter).drizzle.execute(
    sql`UPDATE orders SET razorpay_order_id = ${razorpayOrderId}, updated_at = now() WHERE id = ${order.id}`,
  )
  // Next time the form starts with these details. Best effort: the order is already open.
  await payload
    .update({
      collection: 'customers',
      id: customer.id,
      data: {
        name: billing.name,
        phone: billing.phone || null,
        state,
        businessName: billing.businessName || null,
        gstin: billing.gstin || null,
      },
      overrideAccess: true,
      depth: 0,
    })
    .catch((error) => console.error('checkout: profile not saved:', errorCode(error)))

  const razorpay: CheckoutOptions = {
    script: cfg.script,
    key: cfg.keyId,
    order_id: razorpayOrderId,
    amount: q.total,
    currency: 'INR',
    name: 'Jainav Infotech',
    description: `${shown.product.name} ${shown.plan.name}`,
    prefill: { name: billing.name, email: customer.email, contact: billing.phone },
    notes: { order: order.orderNumber },
  }
  return json(200, { ok: true, order: { number: order.orderNumber, total: q.total }, razorpay })
}

/**
 * POST /api/v1/checkout/verify (spec §11.3 step 5): Checkout's signature, then the payment as
 * Razorpay reports it, then fulfilment. Only the signed-in owner of the order may verify it.
 */
export async function verifyHandler(req: Request) {
  const guarded = await guard(req)
  if (guarded instanceof Response) return guarded
  const { payload, customer } = guarded
  const parsed = verifySchema.safeParse(await readJson(req))
  if (!parsed.success) return json(400, { error: 'invalid' })
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { razorpayOrderId: { equals: razorpay_order_id } },
        { customer: { equals: customer.id } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const order = docs[0]
  const cfg = razorpayConfig()
  if (!order || !cfg) return json(404, { error: 'notFound' })
  // The stored Razorpay order id, never the one the browser sent (they match by the query).
  if (
    !paymentSignatureValid(cfg, order.razorpayOrderId!, razorpay_payment_id, razorpay_signature)
  ) {
    await addOrderEvent(payload, order.id, {
      type: 'bad-signature',
      source: 'verify',
      paymentId: razorpay_payment_id,
    })
    return json(400, { error: 'mismatch' })
  }
  let check
  let paymentId: string
  try {
    const payment = await fetchPayment(cfg, razorpay_payment_id)
    check = checkPayment(order, payment)
    paymentId = payment.id
  } catch (error) {
    // Razorpay is unreachable: the webhook or reconciliation finishes the order.
    const reason = error instanceof RazorpayError ? error.message : errorCode(error)
    console.error(`checkout/verify: payment fetch for order ${order.id} failed: ${reason}`)
    return json(200, { ok: true, status: 'pending', order: order.orderNumber })
  }
  if (check === 'mismatch' || check === 'failed') {
    await addOrderEvent(payload, order.id, {
      type: check === 'failed' ? 'payment-failed' : 'payment-mismatch',
      source: 'verify',
      paymentId,
    })
    return json(400, { error: 'mismatch' })
  }
  if (check === 'pending')
    return json(200, { ok: true, status: 'pending', order: order.orderNumber })
  try {
    await fulfilOrder(payload, order.id, paymentId, 'verify')
  } catch (error) {
    // The payment is good: the webhook job or reconciliation retries the fulfilment.
    console.error(`checkout/verify: fulfilment of order ${order.id} failed: ${errorCode(error)}`)
    return json(200, { ok: true, status: 'pending', order: order.orderNumber })
  }
  after(() => runQueuedJobs(payload))
  return json(200, { ok: true, status: 'paid', order: order.orderNumber })
}

/** GET /api/v1/checkout/status?order=…: the success page's poller (owner only). */
export async function statusHandler(req: Request) {
  if (!(await storeOpen())) return json(404, { error: 'notFound' })
  const customer = await requestCustomer(req)
  if (!customer) return json(401, { error: 'signedOut' })
  const number = new URL(req.url).searchParams.get('order') ?? ''
  if (!/^JO-[0-9A-Z]{8}$/.test(number)) return json(404, { error: 'notFound' })
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ orderNumber: { equals: number } }, { customer: { equals: customer.id } }] },
    select: { status: true },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]
    ? json(200, { ok: true, status: docs[0].status })
    : json(404, { error: 'notFound' })
}
