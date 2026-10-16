import type { JobsConfig, TaskConfig, TaskHandler } from 'payload'

import { hasRole } from '@/access/roles'

const RETRIES = 5

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
    await run(input.id)
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
      (await import('@/lib/invoices/deliver')).renderInvoicePdf(id),
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
        await (await import('@/lib/commerce/reconcile')).reconcileOrders()
        return { output: {} }
      },
    },
    {
      slug: 'cleanupSignIns',
      schedule: [{ cron: '30 3 * * *', queue: 'default' }],
      retries: 0,
      handler: async () => {
        await (await import('@/lib/account/session')).deleteExpired()
        return { output: {} }
      },
    },
  ] as TaskConfig[],
}
