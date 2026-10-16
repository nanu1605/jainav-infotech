// Imported by next.config.ts: plain TypeScript, no app or Payload imports.
import { EMBED_ALLOWED_HOSTS } from './embedHosts'

const TURNSTILE = 'https://challenges.cloudflare.com'
const GOOGLE_MAPS = 'https://www.google.com' // MapEmbed's iframe
const GRAVATAR = 'https://www.gravatar.com' // admin user avatars
// Payload's JSON and code fields load the Monaco editor from jsdelivr (@monaco-editor/loader).
const MONACO = 'https://cdn.jsdelivr.net'
// Razorpay Checkout (checkout pages only). Razorpay publishes no CSP list: these are the origins
// its checkout.js loads from, frames and calls. Check the console on staging with test keys.
const RAZORPAY = {
  script: ['https://checkout.razorpay.com'],
  frame: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
  connect: ['https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
  img: ['https://cdn.razorpay.com'],
}

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
 * Next's inline scripts. The admin adds Payload's Monaco editor; checkout adds Razorpay.
 */
export function contentSecurityPolicy(
  { cdnUrl, umamiUrl, sentryDsn }: CspEnv,
  { admin = false, checkout = false }: { admin?: boolean; checkout?: boolean } = {},
): string {
  const monaco = admin ? MONACO : undefined
  const rzp = (list: string[]) => (checkout ? list : [])
  const cdn = origin(cdnUrl)
  const umami = origin(umamiUrl)
  const sentry = origin(sentryDsn)
  const sources = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ')
  return [
    "default-src 'self'",
    `script-src ${sources("'self'", "'unsafe-inline'", TURNSTILE, umami, monaco, ...rzp(RAZORPAY.script))}`,
    `style-src ${sources("'self'", "'unsafe-inline'", monaco)}`,
    `img-src ${sources("'self'", 'data:', 'blob:', cdn, GRAVATAR, ...rzp(RAZORPAY.img))}`,
    `media-src ${sources("'self'", 'blob:', cdn)}`,
    `font-src ${sources("'self'", 'data:', monaco)}`,
    `connect-src ${sources("'self'", umami, sentry, ...rzp(RAZORPAY.connect))}`,
    `frame-src ${sources("'self'", TURNSTILE, GOOGLE_MAPS, ...rzp(RAZORPAY.frame), ...EMBED_ALLOWED_HOSTS.map((h) => `https://${h}`))}`,
    // Monaco starts its web workers from data: URLs when it is loaded from another origin.
    `worker-src ${sources("'self'", 'blob:', admin ? 'data:' : undefined)}`,
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
