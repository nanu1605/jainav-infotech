import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type RequiredDataFromCollectionSlug,
} from 'payload'

import { financialYear, invoiceNumber } from '@/lib/invoices/numbering'
import { sendTelegram } from '@/lib/notify'
import { SITE_URL } from '@/lib/seo'
import { GST_STATES, isStateCode } from '@/lib/tax/states'
import type { CommerceSetting, Order, SiteSetting } from '@/payload-types'

import type { RazorpayPayment } from './razorpay'
import { getCommerceSettings } from './store'

export type OrderEvent = {
  at: string
  type: string
  source?: 'verify' | 'webhook' | 'reconcile'
  paymentId?: string
  detail?: string
}

const drizzle = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle

/** Appends to an order's history in one statement, so concurrent writers never lose an entry. */
export async function addOrderEvent(
  payload: Payload,
  orderId: number,
  event: Omit<OrderEvent, 'at'>,
) {
  const entry = JSON.stringify([{ at: new Date().toISOString(), ...event }])
  await drizzle(payload).execute(sql`
    UPDATE orders SET events = COALESCE(events, '[]'::jsonb) || ${entry}::jsonb WHERE id = ${orderId}
  `)
}

export type PaymentCheck = 'ok' | 'pending' | 'failed' | 'mismatch'

/**
 * Spec §11.3 step 5: fulfil only a captured payment of exactly this order's amount and currency
 * on this order's Razorpay order. Authorized but not yet captured waits for the webhook or the
 * reconciliation job.
 */
export function checkPayment(
  order: Pick<Order, 'razorpayOrderId' | 'total' | 'currency'>,
  payment: RazorpayPayment,
): PaymentCheck {
  if (
    !order.razorpayOrderId ||
    payment.order_id !== order.razorpayOrderId ||
    payment.amount !== order.total ||
    payment.currency !== order.currency
  ) {
    return 'mismatch'
  }
  if (payment.status === 'captured') return 'ok'
  if (payment.status === 'authorized' || payment.status === 'created') return 'pending'
  return 'failed'
}

/** The invoice for a paid order: snapshots of seller and buyer as they are now (spec §11.4). */
function invoiceData(
  order: Order,
  site: SiteSetting,
  settings: CommerceSetting,
  number: string,
  fy: string,
  issuedAt: Date,
): RequiredDataFromCollectionSlug<'invoices'> {
  const home = settings.homeStateCode ?? '23'
  const { tax, billing } = order
  return {
    number,
    kind: 'invoice',
    financialYear: fy,
    order: order.id,
    issuedAt: issuedAt.toISOString(),
    seller: {
      legalName: site.company?.legalName || 'Jainav Infotech Private Limited',
      cin: site.company?.cin || null,
      address: site.company?.registeredAddress || null,
      gstin: site.company?.gstin || null,
      stateCode: home,
      stateName: isStateCode(home) ? GST_STATES[home] : home,
    },
    buyer: {
      name: billing.name,
      businessName: billing.businessName || null,
      email: billing.email,
      country: billing.country,
      stateCode: billing.stateCode,
      stateName: billing.stateName,
      gstin: billing.gstin || null,
    },
    taxMode: tax.mode,
    sacCode: settings.sacCode || null,
    reverseCharge: false,
    currency: order.currency,
    lines: order.items.map((item) => ({
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: order.discount,
      taxable: tax.taxable,
      ratePercent: tax.ratePercent,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      total: order.total,
    })),
    totals: {
      subtotal: order.subtotal,
      discount: order.discount,
      taxable: tax.taxable,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      total: order.total,
    },
  }
}

export type FulfilResult = 'fulfilled' | 'already' | 'paid-twice'

/**
 * Fulfilment (spec §11.3 step 7): one transaction, idempotent. The guarded UPDATE decides who
 * fulfils: a second caller (verify, a webhook, reconciliation) finds no row and stops. The
 * license (Phase 8) and the coupon count, the invoice number and the invoice are written in the
 * same transaction; the PDF and email jobs are queued in it too, so they exist only if it commits.
 * Orders are only ever changed in SQL here: a Local API update would rewrite the event history.
 */
