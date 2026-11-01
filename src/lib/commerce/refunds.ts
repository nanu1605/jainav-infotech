import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  APIError,
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadHandler,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import { z } from 'zod'

import { duplicateRefundEmail, refundFailedEmail, type RenderedEmail } from '@/emails'
import { formatDate, formatINR } from '@/lib/format'
import { sendRefundEmail } from '@/lib/invoices/deliver'
import { financialYear } from '@/lib/invoices/numbering'
import { sendLicenseStatusEmail } from '@/lib/licensing/deliver'
import { inboxAddress, sendEmail, sendTelegram } from '@/lib/notify'
import { absoluteUrl, SITE_URL } from '@/lib/seo'
import { computeTax } from '@/lib/tax/gst'
import type { Invoice, Order } from '@/payload-types'

import { readBody, requireRole, routeId } from './adminEndpoint'
import { addOrderEvent, allocateNumber, type OrderEvent } from './fulfil'
import {
  createRefund,
  fetchPayment,
  RazorpayError,
  razorpayConfig,
  type RazorpayDispute,
  type RazorpayRefund,
} from './razorpay'
import { eventsOf, REFUNDABLE, refundState } from './refundState'
import { getCommerceSettings } from './store'

/**
 * Refunds and disputes (spec §11.6). The Owner's endpoint only asks Razorpay for the refund; every
 * effect comes from the `refund.processed` webhook, so a refund made in Razorpay's dashboard takes
 * the same path: the order's refunded amount and status, a credit note against the invoice, the
 * license revoked on a full refund, and the customer's email.
 */

const drizzle = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle
const adminLink = (orderId: number) => `${SITE_URL}/admin/collections/orders/${orderId}`

type Tx = Pick<PostgresAdapter['drizzle'], 'execute'>

/** A Payload transaction and its Drizzle session (the plain handle would run outside it). */
async function begin(payload: Payload) {
  const req = await createLocalReq({ context: { disableRevalidate: true } }, payload)
  await initTransaction(req)
  const db: Tx | undefined = (payload.db as unknown as PostgresAdapter).sessions[
    String(await req.transactionID)
  ]?.db
  if (!db) {
    await killTransaction(req)
    throw new Error('refunds: no transaction')
  }
  return { req, db }
}

type LockedOrder = Pick<
  Order,
  'id' | 'orderNumber' | 'status' | 'total' | 'amountRefunded' | 'events'
> & { razorpayOrderId: string | null; razorpayPaymentId: string | null; invoiceId: number | null }

/** The order row, locked until the transaction ends (numeric columns cast: pg returns strings). */
async function lockOrder(db: Tx, id: number): Promise<LockedOrder | undefined> {
  const { rows } = await db.execute(sql`
    SELECT id, order_number AS "orderNumber", status, total::int AS total,
           amount_refunded::int AS "amountRefunded", razorpay_order_id AS "razorpayOrderId",
           razorpay_payment_id AS "razorpayPaymentId", invoice_id AS "invoiceId", events
    FROM orders WHERE id = ${id} FOR UPDATE
  `)
  return rows[0] as LockedOrder | undefined
}

const refundBody = z.object({
  amount: z
    .number('The amount must be a number of paise.')
    .int('The amount must be whole paise.')
    .min(100, 'A refund must be at least ₹1.')
    .optional(),
  reason: z
    .string('Give a reason for the refund.')
    .trim()
    .min(3, 'Give a reason for the refund (at least 3 characters).')
    .max(500, 'Keep the reason under 500 characters.'),
  paymentId: z
    .string()
    .regex(/^pay_\w{1,40}$/, 'That payment isn’t one of this order’s.')
    .optional(),
})

/**
 * POST /api/orders/:id/refund (spec §10, §11.6), Owner only. Body: `reason` (3–500 characters),
 * `amount` in paise (default: all that is left) and, for a paid-twice order, the duplicate's
 * `paymentId` (default: the order's own payment). The order row stays locked while Razorpay is
 * asked, so a double click waits and then sees the first refund in Razorpay's refunded amount.
 */
