import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
} from 'payload'

import { getClient } from '@/lib/cms'
import { errorCode } from '@/lib/commerce/http'
import { financialYear } from '@/lib/invoices/numbering'
import { addMonthsIST } from '@/lib/licensing/dates'
import { sendTelegram } from '@/lib/notify'

/** A newsletter sign-up nobody confirmed: its link stops working after 7 days. */
const UNCONFIRMED_DAYS = 30
// ponytail: one batch of orders a day, enough unless a backlog ever outlasts a quarter.
const ORDER_BATCH = 200

/** Counts and ids only. A failed alert doesn't stop the job: the next day's run says it again. */
const alert = (text: string) =>
  sendTelegram(text).catch((error: unknown) =>
    console.error('retention: alert failed:', errorCode(error)),
  )

/** What wouldn't go stays for the next run. Telegram hears, as nothing else would say. */
async function reportFailed(count: number, what: string) {
  if (!count) return
  console.error(`retention: ${count} ${what} not deleted`)
  await alert(`Retention: ${count} ${what} could not be deleted. They stay until this is fixed.`)
}

/**
 * Leads (their hooks take the CV and waitlist deliveries too) past the period, and dead sign-ups.
 * Not while their address has an open privacy request, which may be about them.
 */
async function purgeLeads(payload: Payload, months: number, now: Date) {
  const { docs: open } = await payload.find({
    collection: 'data-requests',
    where: { status: { in: ['new', 'in-progress'] } },
    select: { email: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const { docs, errors } = await payload.delete({
    collection: 'leads',
    where: {
      and: [
        ...(open.length ? [{ email: { not_in: open.map((request) => request.email) } }] : []),
        {
          or: [
            { lastActivityAt: { less_than: addMonthsIST(now, -months).toISOString() } },
            {
              and: [
                { type: { equals: 'newsletter' } },
                { confirmedAt: { exists: false } },
                {
                  createdAt: {
                    less_than: new Date(
                      now.getTime() - UNCONFIRMED_DAYS * 86_400_000,
                    ).toISOString(),
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    overrideAccess: true,
    depth: 0,
  })
  await reportFailed(errors.length, 'leads')
  return docs.length
}

/** Closed privacy requests only, however old: an open one still has to be answered. */
async function purgeDataRequests(payload: Payload, months: number, now: Date) {
  const { docs, errors } = await payload.delete({
    collection: 'data-requests',
    where: {
      and: [
        { status: { in: ['completed', 'rejected'] } },
        { handledAt: { less_than: addMonthsIST(now, -months).toISOString() } },
      ],
    },
    overrideAccess: true,
    depth: 0,
  })
  await reportFailed(errors.length, 'privacy requests')
  return docs.length
}

/**
 * The first moment still kept: 1 April IST, `years` before this financial year began. With eight
 * years, financial year 2026-27 goes on 1 April 2035.
 */
export function ordersKeptFrom(now: Date, years: number): Date {
  const thisYear = Number(financialYear(now).slice(0, 4))
  return new Date(`${thisYear - years}-04-01T00:00:00+05:30`)
}

/**
 * One order with its invoices and credit notes, or none of them. Its license stays. The PDFs' files
 * go first and can't roll back: a failure after that leaves invoices that re-render, where deleting
 * them last could leave a PDF nothing points to.
 */
async function removeOrder(payload: Payload, orderId: number) {
  const req = await createLocalReq({ context: { disableRevalidate: true } }, payload)
  await initTransaction(req)
  try {
    const { docs: invoices } = await payload.find({
      collection: 'invoices',
      where: { order: { equals: orderId } },
      select: { number: true },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (invoices.length) {
      const ids = invoices.map((invoice) => invoice.id)
      await payload.delete({
        collection: 'private-files',
        where: {
          and: [{ 'owner.relationTo': { equals: 'invoices' } }, { 'owner.value': { in: ids } }],
        },
        overrideAccess: true,
        depth: 0,
        req,
      })
      await payload.delete({
        collection: 'invoices',
        where: { id: { in: ids } },
        overrideAccess: true,
        depth: 0,
        req,
      })
    }
    await payload.delete({
      collection: 'orders',
      id: orderId,
      overrideAccess: true,
      depth: 0,
      req,
    })
    await commitTransaction(req)
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/**
 * Orders whose every date is older than the legal period: a refund in a later financial year keeps
 * the order until that year's period ends too. Unpaid orders go by their creation date.
 */
async function removeOldOrders(payload: Payload, years: number, now: Date) {
  const keptFrom = ordersKeptFrom(now, years).toISOString()
  const { rows } = await (payload.db as unknown as PostgresAdapter).drizzle.execute(sql`
    SELECT o.id FROM orders o
    WHERE o.created_at < ${keptFrom} AND o.updated_at < ${keptFrom}
      AND (o.paid_at IS NULL OR o.paid_at < ${keptFrom})
      AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id AND i.issued_at >= ${keptFrom})
    ORDER BY o.id
    LIMIT ${ORDER_BATCH}
  `)
  let removed = 0
  for (const { id } of rows as { id: number }[]) {
    try {
      await removeOrder(payload, id)
      removed++
    } catch (error) {
      console.error(`retention: order ${id} not removed:`, errorCode(error))
      await alert(`Retention: order #${id} could not be removed. It stays until this is fixed.`)
    }
  }
  return removed
}

/**
 * The retention settings (src/globals/RetentionSettings.ts), with the daily cleanup job. Removals
 * can't be undone, so Telegram hears how many went (counts only). Backups keep them for about a
 * year, and a restore brings them back until this next runs.
 */
export async function applyRetention(now = new Date()) {
  const payload = await getClient()
  const settings = await payload.findGlobal({
    slug: 'retention-settings',
    depth: 0,
    overrideAccess: true,
  })
  const removed: [string, number][] = [
    ['leads', await purgeLeads(payload, settings.leadMonths, now)],
    [
      'closed privacy requests',
      settings.dataRequestMonths
        ? await purgeDataRequests(payload, settings.dataRequestMonths, now)
        : 0,
    ],
    [
      'orders',
      settings.removeOrders ? await removeOldOrders(payload, settings.orderFinancialYears, now) : 0,
    ],
  ]
  const summary = removed.filter(([, count]) => count).map(([what, count]) => `${count} ${what}`)
  if (summary.length) await alert(`Retention: removed ${summary.join(', ')}.`)
}
