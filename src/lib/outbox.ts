import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EmailAdapter } from 'payload'

type Attachment = { filename?: string; contentType?: string; content?: unknown; encoding?: string }

/** Where development writes emails instead of sending them. E2E tests read them back. */
export const OUTBOX_DIR = path.resolve(process.cwd(), '.outbox')

/**
 * Email adapter for running without Resend. Development writes each message to `.outbox/` as
 * JSON (a local test mailbox); production drops it and logs only that it did, because Payload's
 * console adapter would print personal data into the logs.
 */
export const outboxAdapter: EmailAdapter = () => ({
  name: 'outbox',
  defaultFromAddress: process.env.EMAIL_FROM || 'hello@jainav.test',
  defaultFromName: 'Jainav Infotech',
  sendEmail: async (message) => {
    if (process.env.NODE_ENV === 'production') {
      console.error('RESEND_API_KEY is not set: an email was not sent.')
      return
    }
    // Attachments as a fingerprint, not their bytes: tests check what was attached. (Payload types
    // messages with nodemailer's types, which aren't installed, so this spells out the shape.)
    const sent = message.attachments as Attachment[] | undefined
    const attachments = sent?.map(({ filename, contentType, content, encoding }) => {
      const bytes =
        typeof content === 'string'
          ? Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf8')
          : Buffer.isBuffer(content)
            ? content
            : Buffer.alloc(0) // streams and paths: sendEmail never passes them
      return {
        filename,
        contentType,
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      }
    })
    await mkdir(OUTBOX_DIR, { recursive: true })
    const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`
    await writeFile(
      path.join(OUTBOX_DIR, file),
      JSON.stringify({ ...message, attachments }, null, 2),
    )
  },
})
