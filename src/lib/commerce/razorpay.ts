import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { z } from 'zod'

import { SITE_URL } from '@/lib/seo'

/**
 * The stand-in gateway's keys (src/app/api/v1/dev/razorpay): development and tests use it while
 * RAZORPAY_KEY_ID is empty, the way Turnstile falls back to its test keys. Never in production.
 */
export const DEV_GATEWAY = {
  keyId: 'rzp_test_devgateway',
  keySecret: 'dev-gateway-key-secret',
  webhookSecret: 'dev-gateway-webhook-secret',
} as const

export type RazorpayConfig = {
  keyId: string
  keySecret: string
  webhookSecret: string
  apiBase: string
  /** Razorpay Checkout's script, or the stand-in's. */
  script: string
  dev: boolean
}

/** The gateway to use, or null when payments can't be taken (production without keys). */
export function razorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (keyId) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!keySecret || !webhookSecret) {
      console.error('RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET must be set with the key id.')
      return null
    }
    return {
      keyId,
      keySecret,
      webhookSecret,
      apiBase: 'https://api.razorpay.com/v1',
      script: 'https://checkout.razorpay.com/v1/checkout.js',
      dev: false,
    }
  }
  if (process.env.NODE_ENV === 'production') return null
  return {
    ...DEV_GATEWAY,
    apiBase: `${SITE_URL}/api/v1/dev/razorpay`,
    script: '/api/v1/dev/razorpay/checkout.js',
    dev: true,
  }
}

export const hmacHex = (secret: string, data: string) =>
  createHmac('sha256', secret).update(data).digest('hex')

const sameHex = (expected: string, given: string) => {
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(given, 'hex')
  return a.length === 32 && a.length === b.length && timingSafeEqual(a, b)
}

/** Checkout's signature: HMAC-SHA256 of `order_id|payment_id` with the key secret (spec §11.3). */
export const paymentSignatureValid = (
  cfg: RazorpayConfig,
  orderId: string,
  paymentId: string,
  signature: string,
) => sameHex(hmacHex(cfg.keySecret, `${orderId}|${paymentId}`), signature)

/** A webhook's X-Razorpay-Signature: HMAC-SHA256 of the raw body with the webhook secret. */
export const webhookSignatureValid = (cfg: RazorpayConfig, rawBody: string, signature: string) =>
  sameHex(hmacHex(cfg.webhookSecret, rawBody), signature)

export const paymentSchema = z.object({
  id: z.string(),
  order_id: z.string().nullable(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  error_code: z.string().nullish(),
  /** Paise refunded so far (Phase 9). */
  amount_refunded: z.number().int().nullish(),
})
export type RazorpayPayment = z.infer<typeof paymentSchema>

/** Razorpay sends empty notes as `[]`. */
const notesSchema = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .nullish()
  .transform((notes) => (notes && !Array.isArray(notes) ? notes : {}))

export const refundSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  amount: z.number().int(),
  currency: z.string().optional(),
  status: z.string(),
  notes: notesSchema,
})
export type RazorpayRefund = z.infer<typeof refundSchema>

/** A chargeback (webhooks only): `respond_by` is a Unix time in seconds. */
export const disputeSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  amount: z.number().int(),
  reason_code: z.string().nullish(),
  respond_by: z.number().nullish(),
  status: z.string().nullish(),
})
export type RazorpayDispute = z.infer<typeof disputeSchema>

const orderSchema = z.object({
  id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
})

export class RazorpayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Razorpay's own explanation, e.g. "The payment has been fully refunded already." */
    readonly description = '',
  ) {
    super(`Razorpay API error ${status} ${code}`)
    this.name = 'RazorpayError'
  }
}

async function call<T>(
  cfg: RazorpayConfig,
  method: 'GET' | 'POST',
  path: string,
  schema: z.ZodType<T>,
  body?: object,
): Promise<T> {
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64')}`,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (data as { error?: { code?: unknown; description?: unknown } } | null)?.error
    throw new RazorpayError(
      res.status,
      typeof error?.code === 'string' ? error.code : 'unknown',
      typeof error?.description === 'string' ? error.description.slice(0, 200) : '',
    )
  }
  return schema.parse(data)
}

/** Orders API (spec §11.3 step 3): amount in paise, receipt = our order number. */
export const createRazorpayOrder = (
  cfg: RazorpayConfig,
  order: { amount: number; receipt: string; notes: Record<string, string> },
) => call(cfg, 'POST', '/orders', orderSchema, { ...order, currency: 'INR' })

/** Payments fetch: the source of truth before fulfilling (spec §3, §11.3 step 5). */
export const fetchPayment = (cfg: RazorpayConfig, id: string) =>
  call(cfg, 'GET', `/payments/${encodeURIComponent(id)}`, paymentSchema)

/**
 * Refunds API (spec §11.6): `amount` in paise. Notes carry our order id and number only: the
 * reason stays in our database.
 */
export const createRefund = (
  cfg: RazorpayConfig,
  paymentId: string,
  refund: { amount: number; notes: Record<string, string> },
) => call(cfg, 'POST', `/payments/${encodeURIComponent(paymentId)}/refund`, refundSchema, refund)

/** Every payment attempt on an order (reconciliation, spec §11.3 step 10). */
export const fetchOrderPayments = async (cfg: RazorpayConfig, orderId: string) =>
  (
    await call(
      cfg,
      'GET',
      `/orders/${encodeURIComponent(orderId)}/payments`,
      z.object({ items: z.array(paymentSchema) }),
    )
  ).items
