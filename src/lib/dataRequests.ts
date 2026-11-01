import 'server-only'

import { dataRequestEmail, notificationEmail } from '@/emails'
import { getClient } from '@/lib/cms'
import { formatDate } from '@/lib/format'
import { addMonthsIST } from '@/lib/licensing/dates'
import { once } from '@/lib/licensing/deliver'
import { inboxAddress, sendEmail, sendTelegram, settle } from '@/lib/notify'
import { SITE_URL } from '@/lib/seo'
import { randomCode } from '@/lib/tokens'
import type { DataRequest } from '@/payload-types'

/** Ticket numbers like JT-7K2QDM9X, for a person to quote (like order numbers). */
export const newTicketNumber = () => `JT-${randomCode(8)}`

/** The periods the legal pages publish, from the moment a request arrives (one month in IST). */
export const dueDates = (type: DataRequest['type'], received: Date) => ({
  dueAt: addMonthsIST(received, 1).toISOString(),
  acknowledgeBy:
    type === 'grievance' ? new Date(received.getTime() + 48 * 3_600_000).toISOString() : null,
})

/**
 * The sendDataRequestAck job: the automatic acknowledgement, once (`acknowledgedAt` is its sent
 * time, so staff recording one by hand stops it too). A job rather than after(): it retries, then
 * alerts, and an open request without it shows in the daily reminder.
 */
export async function sendDataRequestAck(id: number) {
  const payload = await getClient()
  await once(payload, 'data_requests', id, async () => {
    const request = await payload.findByID({
      collection: 'data-requests',
      id,
      depth: 0,
      overrideAccess: true,
    })
    const message = await dataRequestEmail({
      locale: request.locale ?? 'en',
      ticketNumber: request.ticketNumber ?? '',
      type: request.type,
      receivedAt: request.createdAt,
    })
    await sendEmail(payload, request.email, message, {
      replyTo: await inboxAddress(payload, 'privacy'),
    })
  })
}

/** The automatic email gets this long before an open request counts as not acknowledged. */
const ACK_GRACE_MS = 3_600_000
const DUE_SOON_MS = 7 * 86_400_000
/** Telegram refuses messages over 4096 characters. */
const MAX_LINES = 30

type Open = Pick<
  DataRequest,
  'ticketNumber' | 'type' | 'createdAt' | 'acknowledgeBy' | 'acknowledgedAt' | 'dueAt'
>

/**
 * What each open request still needs, as [ticket and type, what]: ticket numbers and types only,
 * so Telegram gets no personal data.
 */
export function reminders(requests: Open[], now: Date): [string, string][] {
  const at = now.getTime()
  return requests.flatMap((request) => {
    const label = `${request.ticketNumber} (${request.type})`
    const lines: [string, string][] = []
    if (!request.acknowledgedAt && Date.parse(request.createdAt) < at - ACK_GRACE_MS) {
      const by = request.acknowledgeBy
      const when =
        by && `, due ${formatDate('en', by, { dateStyle: 'medium', timeStyle: 'short' })} IST`
      lines.push([label, `not acknowledged${when || ''}`])
    }
    if (request.dueAt) {
      const date = formatDate('en', request.dueAt)
      const due = Date.parse(request.dueAt)
      if (due < at) lines.push([label, `overdue since ${date}`])
      else if (due < at + DUE_SOON_MS) lines.push([label, `due ${date}`])
    }
    return lines
  })
}

/**
 * The remindDataRequests job, daily: open requests whose published period is close or past go to
 * Telegram and the privacy inbox, every day until someone closes them. Silent otherwise.
 */
export async function remindDataRequests(now = new Date()) {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'data-requests',
    where: { status: { in: ['new', 'in-progress'] } },
    sort: 'dueAt',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const lines = reminders(docs, now)
  if (!lines.length) return
  const adminUrl = `${SITE_URL}/admin/collections/data-requests`
  const title = `Privacy requests need attention: ${lines.length}`
  const shown = lines.slice(0, MAX_LINES).map(([label, what]) => `${label}: ${what}`)
  await settle('privacy request reminder', [
    sendTelegram([title, ...shown, adminUrl].join('\n')),
    (async () => {
      const to = await inboxAddress(payload, 'privacy')
      if (!to) return console.warn('No privacy inbox in site settings: reminder not emailed.')
      await sendEmail(payload, to, await notificationEmail({ title, adminUrl, fields: lines }))
    })(),
  ])
}
