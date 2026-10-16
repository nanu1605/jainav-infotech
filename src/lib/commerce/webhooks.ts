import 'server-only'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
} from 'payload'
import { after } from 'next/server'
import { z } from 'zod'

import { deleteExpired } from '@/lib/account/session'
import { getClient } from '@/lib/cms'
import { sha256 } from '@/lib/rateLimit'

import { addOrderEvent, checkPayment, fulfilOrder, runQueuedJobs } from './fulfil'
import {
  fetchPayment,
  paymentSchema,
  RazorpayError,
  razorpayConfig,
  webhookSignatureValid,
} from './razorpay'
import { errorCode } from './http'

const MAX_BODY = 256 * 1024
/** Webhook payloads hold the payer's email and phone: kept 90 days (spec §16 logs). */
const KEEP_DAYS = 90

const entity = <T extends z.ZodTypeAny>(schema: T) => z.object({ entity: schema }).optional()

/** The parts of Razorpay's event envelope we read; everything else is kept as received. */
const envelope = z.object({
  event: z.string().max(100),
  payload: z.object({
    payment: entity(paymentSchema.passthrough()),
    refund: entity(
      z
        .object({ id: z.string(), payment_id: z.string(), amount: z.number(), status: z.string() })
        .passthrough(),
    ),
    dispute: entity(
      z
        .object({
          id: z.string(),
          payment_id: z.string(),
          amount: z.number(),
          reason_code: z.string().nullish(),
        })
        .passthrough(),
    ),
  }),
})

const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * POST /api/v1/webhooks/razorpay (spec §11.3 step 6): verify the signature over the raw body,
 * store the event once per x-razorpay-event-id, queue its processing and answer at once
 * (Razorpay waits 5 seconds). Redelivered events are acknowledged and ignored.
 */
