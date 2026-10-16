import { randomBytes } from 'node:crypto'

import { after } from 'next/server'

import { DEV_GATEWAY, hmacHex, razorpayConfig } from '@/lib/commerce/razorpay'
import { SITE_URL } from '@/lib/seo'

/**
 * A stand-in for Razorpay in local development and tests, used while RAZORPAY_KEY_ID is empty
 * (spec §11.3 is built and tested before the test keys arrive). It answers the three API calls
 * the store makes, serves a checkout.js with the same browser API, and signs and delivers
 * webhooks like Razorpay does. Every route 404s once real keys are set, and in production.
 *
 * Test-only endpoints: POST /pay {order_id, outcome: success|authorized|failure, webhooks?}
 * (what the stand-in checkout calls), POST /capture {payment_id} (a late capture) and
 * POST /replay {event_id} (redelivers a webhook with the same event id).
 */

type DevOrder = {
  id: string
  entity: 'order'
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  notes: Record<string, string>
  status: 'created' | 'attempted' | 'paid'
  attempts: number
  created_at: number
}
type DevPayment = {
  id: string
  entity: 'payment'
  amount: number
  currency: string
  status: 'authorized' | 'captured' | 'failed'
  order_id: string
  captured: boolean
  method: 'upi'
  error_code: string | null
  created_at: number
}
type DevEvent = { id: string; body: string }

// Module state doesn't survive Next's dev reloads; globalThis does (until the server restarts).
const state = ((globalThis as { __devGateway?: object }).__devGateway ??= {
  orders: new Map<string, DevOrder>(),
  payments: new Map<string, DevPayment>(),
  events: new Map<string, DevEvent>(),
}) as {
  orders: Map<string, DevOrder>
  payments: Map<string, DevPayment>
  events: Map<string, DevEvent>
}

const id = (prefix: string) =>
  `${prefix}_dev${randomBytes(10).toString('base64url').replace(/[-_]/g, 'x')}`
const now = () => Math.floor(Date.now() / 1000)
const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const apiError = (status: number, description: string) =>
  json(status, { error: { code: 'BAD_REQUEST_ERROR', description } })

const authorized = (req: Request) =>
  req.headers.get('authorization') ===
  `Basic ${Buffer.from(`${DEV_GATEWAY.keyId}:${DEV_GATEWAY.keySecret}`).toString('base64')}`

