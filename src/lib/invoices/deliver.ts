import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, type Payload, type PayloadHandler } from 'payload'

import { orderConfirmationEmail, refundEmail } from '@/emails'
import { getClient } from '@/lib/cms'
import { requireRole, routeId } from '@/lib/commerce/adminEndpoint'
import { addOrderEvent } from '@/lib/commerce/fulfil'
import { errorCode } from '@/lib/commerce/http'
import { once, orderLicenseKey } from '@/lib/licensing/deliver'
import { inboxAddress, sendEmail } from '@/lib/notify'
import { absoluteUrl } from '@/lib/seo'
import type { Invoice } from '@/payload-types'

import { renderInvoicePdf } from './pdf'

const drizzle = (payload: Payload) => (payload.db as unknown as PostgresAdapter).drizzle

/** An invoice's PDF, drawn from the immutable record (credit notes name their invoice). */
export async function invoicePdf(invoice: Invoice): Promise<Buffer> {
  const original = typeof invoice.originalInvoice === 'object' ? invoice.originalInvoice : null
  return renderInvoicePdf(invoice, {
    original: original ? { number: original.number, issuedAt: original.issuedAt } : undefined,
  })
}

export const pdfFilename = (invoice: Pick<Invoice, 'number'>) =>
  `${invoice.number.replaceAll('/', '-')}.pdf`

/** A fresh PDF of the invoice in the private bucket, owned by the invoice (not linked yet). */
async function storePdfFile(payload: Payload, invoice: Invoice) {
  const pdf = await invoicePdf(invoice)
  return payload.create({
    collection: 'private-files',
    data: { purpose: 'invoice', owner: { relationTo: 'invoices', value: invoice.id } },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `${pdfFilename(invoice).slice(0, -4)}-${randomUUID().slice(0, 8)}.pdf`,
      size: pdf.length,
    },
    overrideAccess: true,
    depth: 0,
  })
}

/**
 * The renderInvoicePdf job (spec §11.3 step 8): stores the invoice PDF in the private bucket as
 * the archived original and links it (once: a parallel run's copy is deleted).
 */
export async function storeInvoicePdf(id: number) {
  const payload = await getClient()
  const invoice = await payload.findByID({
    collection: 'invoices',
    id,
    depth: 1,
    overrideAccess: true,
  })
  if (invoice.pdf) return
  const file = await storePdfFile(payload, invoice)
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE invoices SET pdf_id = ${file.id}, updated_at = now()
    WHERE id = ${id} AND pdf_id IS NULL RETURNING id
  `)
  if (!rows.length) {
    await payload.delete({
      collection: 'private-files',
      id: file.id,
      overrideAccess: true,
      depth: 0,
    })
  }
}

/**
 * The sendOrderEmail job (spec §11.7): the order confirmation with the license key and the invoice
 * attached, in the order's language. Claimed in SQL first, so parallel runs never send it twice; a failed send
 * releases the claim for the retry. The claim is a 12-minute lease: shorter than the 30 minutes
 * after which src/jobs releases a job a dead process left running, and than the retries' span (the
 * last of five starts about 15 minutes after the first), so a dead run's claim is retaken in time.
 * A claim still held without the email recorded as sent fails the run: Payload retries, then
 * alerts, instead of the job ending silently without an email.
 */
export async function sendOrderEmail(orderId: number) {
  const payload = await getClient()
  const sent = JSON.stringify([{ type: 'emailed' }])
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE orders SET emailed_at = now()
    WHERE id = ${orderId}
      AND (emailed_at IS NULL
        OR (emailed_at < now() - interval '12 minutes'
          AND NOT (COALESCE(events, '[]'::jsonb) @> ${sent}::jsonb)))
    RETURNING id
  `)
  if (!rows.length) {
    const { rows: done } = await drizzle(payload).execute(sql`
      SELECT 1 FROM orders WHERE id = ${orderId} AND COALESCE(events, '[]'::jsonb) @> ${sent}::jsonb
    `)
    if (done.length) return
    throw new Error('Order email is claimed by another run')
  }
  try {
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
      locale: 'en',
      overrideAccess: true,
    })
    const invoice = typeof order.invoice === 'object' ? order.invoice : null
    if (!invoice) throw new Error('Order has no invoice')
    const item = order.items[0]!
    const productId = typeof item.product === 'object' ? item.product.id : item.product
    const planId = typeof item.plan === 'object' ? item.plan.id : item.plan
    const [product, plan] = await Promise.all([
      payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        locale: order.locale,
        overrideAccess: true,
      }),
      payload.findByID({
        collection: 'plans',
        id: planId,
        depth: 0,
        locale: order.locale,
        overrideAccess: true,
      }),
    ])
    const message = await orderConfirmationEmail({
      locale: order.locale,
      orderNumber: order.orderNumber,
      productName: product.name,
      planName: plan.name ?? plan.code,
      total: order.total,
      invoiceNumber: invoice.number,
      licenseKey: await orderLicenseKey(payload, orderId),
      accountUrl: absoluteUrl(order.locale, '/account/orders'),
    })
    await sendEmail(payload, order.billing.email, message, {
      replyTo: await inboxAddress(payload, 'support'),
      attachments: [
        {
          filename: pdfFilename(invoice),
          content: await invoicePdf(invoice),
          contentType: 'application/pdf',
        },
      ],
    })
    await addOrderEvent(payload, orderId, { type: 'emailed', detail: invoice.number })
  } catch (error) {
    await drizzle(payload).execute(sql`UPDATE orders SET emailed_at = NULL WHERE id = ${orderId}`)
    throw error
  }
}

