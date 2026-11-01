import type { JobsConfig, TaskConfig, TaskHandler } from 'payload'

import { hasRole } from '@/access/roles'

const RETRIES = 5

/**
 * What a job failure may record: Payload stores and logs the thrown error's message and stack, and
 * a database error's message lists every bound value (emails, phone numbers).
 */
export function safeError(error: unknown): Error {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause
  const code = cause?.code
  // Our own errors have no cause; drizzle's (named plain "Error") wrap the database's and quote
  // the query's parameters in their message.
  const ours =
    error instanceof Error && /^(RazorpayError|Error)$/.test(error.name) && cause === undefined
  return new Error(
    ours
      ? (error as Error).message
      : typeof code === 'string'
        ? `Database error ${code}`
        : 'Job failed',
  )
}

/** Runs a handler, rethrowing only what may be recorded. */
async function guarded(run: () => Promise<void>) {
  try {
    await run()
  } catch (error) {
    console.error('jobs: failed:', safeError(error).message)
    throw safeError(error)
  }
}

type IdInput = { input: { id: number }; output: object }

/**
 * Telegram when a job has used its last retry (spec §11.3, §18.4). Payload calls onFail after
 * every failed attempt, and a throw here would leave the job stuck in "processing". Imported on
 * use: server-only modules can't load in the Payload CLI, which reads this config.
 */
const alertWhenExhausted =
  (slug: string, retries = RETRIES): TaskConfig['onFail'] =>
  async ({ job, taskStatus }) => {
    if ((taskStatus?.totalTried ?? 0) < retries) return
    try {
      const { sendTelegram } = await import('@/lib/notify')
      await sendTelegram(
        `Job ${slug} #${job.id} failed after ${retries + 1} attempt${retries ? 's' : ''}.`,
      )
    } catch (error) {
      console.error(`jobs/${slug}: alert failed:`, error instanceof Error ? error.message : error)
    }
  }

/** One record id in, so job logs (Payload logs the whole job on error) hold no personal data. */
const idTask = (slug: string, run: (id: number) => Promise<void>): TaskConfig<IdInput> => ({
  slug,
  inputSchema: [{ name: 'id', type: 'number', required: true }],
  retries: { attempts: RETRIES, backoff: { type: 'exponential', delay: 30_000 } },
  handler: (async ({ input }) => {
    await guarded(() => run(input.id))
    return { output: {} }
  }) as TaskHandler<IdInput>,
  onFail: alertWhenExhausted(slug),
})

/**
 * Background work (spec §2, §11.3). Handlers import their code on first use, so the Payload
 * config stays light. autoRun ticks every minute once crons start (instrumentation.ts); route
 * handlers also run the queue right after a payment so emails don't wait for the tick.
 */
export const jobs: JobsConfig = {
  access: { run: ({ req }) => hasRole(req.user, 'owner') },
  autoRun: [{ cron: '* * * * *', queue: 'default' }],
  // Payload never re-claims a job a crash or restart left "processing", and a stuck scheduled job
  // stops its schedule for good. Our jobs take seconds: release any still processing after 30
  // minutes, every tick, before the run.
  shouldAutoRun: async (payload) => {
    await payload.update({
      collection: 'payload-jobs',
      where: {
        and: [
          { processing: { equals: true } },
          { updatedAt: { less_than: new Date(Date.now() - 30 * 60_000).toISOString() } },
        ],
      },
      data: { processing: false },
      overrideAccess: true,
      depth: 0,
    })
    return true
  },
  // Owner can look at the queue (failed jobs and their errors) under System.
  jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
    ...defaultJobsCollection,
    access: { ...defaultJobsCollection.access, read: ({ req }) => hasRole(req.user, 'owner') },
    admin: { ...defaultJobsCollection.admin, hidden: false, group: 'System' },
  }),
  tasks: [
    idTask('processWebhook', async (id) =>
      (await import('@/lib/commerce/webhooks')).processWebhookEvent(id),
    ),
    idTask('renderInvoicePdf', async (id) =>
      (await import('@/lib/invoices/deliver')).storeInvoicePdf(id),
    ),
    idTask('sendOrderEmail', async (id) =>
      (await import('@/lib/invoices/deliver')).sendOrderEmail(id),
    ),
    idTask('sendLicenseEmail', async (id) =>
      (await import('@/lib/licensing/deliver')).sendLicenseEmail(id),
    ),
    idTask('sendDeviceEmail', async (id) =>
      (await import('@/lib/licensing/deliver')).sendDeviceEmail(id),
    ),
    {
      // Late UPI captures and missed webhooks (spec §11.3 step 10). Also the sweep for license
      // status emails nobody could send at once (Phase 9): a task of its own would need a
      // migration, as task slugs are a database enum.
      slug: 'reconcileOrders',
      schedule: [{ cron: '*/15 * * * *', queue: 'default' }],
      retries: 0,
      handler: async () => {
        const [orders, emails] = await Promise.allSettled([
          guarded(async () => (await import('@/lib/commerce/reconcile')).reconcileOrders()),
          guarded(async () => (await import('@/lib/licensing/deliver')).sendPendingStatusEmails()),
        ])
        for (const result of [orders, emails]) if (result.status === 'rejected') throw result.reason
        return { output: {} }
      },
    },
    {
      // Expired sign-ins, and webhook payloads (they hold payer details) after 90 days (spec §16).
      slug: 'cleanup',
      schedule: [{ cron: '30 3 * * *', queue: 'default' }],
      retries: 0,
      handler: async () => {
        await guarded(async () => (await import('@/lib/commerce/webhooks')).cleanup())
        return { output: {} }
      },
    },
    idTask('sendWaitlistEmail', async (id) =>
      (await import('@/lib/waitlist')).sendWaitlistEmail(id),
    ),
    idTask('sendDataRequestAck', async (id) =>
      (await import('@/lib/dataRequests')).sendDataRequestAck(id),
    ),
    {
      // The periods the legal pages publish. 04:00 UTC is 09:30 IST.
      slug: 'remindDataRequests',
      schedule: [{ cron: '0 4 * * *', queue: 'default' }],
      retries: 0,
      onFail: alertWhenExhausted('remindDataRequests', 0),
      handler: async () => {
        await guarded(async () => (await import('@/lib/dataRequests')).remindDataRequests())
        return { output: {} }
      },
    },
  ] as TaskConfig[],
}
