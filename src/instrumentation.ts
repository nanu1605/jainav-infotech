import type { Instrumentation } from 'next'

// Sentry stays off until SENTRY_DSN is set (spec §18.4). The app has no edge code (proxy.ts runs
// on Node.js), so only the Node.js runtime is set up.
const enabled = () => Boolean(process.env.SENTRY_DSN) && process.env.NEXT_RUNTIME === 'nodejs'

export async function register() {
  if (enabled()) {
    const { initSentry } = await import('@/lib/sentry')
    initSentry(process.env.SENTRY_DSN!)
  }
  // Start the jobs queue's crons at boot (reconciliation, cleanup), not at the first request.
  // Not while building: CI image builds have no database.
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.SKIP_DB_AT_BUILD !== '1'
  ) {
    try {
      const { getClient } = await import('@/lib/cms')
      await getClient()
    } catch (error) {
      console.error(
        'Payload did not start at boot:',
        error instanceof Error ? error.message : error,
      )
    }
    // Sign-in codes and form emails don't run as jobs, so their failures only reach the logs, and
    // the alert after a job's last retry may not come until the first sale.
    if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
      const missing = `${process.env.NEXT_PUBLIC_SITE_URL}: RESEND_API_KEY is not set, every email will fail.`
      console.error(missing)
      const { sendTelegram } = await import('@/lib/notify')
      await sendTelegram(missing).catch((error: unknown) =>
        console.error('Email key alert failed:', error instanceof Error ? error.message : error),
      )
    }
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!enabled()) return
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(error, request, context)
}
