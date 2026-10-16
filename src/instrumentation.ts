import type { Instrumentation } from 'next'

// Sentry stays off until SENTRY_DSN is set (spec §18.4). The app has no edge code (proxy.ts runs
// on Node.js), so only the Node.js runtime is set up.
const enabled = () => Boolean(process.env.SENTRY_DSN) && process.env.NEXT_RUNTIME === 'nodejs'

export async function register() {
  if (!enabled()) return
  const { initSentry } = await import('@/lib/sentry')
  initSentry(process.env.SENTRY_DSN!)
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!enabled()) return
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(error, request, context)
}
