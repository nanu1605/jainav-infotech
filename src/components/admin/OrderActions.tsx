import type { Payload, PayloadRequest } from 'payload'

import { hasRole } from '@/access/roles'
import { REFUNDABLE, refundState } from '@/lib/commerce/refundState'

import { OrderActionsClient } from './OrderActionsClient'

type Props = { id?: number | string; payload: Payload; user: PayloadRequest['user'] }

/**
 * The Owner's refunds above an order (spec §10): the refundable amount, refunds waiting for
 * Razorpay, and the duplicate payments of a paid-twice order. Support reads orders without it;
 * the endpoint checks the role again.
 */
export async function OrderActions({ id, payload, user }: Props) {
  if (!id || !hasRole(user, 'owner')) return null
  const order = await payload
    .findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!order) return null
  const state = refundState(order)
  const canRefund = REFUNDABLE.includes(order.status) && Boolean(order.razorpayPaymentId)
  if (!canRefund && !state.duplicates.length && !state.pending.length) return null
  return (
    <OrderActionsClient
      orderId={order.id}
      orderNumber={order.orderNumber}
      total={order.total}
      refunded={order.amountRefunded ?? 0}
      refundable={canRefund ? state.refundable : 0}
      pending={state.pending.map(({ refundId, amount, at }) => ({ refundId, amount, at }))}
      duplicates={state.duplicates.map((d) => ({
        paymentId: d.paymentId,
        refunded: d.refunded,
        pending: d.pending,
        left: order.total - d.refunded - d.pending,
      }))}
    />
  )
}
