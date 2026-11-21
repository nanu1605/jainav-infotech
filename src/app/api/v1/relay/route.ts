import { relayEnvelope } from '@/lib/sentryRelay'

/** POST /api/v1/relay: browser error reports on their way to Sentry (src/lib/sentryRelay.ts). */
export const POST = relayEnvelope