export const refundEndpoint: PayloadHandler = async (req) => {
  requireRole(req, 'Only the Owner can refund an order.', 'owner')
  const orderId = routeId(req)
  const body = await readBody(req, refundBody)
  const cfg = razorpayConfig()
  if (!cfg) throw new APIError('Payments are not configured.', 503)
  const { req: tx, db } = await begin(req.payload)
  try {
    const order = await lockOrder(db, orderId)
    if (!order) throw new APIError('Not found.', 404)
    const state = refundState(order)
    const other = body.paymentId && body.paymentId !== order.razorpayPaymentId
    const duplicate = other ? state.duplicates.find((d) => d.paymentId === body.paymentId) : null
    if (other && !duplicate) throw new APIError('That payment isn’t one of this order’s.', 400)
    if (!duplicate && (!order.razorpayPaymentId || !REFUNDABLE.includes(order.status))) {
      throw new APIError(`A ${order.status} order can’t be refunded.`, 409)
    }
    const paymentId = duplicate?.paymentId ?? order.razorpayPaymentId!
    // Duplicates were captured on the same Razorpay order, so they are of the same amount.
    const ours = duplicate ? order.total - duplicate.refunded - duplicate.pending : state.refundable
    const payment = await fetchPayment(cfg, paymentId)
    if (payment.order_id !== order.razorpayOrderId) {
      throw new APIError('That payment belongs to another order.', 409)
    }
    const left = Math.min(ours, payment.amount - (payment.amount_refunded ?? 0))
    if (left < 100) throw new APIError('Nothing is left to refund on this payment.', 409)
    const amount = body.amount ?? left
    if (amount > left) throw new APIError(`At most ${formatINR('en', left)} can be refunded.`, 400)
    const refund = await createRefund(cfg, paymentId, {
      amount,
      notes: { orderId: String(order.id), orderNumber: order.orderNumber },
    })
    const entry: OrderEvent = {
      at: new Date().toISOString(),
      type: 'refund-requested',
      source: 'admin',
      paymentId,
      refundId: refund.id,
      amount: refund.amount,
      by: typeof req.user?.id === 'number' ? req.user.id : undefined,
      detail: `${refund.id}: ${refund.amount} paise: ${body.reason}`,
    }
    await db.execute(sql`
      UPDATE orders SET events = COALESCE(events, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb,
        updated_at = now()
      WHERE id = ${orderId}
    `)
    await commitTransaction(tx)
    return Response.json({
      ok: true,
      refund: { id: refund.id, amount: refund.amount, status: refund.status },
    })
  } catch (error) {
    await killTransaction(tx)
    if (error instanceof RazorpayError) {
      const why = error.description ? `: ${error.description}` : ''
      throw new APIError(`Razorpay refused the refund (${error.code})${why}`, 502)
    }
    throw error
  }
}

async function alert(text: string) {
  try {
    await sendTelegram(text)
  } catch (error) {
    console.error('refunds: alert failed:', error instanceof Error ? error.message : error)
  }
}

const refundEntry = (
  type: string,
  refund: RazorpayRefund,
  detail: string,
): Omit<OrderEvent, 'at'> => ({
  type,
  source: 'webhook',
  paymentId: refund.payment_id,
  refundId: refund.id,
  amount: refund.amount,
  detail,
})

/**
 * The refund webhooks for an order (spec §11.6). `refund.created` is recorded; `refund.failed`
 * alerts; `refund.processed` credits the order's own payment or closes a duplicate one. Safe to
 * run again: a redelivered event, or a retry after a failed email, adds nothing twice.
 */
