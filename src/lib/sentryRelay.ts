import 'server-only'

import { z } from 'zod/mini'

import { errorCode, readBytes, sameOrigin } from '@/lib/commerce/http'
import { clientIp, limit } from '@/lib/rateLimit'

/**
 * The largest envelope taken. An errors-only browser sends one event per envelope and Sentry
 * refuses an event over 1 MiB; ours carry no bodies, cookies, other headers or `extra`, so they
 * are a few KB, tens of KB with 100 breadcrumbs. A quarter of Sentry's limit keeps every event we
 * can foresee and caps what one request makes the server hold.
 */
export const MAX_ENVELOPE_BYTES = 256 * 1024

/** Sentry answers in well under a second, and the SDK never retries a report anyway. */
export const UPSTREAM_TIMEOUT_MS = 5000

/** The only parts of Sentry's answer, besides its status, that the browser SDK acts on. */
const PASSED_ON = ['x-sentry-rate-limits', 'retry-after'] as const

const empty = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

type Dsn = { protocol: string; publicKey: string; host: string; path: string; projectId: string }

/**
 * A DSN's parts as the URL parser writes them (lower-case host, no default port), or undefined.
 * The secret key of old DSNs doesn't count: the SDK leaves it out of envelopes.
 */
function parseDsn(value: string | undefined): Dsn | undefined {
  if (!value) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  const segments = url.pathname.slice(1).split('/')
  const projectId = segments.pop() ?? ''
  const valid =
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    /^\w+$/.test(url.username) &&
    /^\d+$/.test(projectId)
  return valid
    ? {
        protocol: url.protocol,
        publicKey: url.username,
        host: url.host,
        path: segments.join('/'),
        projectId,
      }
    : undefined
}

const sameDsn = (a: Dsn, b: Dsn) =>
  a.protocol === b.protocol &&
  a.publicKey === b.publicKey &&
  a.host === b.host &&
  a.path === b.path &&
  a.projectId === b.projectId

/** Sentry's envelope endpoint with the key in the query, as the SDK builds it (core api.js). */
function envelopeUrl({ protocol, host, path, projectId, publicKey }: Dsn) {
  const auth = new URLSearchParams({ sentry_version: '7', sentry_key: publicKey })
  return `${protocol}//${host}${path ? `/${path}` : ''}/api/${projectId}/envelope/?${auth}`
}

// With a tunnel the SDK names its DSN in the envelope's first line, a JSON object.
const headerSchema = z.object({ dsn: z.string().check(z.maxLength(1024)) })

function envelopeHeader(body: Uint8Array) {
  const end = body.indexOf(0x0a)
  try {
    const line = new TextDecoder().decode(end === -1 ? body : body.subarray(0, end))
    return headerSchema.safeParse(JSON.parse(line)).data
  } catch {
    return undefined
  }
}

/**
 * POST /api/v1/relay: the browser's error reports (BROWSER_TUNNEL in src/lib/sentry.ts), passed on
 * to Sentry, whose own host ad blockers block (docs/decisions.md, "Sentry relay"). Only envelopes
 * for our DSN; nothing from the request but its body goes on, so Sentry never sees the visitor's
 * address, cookies or headers. The cheap checks come first, so a refused request costs no database
 * write, and the rate limit comes before the body is read.
 */
export async function relayEnvelope(req: Request): Promise<Response> {
  // Inlined at build time like the browser's copy: exactly the DSN the pages carry.
  const ours = parseDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)
  if (!ours) return empty(404)
  if (!sameOrigin(req)) return empty(403)
  if (Number(req.headers.get('content-length')) > MAX_ENVELOPE_BYTES) return empty(413)
  try {
    const wait = await limit('relayIp', clientIp(req.headers))
    if (wait) return empty(429, { 'Retry-After': String(wait) })
    const body = await readBytes(req, MAX_ENVELOPE_BYTES)
    if (!body) return empty(413)
    const header = envelopeHeader(body)
    if (!header) return empty(400)
    const theirs = parseDsn(header.dsn)
    if (!theirs || !sameDsn(theirs, ours)) return empty(403)
    return await forward(ours, body)
  } catch (error) {
    console.error('relay: failed:', errorCode(error))
    return empty(500)
  }
}

/** The exact bytes to the endpoint built from our DSN alone; Sentry's status comes back. */
async function forward(dsn: Dsn, body: Uint8Array<ArrayBuffer>): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetch(envelopeUrl(dsn), {
      method: 'POST',
      // No header from the request: not its cookies, staging's login or the visitor's address.
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      redirect: 'error',
      cache: 'no-store',
    })
  } catch (error) {
    const code = errorCode(error)
    console.error('relay: forward failed:', code)
    return empty(code === 'TimeoutError' ? 504 : 502)
  }
  await upstream.body?.cancel().catch(() => undefined)
  const headers: Record<string, string> = {}
  for (const name of PASSED_ON) {
    const value = upstream.headers.get(name)
    if (value) headers[name] = value
  }
  return empty(upstream.status, headers)
}
