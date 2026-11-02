import 'server-only'

import type { Payload } from 'payload'

import type { RenderedEmail } from '@/emails'

export type Inbox = 'hello' | 'sales' | 'support' | 'careers' | 'privacy'

/** The routed inbox from site settings, else the general one; null while both are placeholders. */
export async function inboxAddress(payload: Payload, inbox: Inbox): Promise<string | null> {
  const { company } = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })
  return company?.emails?.[inbox] || company?.emails?.hello || process.env.EMAIL_REPLY_TO || null
}

export type EmailAttachment = { filename: string; content: Buffer; contentType?: string }

export async function sendEmail(
  payload: Payload,
  to: string,
  email: RenderedEmail,
  opts: {
    replyTo?: string | null
    headers?: Record<string, string>
    attachments?: EmailAttachment[]
  } = {},
) {
  await payload.sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: opts.replyTo || process.env.EMAIL_REPLY_TO || undefined,
    headers: opts.headers,
    // Base64 strings: the Resend adapter JSON-encodes the message, which would turn a Buffer into
    // a list of numbers. `encoding` tells nodemailer-style adapters (and the outbox) to decode it;
    // Resend ignores it and contentType, and types the file by its extension.
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content.toString('base64'),
      encoding: 'base64',
      contentType: a.contentType,
    })),
  })
}

/**
 * Telegram alert (spec §13). Keep personal data out of `text`: Telegram is a third party, so
 * alerts say what happened and link to the admin, where the details are.
 */
export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    if (process.env.NODE_ENV !== 'production') console.info(`[telegram skipped] ${text}`)
    return
  }
  // Telegram takes the token only in the path, which is why scrub.ts filters this URL shape.
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status}`)
}

/** Runs notifications side by side; one failing never stops the others or reaches the visitor. */
export async function settle(label: string, tasks: Promise<unknown>[]) {
  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`${label}: notification failed: ${reason}`)
    }
  }
}