export async function refundWebhook(
  payload: Payload,
  event: 'refund.created' | 'refund.processed' | 'refund.failed',
  order: Order,
  refund: RazorpayRefund,
) {
  const paise = `${refund.id}: ${refund.amount} paise`
  if (event === 'refund.created') {
    await addOrderEvent(
      payload,
      order.id,
      refundEntry(event, refund, `${paise}, ${refund.status}`),
      {
        type: event,
        refundId: refund.id,
      },
    )
    return
  }
  if (event === 'refund.failed') {
    const added = await addOrderEvent(payload, order.id, refundEntry(event, refund, paise), {
      type: event,
      refundId: refund.id,
    })
    if (added) {
      await alert(
        `Refund ${refund.id} for order ${order.orderNumber} failed.\n${adminLink(order.id)}`,
      )
    }
    await tellCustomer(payload, order, 'refund-failed-emailed', refund.id, () =>
      refundFailedEmail({
        locale: order.locale,
        orderNumber: order.orderNumber,
        amount: refund.amount,
      }),
    )
    return
  }
  if (refund.payment_id === order.razorpayPaymentId) {
    const creditNote = await creditRefund(payload, order.id, refund)
    if (creditNote) await sendRefundEmail(creditNote)
    return
  }
  if (refundState(order).duplicates.some((d) => d.paymentId === refund.payment_id)) {
    await duplicateRefunded(payload, order, refund)
    return
  }
  const added = await addOrderEvent(
    payload,
    order.id,
    refundEntry('refund-unmatched', refund, paise),
    {
      type: 'refund-unmatched',
      refundId: refund.id,
    },
  )
  if (added) {
    await alert(
      `Refund ${refund.id} on order ${order.orderNumber} is of a payment the order doesn't know: check it in Razorpay.\n${adminLink(order.id)}`,
    )
  }
}

type Totals = Invoice['totals']
const TOTALS = ['subtotal', 'discount', 'taxable', 'cgst', 'sgst', 'igst', 'total'] as const

/**
 * What the invoice still holds after earlier credit notes, field by field: they add up exactly.
 * At home its tax is split again (CGST = half rounded up, spec §11.4), as each partial note's was:
 * per head the notes can then differ from the invoice by a paisa or two, the tax never does.
 */
function remainder(invoice: Invoice, earlier: Invoice[]): Totals {
  const rest = Object.fromEntries(
    TOTALS.map((f) => [f, invoice.totals[f] - earlier.reduce((n, note) => n + note.totals[f], 0)]),
  ) as Totals
  if (invoice.taxMode !== 'cgst_sgst') return rest
  const tax = rest.cgst + rest.sgst
  const cgst = Math.ceil(tax / 2)
  return { ...rest, cgst, sgst: tax - cgst }
}

/**
 * A partial refund's tax, from the original invoice as issued (its mode and rate), never from
 * today's settings. Its mode decides CGST + SGST or IGST, whatever the states say now.
 */
function partial(invoice: Invoice, amount: number): Totals {
  const tax = computeTax(amount, invoice.buyer.stateCode, {
    gstEnabled: invoice.taxMode !== 'none',
    ratePercent: invoice.lines[0]?.ratePercent ?? 0,
    pricesIncludeGst: true,
    homeStateCode: invoice.taxMode === 'cgst_sgst' ? invoice.buyer.stateCode : '',
  })
  const { taxable, cgst, sgst, igst, total } = tax
  // Prices before GST: the invoice's subtotal is net of tax, so the refund's is its taxable value.
  const t = invoice.totals
  const exclusive = t.cgst + t.sgst + t.igst > 0 && t.subtotal - t.discount === t.taxable
  return { subtotal: exclusive ? taxable : amount, discount: 0, taxable, cgst, sgst, igst, total }
}

/** The credit note: the original's seller and buyer snapshots, one refund line (spec §11.4). */
function creditNoteData(
  invoice: Invoice,
  orderId: number,
  refundId: string,
  number: string,
  fy: string,
  issuedAt: Date,
  totals: Totals,
): RequiredDataFromCollectionSlug<'invoices'> {
  const line = invoice.lines[0]!
  return {
    number,
    kind: 'credit-note',
    financialYear: fy,
    order: orderId,
    originalInvoice: invoice.id,
    razorpayRefundId: refundId,
    issuedAt: issuedAt.toISOString(),
    seller: invoice.seller,
    buyer: invoice.buyer,
    taxMode: invoice.taxMode,
    sacCode: invoice.sacCode ?? null,
    reverseCharge: false,
    currency: invoice.currency,
    lines: [
      {
        description: `Refund: ${line.description}`,
        qty: 1,
        unitPrice: totals.subtotal,
        discount: totals.discount,
        taxable: totals.taxable,
        ratePercent: line.ratePercent,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
      },
    ],
    totals,
  }
}