/** Signs and delivers one webhook to our own endpoint, the way Razorpay does. */
async function deliver(eventId: string) {
  const event = state.events.get(eventId)
  if (!event) return
  try {
    await fetch(`${SITE_URL}/api/v1/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': hmacHex(DEV_GATEWAY.webhookSecret, event.body),
        'x-razorpay-event-id': event.id,
      },
      body: event.body,
    })
  } catch (error) {
    console.error(
      'dev gateway: webhook delivery failed:',
      error instanceof Error ? error.message : error,
    )
  }
}

function emit(event: string, payment: DevPayment, withOrder = false): string {
  const order = state.orders.get(payment.order_id)
  const entityPayload: Record<string, { entity: unknown }> = { payment: { entity: payment } }
  if (withOrder && order) entityPayload.order = { entity: order }
  const eventId = id('evt')
  state.events.set(eventId, {
    id: eventId,
    body: JSON.stringify({
      entity: 'event',
      account_id: 'acc_dev',
      event,
      contains: Object.keys(entityPayload),
      payload: entityPayload,
      created_at: now(),
    }),
  })
  return eventId
}

function capture(payment: DevPayment): string[] {
  payment.status = 'captured'
  payment.captured = true
  const order = state.orders.get(payment.order_id)
  if (order) {
    order.status = 'paid'
    order.amount_paid = order.amount
    order.amount_due = 0
  }
  return [emit('payment.captured', payment), emit('order.paid', payment, true)]
}

const CHECKOUT_JS = `(() => {
  const base = '/api/v1/dev/razorpay'
  const el = (tag, text, css) => {
    const node = document.createElement(tag)
    if (text) node.textContent = text
    if (css) node.style.cssText = css
    return node
  }
  class Razorpay {
    constructor(options) { this.options = options; this.listeners = {} }
    on(event, callback) { (this.listeners[event] = this.listeners[event] || []).push(callback) }
    open() {
      const o = this.options
      const dialog = el('dialog', '', 'margin:auto;max-width:24rem;padding:1.5rem;border:1px solid var(--border);border-radius:0.75rem;background:var(--surface);color:var(--fg);font:inherit')
      dialog.setAttribute('aria-labelledby', 'dev-gateway-title')
      const title = el('h2', 'Test payment', 'margin:0 0 0.5rem;font-size:1.25rem;font-weight:600')
      title.id = 'dev-gateway-title'
      const amount = (o.amount / 100).toFixed(2) + ' ' + o.currency
      dialog.append(title, el('p', 'Development gateway: no money moves. ' + o.description + ', ' + amount + '.', 'margin:0 0 1rem;color:var(--fg-muted)'))
      const finish = async (outcome) => {
        dialog.close()
        dialog.remove()
        if (!outcome) return o.modal && o.modal.ondismiss && o.modal.ondismiss()
        const res = await fetch(base + '/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: o.order_id, outcome }) })
        const data = await res.json()
        if (outcome === 'failure') (this.listeners['payment.failed'] || []).forEach((cb) => cb({ error: data.error }))
        else o.handler && o.handler(data.response)
      }
      for (const [label, outcome] of [['Pay', 'success'], ['Authorize only (capture later)', 'authorized'], ['Fail the payment', 'failure'], ['Cancel', null]]) {
        const button = el('button', label, 'display:block;width:100%;margin-top:0.5rem;padding:0.6rem 1rem;border:1px solid var(--border-strong);border-radius:0.5rem;background:' + (outcome === 'success' ? 'var(--primary);color:var(--primary-fg)' : 'var(--bg);color:var(--fg)') + ';font:inherit;cursor:pointer')
        button.type = 'button'
        button.addEventListener('click', () => finish(outcome))
        dialog.append(button)
      }
      dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(null) })
      document.body.append(dialog)
      dialog.showModal()
    }
  }
  window.Razorpay = Razorpay
})()
`

async function body(req: Request): Promise<Record<string, unknown>> {
  return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: Request, { params }: Ctx) {
  if (!razorpayConfig()?.dev) return new Response('Not found', { status: 404 })
  const path = (await params).path
  if (path.join('/') === 'checkout.js') {
    return new Response(CHECKOUT_JS, {
      headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
  if (!authorized(req)) return apiError(401, 'Authentication failed')
  if (path[0] === 'payments' && path.length === 2) {
    const payment = state.payments.get(path[1]!)
    return payment ? json(200, payment) : apiError(400, 'The id provided does not exist')
  }
  if (path[0] === 'orders' && path[2] === 'payments' && path.length === 3) {
    if (!state.orders.has(path[1]!)) return apiError(400, 'The id provided does not exist')
    const items = [...state.payments.values()].filter((p) => p.order_id === path[1])
    return json(200, { entity: 'collection', count: items.length, items })
  }
  return apiError(404, 'The requested URL was not found on the server.')
}

export async function POST(req: Request, { params }: Ctx) {
  if (!razorpayConfig()?.dev) return new Response('Not found', { status: 404 })
  const path = (await params).path.join('/')
  const data = await body(req)

  if (path === 'orders') {
    if (!authorized(req)) return apiError(401, 'Authentication failed')
    const amount = Number(data.amount)
    if (!Number.isInteger(amount) || amount < 100) {
      return apiError(400, 'The amount must be atleast INR 1.00')
    }
    const order: DevOrder = {
      id: id('order'),
      entity: 'order',
      amount,
      amount_paid: 0,
      amount_due: amount,
      currency: String(data.currency),
      receipt: String(data.receipt ?? ''),
      notes: (data.notes as Record<string, string>) ?? {},
      status: 'created',
      attempts: 0,
      created_at: now(),
    }
    state.orders.set(order.id, order)
    return json(200, order)
  }

  if (path === 'pay') {
    const order = state.orders.get(String(data.order_id))
    if (!order) return apiError(400, 'Unknown order')
    const outcome = String(data.outcome)
    order.attempts++
    if (order.status === 'created') order.status = 'attempted'
    const payment: DevPayment = {
      id: id('pay'),
      entity: 'payment',
      amount: order.amount,
      currency: order.currency,
      status: outcome === 'failure' ? 'failed' : 'authorized',
      order_id: order.id,
      captured: false,
      method: 'upi',
      error_code: outcome === 'failure' ? 'BAD_REQUEST_ERROR' : null,
      created_at: now(),
    }
    state.payments.set(payment.id, payment)
    const events =
      outcome === 'success'
        ? capture(payment)
        : [emit(outcome === 'failure' ? 'payment.failed' : 'payment.authorized', payment)]
    if (data.webhooks !== false)
      after(async () => {
        for (const eventId of events) await deliver(eventId)
      })
    if (outcome === 'failure') {
      return json(200, {
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Payment failed',
          reason: 'payment_failed',
          metadata: { order_id: order.id, payment_id: payment.id },
        },
        events,
      })
    }
    return json(200, {
      response: {
        razorpay_payment_id: payment.id,
        razorpay_order_id: order.id,
        razorpay_signature: hmacHex(DEV_GATEWAY.keySecret, `${order.id}|${payment.id}`),
      },
      events,
    })
  }

  if (path === 'capture') {
    const payment = state.payments.get(String(data.payment_id))
    if (!payment || payment.status !== 'authorized') return apiError(400, 'Not capturable')
    const events = capture(payment)
    if (data.webhooks !== false)
      after(async () => {
        for (const eventId of events) await deliver(eventId)
      })
    return json(200, { payment, events })
  }

  if (path === 'replay') {
    const eventId = String(data.event_id)
    if (!state.events.has(eventId)) return apiError(400, 'Unknown event')
    await deliver(eventId)
    return json(200, { ok: true })
  }

  return apiError(404, 'The requested URL was not found on the server.')
}