export async function fulfilOrder(
  payload: Payload,
  orderId: number,
  paymentId: string,
  source: OrderEvent['source'],
): Promise<FulfilResult> {
  const [site, settings] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }),
    getCommerceSettings(payload),
  ])
  const req = await createLocalReq({ context: { disableRevalidate: true } }, payload)
  await initTransaction(req)
  const tx = (payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]
    ?.db
  if (!tx) throw new Error('fulfilOrder: no transaction')
  try {
    const paidAt = new Date()
    const event = JSON.stringify([{ at: paidAt.toISOString(), type: 'paid', source, paymentId }])
    const { rows } = await tx.execute(sql`
      UPDATE orders
      SET status = 'paid', razorpay_payment_id = ${paymentId}, paid_at = ${paidAt.toISOString()},
          events = COALESCE(events, '[]'::jsonb) || ${event}::jsonb, updated_at = now()
      WHERE id = ${orderId} AND status IN ('created', 'expired')
      RETURNING id
    `)
    if (!rows.length) {
      await killTransaction(req)
      return alreadyPaid(payload, orderId, paymentId, source)
    }
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
      req,
    })

    // Licenses are issued here from Phase 8 (spec §20).

    const couponId = typeof order.coupon === 'object' ? order.coupon?.id : order.coupon
    if (couponId) {
      const counted = await tx.execute(sql`
        UPDATE coupons SET redemptions = COALESCE(redemptions, 0) + 1, updated_at = now()
        WHERE id = ${couponId}
          AND (max_redemptions IS NULL OR COALESCE(redemptions, 0) < max_redemptions)
        RETURNING id
      `)
      // The payment is taken either way; the limit was checked at checkout, so this is a race.
      if (!counted.rows.length) {
        const note = JSON.stringify([
          { at: paidAt.toISOString(), type: 'coupon-limit', detail: 'Redemption limit reached' },
        ])
        await tx.execute(
          sql`UPDATE orders SET events = COALESCE(events, '[]'::jsonb) || ${note}::jsonb WHERE id = ${orderId}`,
        )
      }
    }

    const prefix = settings.invoicePrefix || 'JI'
    const fy = financialYear(paidAt)
    const counter = await tx.execute(sql`
      INSERT INTO invoice_counters (series, financial_year, next) VALUES (${prefix}, ${fy}, 2)
      ON CONFLICT (series, financial_year)
      DO UPDATE SET next = invoice_counters.next + 1, updated_at = now()
      RETURNING next - 1 AS seq
    `)
    const seq = Number((counter.rows[0] as { seq: string | number }).seq)
    const invoice = await payload.create({
      collection: 'invoices',
      data: invoiceData(order, site, settings, invoiceNumber(prefix, fy, seq), fy, paidAt),
      overrideAccess: true,
      depth: 0,
      req,
    })
    await tx.execute(sql`UPDATE orders SET invoice_id = ${invoice.id} WHERE id = ${orderId}`)
    await payload.jobs.queue({ task: 'renderInvoicePdf', input: { id: invoice.id }, req })
    await commitTransaction(req)
    return 'fulfilled'
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/**
 * Nothing to fulfil: the same payment was handled already, or (spec §11.3 step 9) a second
 * payment was captured on an order another payment paid. That one is flagged once, with an
 * alert; Phase 9 adds the one-click refund.
 */
async function alreadyPaid(
  payload: Payload,
  orderId: number,
  paymentId: string,
  source: OrderEvent['source'],
): Promise<FulfilResult> {
  const order = await payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
  })
  if (!order.razorpayPaymentId || order.razorpayPaymentId === paymentId) return 'already'
  const marker = JSON.stringify([{ type: 'paid-twice', paymentId }])
  const event = JSON.stringify([
    { at: new Date().toISOString(), type: 'paid-twice', source, paymentId },
  ])
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE orders SET events = COALESCE(events, '[]'::jsonb) || ${event}::jsonb, updated_at = now()
    WHERE id = ${orderId} AND NOT (COALESCE(events, '[]'::jsonb) @> ${marker}::jsonb)
    RETURNING id
  `)
  if (!rows.length) return 'already'
  await drizzle(payload).execute(sql`
    INSERT INTO orders_flags ("order", parent_id, value)
    SELECT 1, ${orderId}, 'paid-twice'
    WHERE NOT EXISTS (SELECT 1 FROM orders_flags WHERE parent_id = ${orderId} AND value = 'paid-twice')
  `)
  try {
    await sendTelegram(
      `Order ${order.orderNumber} was paid twice: refund the duplicate payment.\n${SITE_URL}/admin/collections/orders/${orderId}`,
    )
  } catch (error) {
    console.error(
      'fulfil: paid-twice alert failed:',
      error instanceof Error ? error.message : error,
    )
  }
  return 'paid-twice'
}

/**
 * Runs queued jobs now (the invoice PDF, then the email it queues), so a buyer's email doesn't
 * wait for the next autoRun tick. Call it inside after(). The cron is the safety net.
 */
export async function runQueuedJobs(payload: Payload) {
  for (let round = 0; round < 3; round++) {
    const { jobStatus } = await payload.jobs.run({ queue: 'default', limit: 10, silent: true })
    if (!jobStatus || !Object.keys(jobStatus).length) return
  }
}
