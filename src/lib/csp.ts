// Imported by next.config.ts: plain TypeScript, no app or Payload imports.
import { EMBED_ALLOWED_HOSTS } from './embedHosts'

const TURNSTILE = 'https://challenges.cloudflare.com'
const GOOGLE_MAPS = 'https://www.google.com' // MapEmbed's iframe
const GRAVATAR = 'https://www.gravatar.com' // admin user avatars

/** The origin of a URL (a Sentry DSN's ingest host included), or nothing when unset or invalid. */
const origin = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : undefined
  } catch {
    return undefined
  }
}

export type CspEnv = { cdnUrl?: string; umamiUrl?: string; sentryDsn?: string }

/**
 * Static CSP for every route (spec §16): pages are static, so no nonces; 'unsafe-inline' covers
 * Next's inline scripts. Razorpay's origins join in Phase 7 with checkout.
 */
export function contentSecurityPolicy({ cdnUrl, umamiUrl, sentryDsn }: CspEnv): string {
  const cdn = origin(cdnUrl)
  const umami = origin(umamiUrl)
  const sentry = origin(sentryDsn)
  const sources = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ')
  return [
    "default-src 'self'",
    `script-src ${sources("'self'", "'unsafe-inline'", TURNSTILE, umami)}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources("'self'", 'data:', 'blob:', cdn, GRAVATAR)}`,
    `media-src ${sources("'self'", 'blob:', cdn)}`,
    "font-src 'self' data:",
    `connect-src ${sources("'self'", umami, sentry)}`,
    `frame-src ${sources("'self'", TURNSTILE, GOOGLE_MAPS, ...EMBED_ALLOWED_HOSTS.map((h) => `https://${h}`))}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}

/** Response headers for every route in production builds (spec §16). */
export function securityHeaders(env: CspEnv) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(env) },
    // No preload: that is a commitment for every subdomain; add it once all of them are HTTPS-only.
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=()' },
  ]
}
