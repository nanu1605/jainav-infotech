import type { JobsConfig, TaskConfig, TaskHandler } from 'payload'

import { hasRole } from '@/access/roles'

const RETRIES = 5

/**
 * What a job failure may record: Payload stores and logs the thrown error's message and stack, and
 * a database error's message lists every bound value (emails, phone numbers).
 */
function safeError(error: unknown): Error {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code
  const ours = error instanceof Error && /^(RazorpayError|Error)$/.test(error.name) && !code
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
  (slug: string): TaskConfig['onFail'] =>
  async ({ job, taskStatus }) => {
    if ((taskStatus?.totalTried ?? 0) < RETRIES) return
    try {
      const { sendTelegram } = await import('@/lib/notify')
      await sendTelegram(`Job ${slug} #${job.id} failed after ${RETRIES + 1} attempts.`)
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
    {
      // Late UPI captures and missed webhooks (spec §11.3 step 10).
      slug: 'reconcileOrders',
      schedule: [{ cron: '*/15 * * * *', queue: 'default' }],
      retries: 0,
      handler: async () => {
        await guarded(async () => (await import('@/lib/commerce/reconcile')).reconcileOrders())
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
  ] as TaskConfig[],
}
