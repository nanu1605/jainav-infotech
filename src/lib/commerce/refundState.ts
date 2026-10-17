import type { Order } from '@/payload-types'

import type { OrderEvent } from './fulfil'

export const eventsOf = (order: Pick<Order, 'events'>): OrderEvent[] =>
  Array.isArray(order.events) ? (order.events as OrderEvent[]) : []

/** Orders the Owner may refund (their own payment); duplicates of any paid order can be. */
export const REFUNDABLE: Order['status'][] = ['paid', 'partially-refunded', 'disputed']

/** Entries that close a refund request: processed (either kind of payment) or failed. */
const SETTLED = new Set([
  'refund-processed',
  'duplicate-refunded',
  'refund-unmatched',
  'refund.failed',
])

export type RefundState = {
  /** Paise the Owner can still refund of the order's own payment. */
  refundable: number
  /** Refunds asked for in the admin whose webhook hasn't arrived yet. */
  pending: { refundId: string; paymentId: string; amount: number; at: string }[]
  /** Second payments on the paid order (spec §11.3 step 9) and what was refunded of them. */
  duplicates: { paymentId: string; refunded: number; pending: number }[]
}

/**
 * What an order's history says about its refunds: read by the refund endpoint and the admin's
 * order actions. A request stays pending until its refund is processed or fails.
 */
export function refundState(
  order: Pick<Order, 'events' | 'total' | 'amountRefunded' | 'razorpayPaymentId'>,
): RefundState {
  const events = eventsOf(order)
  const settled = new Set(events.flatMap((e) => (SETTLED.has(e.type) ? [e.refundId] : [])))
  const pending = events.flatMap((e) =>
    e.type === 'refund-requested' && e.refundId && e.paymentId && !settled.has(e.refundId)
      ? [{ refundId: e.refundId, paymentId: e.paymentId, amount: e.amount ?? 0, at: e.at }]
      : [],
  )
  const sum = (list: { amount?: number }[]) => list.reduce((n, e) => n + (e.amount ?? 0), 0)
  const pendingOf = (paymentId: string) => sum(pending.filter((p) => p.paymentId === paymentId))
  const duplicateIds = new Set(
    events.flatMap((e) => (e.type === 'paid-twice' && e.paymentId ? [e.paymentId] : [])),
  )
  return {
    refundable: Math.max(
      0,
      order.total - (order.amountRefunded ?? 0) - pendingOf(order.razorpayPaymentId ?? ''),
    ),
    pending,
    duplicates: [...duplicateIds].map((paymentId) => ({
      paymentId,
      refunded: sum(
        events.filter((e) => e.type === 'duplicate-refunded' && e.paymentId === paymentId),
      ),
      pending: pendingOf(paymentId),
    })),
  }
}