export async function receiveWebhook(req: Request): Promise<Response> {
  const cfg = razorpayConfig()
  // 503 makes Razorpay retry for 24 hours, long enough to fix missing keys.
  if (!cfg) return text(503, 'Payments are not configured')
  if (Number(req.headers.get('content-length')) > MAX_BODY) return text(413, 'Too large')
  const raw = await req.text()
  if (raw.length > MAX_BODY) return text(413, 'Too large')
  if (!webhookSignatureValid(cfg, raw, req.headers.get('x-razorpay-signature') ?? '')) {
    console.warn('webhooks/razorpay: bad signature')
    return text(400, 'Bad signature')
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return text(400, 'Bad JSON')
  }
  const parsed = envelope.safeParse(body)
  if (!parsed.success) return text(400, 'Unexpected payload')
  const eventId = req.headers.get('x-razorpay-event-id') || `sha256:${sha256(raw)}`

  const payload = await getClient()
  const seen = async () =>
    (
      await payload.count({
        collection: 'webhook-events',
        where: { eventId: { equals: eventId } },
        overrideAccess: true,
      })
    ).totalDocs > 0
  if (await seen()) return text(200, 'Duplicate')

  // The event and its job commit together: a stored event always gets processed.
  const tx = await createLocalReq({}, payload)
  await initTransaction(tx)
  try {
    const doc = await payload.create({
      collection: 'webhook-events',
      data: {
        provider: 'razorpay',
        eventId,
        event: parsed.data.event,
        payload: body as Record<string, unknown>,
        status: 'received',
        receivedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      depth: 0,
      req: tx,
    })
    await payload.jobs.queue({ task: 'processWebhook', input: { id: doc.id }, req: tx })
    await commitTransaction(tx)
  } catch (error) {
    await killTransaction(tx)
    // The same event arriving twice at once: the other request stored it.
    if (await seen()) return text(200, 'Duplicate')
    console.error('webhooks/razorpay: store failed:', errorCode(error))
    return text(500, 'Error')
  }
  after(() => runQueuedJobs(payload))
  return text(200, 'OK')
}

const orderBy = async (
  payload: Payload,
  field: 'razorpayOrderId' | 'razorpayPaymentId',
  value: string | null | undefined,
) =>
  value
    ? ((
        await payload.find({
          collection: 'orders',
          where: { [field]: { equals: value } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      ).docs[0] ?? null)
    : null

/**
 * The processWebhook job. Payment events re-fetch the payment and pass the same checks as
 * verify before fulfilling (spec §11.3 step 6). Failures, refunds and disputes are recorded on
 * the order; their effects (credit notes, license changes, alerts) come in Phase 9.
 */
export async function processWebhookEvent(id: number) {
  const payload = await getClient()
  const doc = await payload.findByID({
    collection: 'webhook-events',
    id,
    depth: 0,
    overrideAccess: true,
  })
  if (doc.status === 'processed' || doc.status === 'ignored') return
  const cfg = razorpayConfig()
  const parsed = envelope.safeParse(doc.payload)
  let status: 'processed' | 'ignored' = 'ignored'
  try {
    if (!cfg || !parsed.success) throw new Error(cfg ? 'Unexpected payload' : 'No gateway')
    const { event, payload: entities } = parsed.data
    const payment = entities.payment?.entity
    switch (event) {
      case 'payment.authorized':
      case 'payment.captured':
      case 'order.paid': {
        const order = await orderBy(payload, 'razorpayOrderId', payment?.order_id)
        if (!order || !payment) break
        const fresh = await fetchPayment(cfg, payment.id)
        const check = checkPayment(order, fresh)
        if (check === 'ok') await fulfilOrder(payload, order.id, fresh.id, 'webhook')
        else if (check === 'mismatch') {
          await addOrderEvent(payload, order.id, {
            type: 'payment-mismatch',
            source: 'webhook',
            paymentId: fresh.id,
          })
        }
        status = 'processed'
        break
      }
      case 'payment.failed': {
        const order = await orderBy(payload, 'razorpayOrderId', payment?.order_id)
        if (!order || !payment) break
        // The customer can retry on the same order (spec §11.3 step 6): nothing else to do.
        await addOrderEvent(payload, order.id, {
          type: 'payment-failed',
          source: 'webhook',
          paymentId: payment.id,
          detail: payment.error_code ?? undefined,
        })
        status = 'processed'
        break
      }
      case 'refund.created':
      case 'refund.processed':
      case 'refund.failed': {
        const refund = entities.refund?.entity
        const order =
          (await orderBy(payload, 'razorpayPaymentId', refund?.payment_id)) ??
          (await orderBy(payload, 'razorpayOrderId', payment?.order_id))
        if (!order || !refund) break
        await addOrderEvent(payload, order.id, {
          type: event,
          source: 'webhook',
          paymentId: refund.payment_id,
          detail: `${refund.id}: ${refund.amount} paise, ${refund.status}`,
        })
        status = 'processed'
        break
      }
      case 'payment.dispute.created': {
        const dispute = entities.dispute?.entity
        const order =
          (await orderBy(payload, 'razorpayPaymentId', dispute?.payment_id)) ??
          (await orderBy(payload, 'razorpayOrderId', payment?.order_id))
        if (!order || !dispute) break
        await addOrderEvent(payload, order.id, {
          type: event,
          source: 'webhook',
          paymentId: dispute.payment_id,
          detail: `${dispute.id}: ${dispute.amount} paise${dispute.reason_code ? `, ${dispute.reason_code}` : ''}`,
        })
        status = 'processed'
        break
      }
    }
  } catch (error) {
    await payload.update({
      collection: 'webhook-events',
      id,
      // Our own errors are safe to keep; a database error's message would list personal data.
      data: {
        status: 'failed',
        error:
          error instanceof RazorpayError || !(error instanceof Error)
            ? String(error)
            : errorCode(error),
      },
      overrideAccess: true,
      depth: 0,
    })
    throw error
  }
  await payload.update({
    collection: 'webhook-events',
    id,
    data: { status, processedAt: new Date().toISOString(), error: null },
    overrideAccess: true,
    depth: 0,
  })
}

/** The daily cleanup job: expired sign-ins, and handled webhook payloads after 90 days. */
export async function cleanup() {
  await deleteExpired()
  const payload = await getClient()
  await payload.delete({
    collection: 'webhook-events',
    where: {
      and: [
        { status: { in: ['processed', 'ignored'] } },
        { receivedAt: { less_than: new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString() } },
      ],
    },
    overrideAccess: true,
    depth: 0,
  })
}
