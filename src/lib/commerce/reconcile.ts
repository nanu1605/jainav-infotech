import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'

import { getClient } from '@/lib/cms'

import { checkPayment, fulfilOrder } from './fulfil'
import { errorCode } from './http'
import { fetchOrderPayments, RazorpayError, razorpayConfig } from './razorpay'

/** Orders are marked expired after 24 hours, but a capture fulfils them for 72 (spec §11.3). */
const EXPIRE_HOURS = 24
const WATCH_HOURS = 72
const BATCH = 200

/**
 * The reconcileOrders job, every 15 minutes (spec §11.3 step 10): late UPI captures and missed
 * webhooks. Asks Razorpay for the payments of every unpaid order younger than 72 hours and fulfils
 * one with a captured payment that passes the usual checks.
 */
export async function reconcileOrders() {
  const cfg = razorpayConfig()
  if (!cfg) return
  const payload = await getClient()
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  await db.execute(sql`
    UPDATE orders
    SET status = 'expired', updated_at = now(),
        events = COALESCE(events, '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object('at', now(), 'type', 'expired'))
    WHERE status = 'created' AND created_at < now() - make_interval(hours => ${EXPIRE_HOURS})
  `)
  // ponytail: one batch per run; at 200 open orders every 15 minutes, page through the rest.
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { in: ['created', 'expired'] } },
        { razorpayOrderId: { exists: true } },
        {
          createdAt: {
            greater_than: new Date(Date.now() - WATCH_HOURS * 3_600_000).toISOString(),
          },
        },
      ],
    },
    sort: 'createdAt',
    limit: BATCH,
    depth: 0,
    overrideAccess: true,
  })
  for (const order of docs) {
    try {
      const payments = await fetchOrderPayments(cfg, order.razorpayOrderId!)
      const captured = payments.find((payment) => checkPayment(order, payment) === 'ok')
      if (captured) await fulfilOrder(payload, order.id, captured.id, 'reconcile')
    } catch (error) {
      const reason = error instanceof RazorpayError ? error.message : errorCode(error)
      console.error(`reconcile: order ${order.id} failed: ${reason}`)
    }
  }
}
