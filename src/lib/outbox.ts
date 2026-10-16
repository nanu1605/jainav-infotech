import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { EmailAdapter } from 'payload'

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
    await mkdir(OUTBOX_DIR, { recursive: true })
    const file = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`
    await writeFile(path.join(OUTBOX_DIR, file), JSON.stringify(message, null, 2))
  },
})
