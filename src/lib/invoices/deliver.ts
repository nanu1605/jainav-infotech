import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { orderConfirmationEmail } from '@/emails'
import { getClient } from '@/lib/cms'
import { addOrderEvent } from '@/lib/commerce/fulfil'
import { orderLicenseKey } from '@/lib/licensing/deliver'
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
  const pdf = await invoicePdf(invoice)
  const file = await payload.create({
    collection: 'private-files',
    data: { purpose: 'invoice', owner: { relationTo: 'invoices', value: id } },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `${pdfFilename(invoice).slice(0, -4)}-${randomUUID().slice(0, 8)}.pdf`,
      size: pdf.length,
    },
    overrideAccess: true,
    depth: 0,
  })
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
 * releases the claim for the retry. The claim is a 20-minute lease, shorter than the 30 minutes
 * after which src/jobs releases a job a dead process left running, so that re-run can take it.
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
        OR (emailed_at < now() - interval '20 minutes'
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
