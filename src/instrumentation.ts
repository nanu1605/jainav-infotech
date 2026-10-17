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
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!enabled()) return
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(error, request, context)
}