const idOf = (value: number | { id: number }) => (typeof value === 'object' ? value.id : value)

/**
 * The refund email (spec §11.7), sent once per credit note like the license emails: the amount,
 * whether the whole order is now refunded (its license is then revoked) and the credit note PDF,
 * in the order's language. Nobody gets it once the customer's account is deleted.
 */
export async function sendRefundEmail(creditNoteId: number) {
  const payload = await getClient()
  await once(payload, 'invoices', creditNoteId, async () => {
    const note = await payload.findByID({
      collection: 'invoices',
      id: creditNoteId,
      depth: 1,
      overrideAccess: true,
    })
    const order = await payload.findByID({
      collection: 'orders',
      id: idOf(note.order),
      depth: 0,
      overrideAccess: true,
    })
    const customer = await payload.findByID({
      collection: 'customers',
      id: idOf(order.customer),
      depth: 0,
      overrideAccess: true,
    })
    if (customer.status === 'deleted') return
    const [product, { docs: notes }] = await Promise.all([
      payload.findByID({
        collection: 'products',
        id: idOf(order.items[0]!.product),
        depth: 0,
        locale: order.locale,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'invoices',
        where: {
          and: [
            { order: { equals: order.id } },
            { kind: { equals: 'credit-note' } },
            { id: { less_than_equal: note.id } },
          ],
        },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      }),
    ])
    // Up to this note: a retry sent after a later refund still tells this one as it was.
    const refunded = notes.reduce((sum, n) => sum + n.totals.total, 0)
    const message = await refundEmail({
      locale: order.locale,
      orderNumber: order.orderNumber,
      amount: note.totals.total,
      refunded,
      creditNoteNumber: note.number,
      full: refunded >= order.total,
      productName: product.name,
      accountUrl: absoluteUrl(order.locale, '/account/orders'),
    })
    await sendEmail(payload, order.billing.email, message, {
      replyTo: await inboxAddress(payload, 'support'),
      attachments: [
        {
          filename: pdfFilename(note),
          content: await invoicePdf(note),
          contentType: 'application/pdf',
        },
      ],
    })
  })
}

/**
 * POST /api/invoices/:id/render-pdf (spec §10), Owner only: a new archived PDF drawn from the
 * immutable record (same number, same amounts) replaces the stored one, which is deleted.
 * Response: `{ ok: true, pdf: <private file id> }`.
 */
export const renderPdfEndpoint: PayloadHandler = async (req) => {
  requireRole(req, 'Only the Owner can re-render an invoice.', 'owner')
  const id = routeId(req)
  const payload = req.payload
  const invoice = await payload
    .findByID({ collection: 'invoices', id, depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!invoice) throw new APIError('Not found.', 404)
  const file = await storePdfFile(payload, invoice)
  // The locked subquery reads the link as stored when this runs, so of two re-renders at once
  // the second deletes the first one's file, never the original twice.
  const { rows } = await drizzle(payload).execute(sql`
    UPDATE invoices i SET pdf_id = ${file.id}, updated_at = now()
    FROM (SELECT id, pdf_id FROM invoices WHERE id = ${id} FOR UPDATE) old
    WHERE i.id = old.id
    RETURNING old.pdf_id AS old
  `)
  const old = (rows[0] as { old: number | null } | undefined)?.old
  if (old) {
    await payload
      .delete({ collection: 'private-files', id: old, overrideAccess: true, depth: 0 })
      .catch((error: unknown) =>
        console.error(`invoices: old PDF ${old} not deleted:`, errorCode(error)),
      )
  }
  return Response.json({ ok: true, pdf: file.id })
}