const creditNoteOf = async (payload: Payload, refundId: string) =>
  (
    await payload.find({
      collection: 'invoices',
      where: { razorpayRefundId: { equals: refundId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]?.id ?? null

/**
 * A processed refund of the order's own payment, in one transaction like fulfilment: the order is
 * locked, a redelivery stops at its `refund-processed` entry, then the credit note (numbered in
 * the credit note series), the order's refunded amount and status, the license revoked once the
 * whole total is back, and the PDF job. Returns the credit note to email.
 */
async function creditRefund(payload: Payload, orderId: number, refund: RazorpayRefund) {
  const settings = await getCommerceSettings(payload)
  const { req, db } = await begin(payload)
  try {
    const order = await lockOrder(db, orderId)
    if (!order) throw new Error(`refunds: order ${orderId} is gone`)
    if (eventsOf(order).some((e) => e.type === 'refund-processed' && e.refundId === refund.id)) {
      await killTransaction(req)
      return creditNoteOf(payload, refund.id)
    }
    if (!order.invoiceId) throw new Error(`refunds: order ${orderId} has no invoice`)
    const invoice = await payload.findByID({
      collection: 'invoices',
      id: order.invoiceId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const { docs: earlier } = await payload.find({
      collection: 'invoices',
      where: {
        and: [{ originalInvoice: { equals: invoice.id } }, { kind: { equals: 'credit-note' } }],
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    // Razorpay never refunds more than was captured, but a credit note never exceeds what is left.
    const amount = Math.min(refund.amount, order.total - order.amountRefunded)
    const over = refund.amount - amount
    const refunded = order.amountRefunded + amount
    const full = refunded >= order.total

    let note: Invoice | null = null
    if (amount > 0) {
      const issuedAt = new Date()
      const prefix = settings.creditNotePrefix || 'JC'
      const fy = financialYear(issuedAt)
      const number = await allocateNumber(db, prefix, fy)
      const totals = full ? remainder(invoice, earlier) : partial(invoice, amount)
      note = await payload.create({
        collection: 'invoices',
        data: creditNoteData(invoice, orderId, refund.id, number, fy, issuedAt, totals),
        overrideAccess: true,
        depth: 0,
        req,
      })
      await db.execute(sql`
        INSERT INTO orders_rels ("order", parent_id, path, invoices_id)
        SELECT COALESCE(MAX("order"), 0) + 1, ${orderId}, 'creditNotes', ${note.id}
        FROM orders_rels WHERE parent_id = ${orderId} AND path = 'creditNotes'
      `)
      await payload.jobs.queue({ task: 'renderInvoicePdf', input: { id: note.id }, req })
    }

    // A partial refund doesn't end a dispute or undo a loss.
    const status = full
      ? 'refunded'
      : order.status === 'disputed' || order.status === 'chargeback'
        ? order.status
        : 'partially-refunded'
    const detail = [
      `${refund.id}: ${refund.amount} paise`,
      note ? `credit note ${note.number}` : 'nothing left to credit',
      ...(over ? [`${over} paise more than was left`] : []),
    ].join(', ')
    const entry = JSON.stringify([
      { at: new Date().toISOString(), ...refundEntry('refund-processed', refund, detail) },
    ])
    await db.execute(sql`
      UPDATE orders SET amount_refunded = ${refunded}, status = ${status},
        events = COALESCE(events, '[]'::jsonb) || ${entry}::jsonb, updated_at = now()
      WHERE id = ${orderId}
    `)
    if (full && amount > 0) {
      // The refund email says it: marked as told, so no separate revoked email goes out.
      const { errors } = await payload.update({
        collection: 'licenses',
        where: { and: [{ order: { equals: orderId } }, { status: { not_equals: 'revoked' } }] },
        data: { status: 'revoked', statusNotifiedAs: 'revoked' },
        overrideAccess: true,
        depth: 0,
        req,
        context: { skipStatusEmail: true },
      })
      if (errors.length) throw new Error(`refunds: order ${orderId}: the license wasn't revoked`)
    }
    await commitTransaction(req)
    if (over) {
      await alert(
        `Refund ${refund.id} on order ${order.orderNumber} is ${formatINR('en', over)} more than was left to refund: no credit note covers it.\n${adminLink(orderId)}`,
      )
    }
    return note?.id ?? null
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/**
 * A short email to the order's customer about a refund, once per refund: it is marked after
 * sending, so a crash in between can send it twice. Nobody to tell once the account is deleted.
 */
async function tellCustomer(
  payload: Payload,
  order: Order,
  type: string,
  refundId: string,
  message: () => Promise<RenderedEmail>,
) {
  if (eventsOf(order).some((e) => e.type === type && e.refundId === refundId)) return
  const customer = await payload.findByID({
    collection: 'customers',
    id: typeof order.customer === 'object' ? order.customer.id : order.customer,
    depth: 0,
    overrideAccess: true,
  })
  if (customer.status !== 'deleted') {
    await sendEmail(payload, order.billing.email, await message(), {
      replyTo: await inboxAddress(payload, 'support'),
    })
  }
  await addOrderEvent(payload, order.id, { type, refundId }, { type, refundId })
}

/**
 * A processed refund of a duplicate payment (spec §11.3 step 9): no credit note (no invoice was
 * issued for it) and the order is unchanged. The flag goes once every duplicate is refunded in
 * full, and the customer gets a short note.
 */
async function duplicateRefunded(payload: Payload, order: Order, refund: RazorpayRefund) {
  await addOrderEvent(
    payload,
    order.id,
    refundEntry('duplicate-refunded', refund, `${refund.id}: ${refund.amount} paise`),
    { type: 'duplicate-refunded', refundId: refund.id },
  )
  const fresh = await payload.findByID({
    collection: 'orders',
    id: order.id,
    depth: 0,
    overrideAccess: true,
  })
  if (refundState(fresh).duplicates.every((d) => d.refunded >= fresh.total)) {
    await drizzle(payload).execute(
      sql`DELETE FROM orders_flags WHERE parent_id = ${order.id} AND value = 'paid-twice'`,
    )
  }
  await tellCustomer(payload, fresh, 'duplicate-refund-emailed', refund.id, () =>
    duplicateRefundEmail({
      locale: fresh.locale,
      orderNumber: fresh.orderNumber,
      amount: refund.amount,
      accountUrl: absoluteUrl(fresh.locale, '/account/orders'),
    }),
  )
}

const DISPUTE_LOST = 'payment.dispute.lost'

/**
 * The events that end a dispute, and the statuses each moves an order on from. Razorpay: won, the
 * bank accepted our documents; lost, it kept the money for the customer; closed, a fraud dispute
 * settled by details or a refund. Events can run out of order, so a loss applies to an order not
 * yet marked disputed. Only a win undoes a loss, and a fully refunded order stays as it is.
 */
const DISPUTE_ENDS: Record<string, Order['status'][]> = {
  'payment.dispute.won': ['disputed', 'chargeback'],
  [DISPUTE_LOST]: ['paid', 'partially-refunded', 'disputed', 'chargeback'],
  'payment.dispute.closed': ['disputed'],
}

/**
 * An order stops showing `disputed` once its dispute ends: what the money says, so a refund made
 * during the dispute shows.
 * ponytail: assumes one open dispute per payment; check the history if a second ever appears.
 */
async function endDispute(
  payload: Payload,
  orderId: number,
  lost: boolean,
  from: Order['status'][],
) {
  await drizzle(payload).execute(sql`
    UPDATE orders
    SET updated_at = now(), status = (CASE
      WHEN ${lost} THEN 'chargeback'
      WHEN amount_refunded > 0 THEN 'partially-refunded'
      ELSE 'paid'
    END)::enum_orders_status
    WHERE id = ${orderId} AND status IN ${from}
  `)
  const { status } = await payload.findByID({
    collection: 'orders',
    id: orderId,
    select: { status: true },
    depth: 0,
    overrideAccess: true,
  })
  return status
}

/**
 * The dispute webhooks (spec §11.6). A new dispute of the order's own payment marks a paid order
 * `disputed` and suspends its license through the Local API (audited; the email is sent here, so
 * a failure retries the job). A dispute of a duplicate payment changes nothing: the alert says to
 * refund that payment. Its end clears `disputed`; no other stage changes anything. The license
 * never follows by itself: Support or the Owner reinstates it, or the Owner revokes it. Each stage
 * of a dispute alerts once.
 */
export async function disputeWebhook(
  payload: Payload,
  event: string,
  order: Order,
  dispute: RazorpayDispute,
) {
  const created = event === 'payment.dispute.created'
  // The webhook also finds an order by its Razorpay order: any other payment on it is a duplicate.
  const duplicate = dispute.payment_id !== order.razorpayPaymentId
  // Webhooks and their retries can run out of order: a dispute that already ended opens nothing.
  const over = eventsOf(order).some((e) => e.disputeId === dispute.id && e.type in DISPUTE_ENDS)
  let disputed = false
  let suspended = 0
  let licenseSuspended = false
  if (created && !duplicate && !over) {
    const { rows } = await drizzle(payload).execute(sql`
      UPDATE orders SET status = 'disputed', updated_at = now()
      WHERE id = ${order.id} AND status IN ('paid', 'partially-refunded')
      RETURNING id
    `)
    disputed = rows.length > 0
    const { docs: changed, errors } = await payload.update({
      collection: 'licenses',
      where: { and: [{ order: { equals: order.id } }, { status: { equals: 'active' } }] },
      data: { status: 'suspended' },
      overrideAccess: true,
      depth: 0,
      context: { skipStatusEmail: true, disableRevalidate: true },
    })
    if (errors.length) throw new Error(`refunds: order ${order.id}: the license wasn't suspended`)
    suspended = changed.length
    const { docs } = await payload.find({
      collection: 'licenses',
      where: { order: { equals: order.id } },
      depth: 0,
      overrideAccess: true,
    })
    licenseSuspended = docs.some((license) => license.status === 'suspended')
    // A no-op for licenses whose customer was told already.
    for (const license of docs) await sendLicenseStatusEmail(license.id)
  }
  const lost = event === DISPUTE_LOST
  const from = duplicate ? undefined : DISPUTE_ENDS[event]
  const ended = from ? await endDispute(payload, order.id, lost, from) : null
  const added = await addOrderEvent(
    payload,
    order.id,
    {
      type: event,
      source: 'webhook',
      paymentId: dispute.payment_id,
      disputeId: dispute.id,
      amount: dispute.amount,
      detail: [`${dispute.id}: ${dispute.amount} paise`, dispute.reason_code, dispute.status]
        .filter(Boolean)
        .join(', '),
    },
    { type: event, disputeId: dispute.id },
  )
  if (!added) return
  const link = adminLink(order.id)
  const stage = event.slice('payment.dispute.'.length).replace('_', ' ')
  if (duplicate) {
    await alert(
      created
        ? `Dispute ${dispute.id} is on a duplicate payment ${dispute.payment_id} of order ${order.orderNumber}: refund that payment; the order and license are unchanged.\n${link}`
        : `Dispute ${dispute.id} on a duplicate payment ${dispute.payment_id} of order ${order.orderNumber}: ${stage}. The order and license are unchanged.\n${link}`,
    )
  } else if (created) {
    const reason = dispute.reason_code ? ` (${dispute.reason_code})` : ''
    const by = dispute.respond_by
      ? `, respond by ${formatDate('en', new Date(dispute.respond_by * 1000))}`
      : ''
    // The state this dispute leaves, not this run's changes: a retry after a failed email finds
    // the order disputed and the license suspended by the first run.
    const done =
      disputed || order.status === 'disputed'
        ? `The order is disputed${licenseSuspended ? ' and its license suspended' : '; it has no active license to suspend'}.`
        : `The order is already ${order.status}${suspended ? '; its license was suspended' : '; nothing was changed'}.`
    await alert(
      `Payment dispute ${dispute.id} on order ${order.orderNumber}${reason}${by}. ${done}\n${link}`,
    )
  } else if (ended) {
    const { totalDocs: stillSuspended } = await payload.count({
      collection: 'licenses',
      where: { and: [{ order: { equals: order.id } }, { status: { equals: 'suspended' } }] },
      overrideAccess: true,
    })
    const license =
      lost && !stillSuspended
        ? `The license wasn't suspended: revoke it in the admin if it should stop.`
        : `The license doesn't change by itself: reinstate or revoke it in the admin.`
    await alert(
      `Payment dispute ${dispute.id} on order ${order.orderNumber}: ${stage}. The order is now ${ended}. ${license}\n${link}`,
    )
  } else {
    await alert(
      `Payment dispute ${dispute.id} on order ${order.orderNumber}: ${stage}. Nothing changes by itself.\n${link}`,
    )
  }
}
