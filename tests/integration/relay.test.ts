/**
 * The browser error relay (POST /api/v1/relay, spec §18.4) against the real rate limiter: only
 * envelopes for our DSN, the size cap as declared and as read, the per-IP limit, and the exact
 * bytes forwarded to the ingest URL built from config with nothing else from the request.
 * Sentry is a fetch stub.
 */
import { getPayload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const { POST: relay } = await import('@/app/api/v1/relay/route')
const { MAX_ENVELOPE_BYTES, UPSTREAM_TIMEOUT_MS } = await import('@/lib/sentryRelay')
const { SITE_URL } = await import('@/lib/seo')

// Made up, in the shape of an EU-region DSN.
const DSN = 'https://abc123@o42.ingest.de.sentry.io/7'
const INGEST = 'https://o42.ingest.de.sentry.io/api/7/envelope/?sentry_version=7&sentry_key=abc123'
const ORIGIN = new URL(SITE_URL).origin

// A new client each time, in the documentation prefix: IPv6 counts per /64. The third group is
// the run's start second, which comes round again only after 18 hours, so no client meets the
// rows of an earlier run (they last 10 minutes) and nothing has to clear the table. Other files
// count other rules.
const run = (Math.floor(Date.now() / 1000) % 0x10000).toString(16)
let ipCounter = 0
const nextIp = () => `2001:db8:${run}:${(++ipCounter).toString(16)}::1`

const header = (dsn: string) =>
  JSON.stringify({
    event_id: 'a'.repeat(32),
    sent_at: '2026-11-17T00:00:00.000Z',
    dsn,
    sdk: { name: 'sentry.javascript.nextjs', version: '11.11.0' },
  })
const envelope = (dsn = DSN) => `${header(dsn)}\n{"type":"event"}\n{"message":"relay test"}`

function post(
  body: BodyInit | null,
  {
    ip = nextIp(),
    origin = ORIGIN,
    headers = {},
  }: { ip?: string; origin?: string | null; headers?: Record<string, string> } = {},
) {
  return relay(
    new Request(`${SITE_URL}/api/v1/relay`, {
      method: 'POST',
      body,
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        'cf-connecting-ip': ip,
        ...(origin !== null && { origin }),
        ...headers,
      },
    }),
  )
}

/** The body arrives in 64 KiB chunks with no Content-Length, like a chunked upload. */
function streamed(bytes: Uint8Array) {
  let offset = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = bytes.subarray(offset, offset + 64 * 1024)
      offset += chunk.length
      if (chunk.length) controller.enqueue(chunk)
      else controller.close()
    },
  })
  return new Request(`${SITE_URL}/api/v1/relay`, {
    method: 'POST',
    body,
    // @ts-expect-error -- Node needs this for a streamed body; the DOM types don't know it.
    duplex: 'half',
    headers: { origin: ORIGIN, 'cf-connecting-ip': nextIp() },
  })
}

const upstream = vi.fn(
  async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response('{"id":"x"}', { status: 200 }),
)
const forwarded = () => upstream.mock.calls

// Payload's start-up sends a telemetry event without waiting for it: never a forward.
const telemetry = (input: RequestInfo | URL) =>
  String(input).startsWith('https://telemetry.payloadcms.com/')

beforeAll(async () => {
  // Payload starts before fetch is stubbed (the rate limiter uses its database).
  await getPayload({ config })
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', DSN)
  upstream.mockReset()
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    telemetry(input) ? Promise.resolve(new Response(null, { status: 204 })) : upstream(input, init),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('forwarding', () => {
  it('sends the exact bytes to the ingest URL built from the DSN and answers with its status', async () => {
    // Bytes a decode and re-encode would change: Hindi text, and a binary item holding a newline.
    const body = Buffer.concat([
      Buffer.from(
        `${header(DSN)}\n{"type":"event"}\n{"message":"त्रुटि"}\n{"type":"attachment","length":4}\n`,
      ),
      Buffer.from([0xff, 0x0a, 0x00, 0xfe]),
    ])
    const res = await post(body)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(forwarded()).toHaveLength(1)
    const [url, init] = forwarded()[0]!
    expect(String(url)).toBe(INGEST)
    expect(init?.method).toBe('POST')
    expect(init?.redirect).toBe('error')
    expect(Buffer.from(init?.body as Uint8Array).equals(body)).toBe(true)
  })

  it.each([400, 403, 413, 429, 503])(
    "answers with Sentry's %i and an empty body",
    async (status) => {
      upstream.mockImplementationOnce(async () => new Response('{"detail":"no"}', { status }))
      const res = await post(envelope())
      expect(res.status).toBe(status)
      expect(await res.text()).toBe('')
    },
  )

  it("passes on only Sentry's rate-limit headers", async () => {
    upstream.mockImplementationOnce(
      async () =>
        new Response('{}', {
          status: 429,
          headers: {
            'X-Sentry-Rate-Limits': '60:error:organization',
            'Retry-After': '60',
            'Set-Cookie': 'a=b',
            'Content-Type': 'application/json',
            'X-Other': '1',
          },
        }),
    )
    const res = await post(envelope())
    expect(res.status).toBe(429)
    expect(res.headers.get('x-sentry-rate-limits')).toBe('60:error:organization')
    expect(res.headers.get('retry-after')).toBe('60')
    for (const name of ['set-cookie', 'content-type', 'x-other']) {
      expect(res.headers.get(name)).toBeNull()
    }
  })

  it('forwards no header, cookie or address from the request', async () => {
    const ip = nextIp()
    await post(envelope(), {
      ip,
      headers: {
        cookie: 'payload-token=secret',
        authorization: 'Basic c3RhZ2luZzpzZWNyZXQ=',
        'user-agent': 'Firefox',
        referer: `${SITE_URL}/en`,
        'x-forwarded-for': ip,
      },
    })
    const [url, init] = forwarded()[0]!
    expect(String(url)).toBe(INGEST)
    expect([...new Headers(init?.headers).entries()]).toEqual([
      ['content-type', 'application/x-sentry-envelope'],
    ])
  })

  it('gives up after the timeout with a 504', async () => {
    const controller = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
    upstream.mockImplementationOnce(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init!.signal!
          signal.addEventListener('abort', () => reject(signal.reason))
        }),
    )
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pending = post(envelope())
    await vi.waitFor(() => expect(upstream).toHaveBeenCalled(), { timeout: 10_000 })
    controller.abort(new DOMException('The operation timed out.', 'TimeoutError'))
    expect((await pending).status).toBe(504)
    expect(timeout).toHaveBeenCalledWith(UPSTREAM_TIMEOUT_MS)
    expect(errors.mock.calls).toEqual([['relay: forward failed:', 'TimeoutError']])
  })

  it('answers 502 when Sentry is unreachable, logging only an error code', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    upstream.mockRejectedValueOnce(new TypeError('fetch failed', { cause }))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post(envelope())).status).toBe(502)
    expect(errors.mock.calls).toEqual([['relay: forward failed:', 'ECONNREFUSED']])
  })
})

describe('envelopes', () => {
  it.each([
    ['another host', 'https://abc123@o99.ingest.de.sentry.io/7'],
    ['another project', 'https://abc123@o42.ingest.de.sentry.io/8'],
    ['another key', 'https://zzz999@o42.ingest.de.sentry.io/7'],
    ['plain http', 'http://abc123@o42.ingest.de.sentry.io/7'],
    ['a path before the project', 'https://abc123@o42.ingest.de.sentry.io/x/7'],
    ['an internal host', 'https://abc123@127.0.0.1:5432/7'],
    ['no DSN shape', 'nonsense'],
  ])('refuses a DSN with %s and sends nothing', async (_case, dsn) => {
    expect((await post(envelope(dsn))).status).toBe(403)
    expect(forwarded()).toHaveLength(0)
  })

  it('accepts our DSN written with capitals and the default port', async () => {
    expect((await post(envelope('https://abc123@O42.Ingest.DE.sentry.io:443/7'))).status).toBe(200)
    expect(String(forwarded()[0]![0])).toBe(INGEST)
  })

  it.each([
    ['an empty body', ''],
    ['text', 'not an envelope'],
    ['a JSON array', '[]\n{}'],
    ['no DSN', '{"event_id":"x"}\n{}'],
    ['a DSN that is not text', '{"dsn":42}\n{}'],
  ])('refuses %s and sends nothing', async (_case, body) => {
    expect((await post(body)).status).toBe(400)
    expect(forwarded()).toHaveLength(0)
  })

  it.each(['', 'not a dsn'])('answers 404 while no usable DSN is built in (%j)', async (value) => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', value)
    expect((await post(envelope())).status).toBe(404)
    expect(forwarded()).toHaveLength(0)
  })
})

describe('limits', () => {
  it('refuses a Content-Length over the cap before counting the request', async () => {
    const ip = nextIp()
    const declared = { 'content-length': String(MAX_ENVELOPE_BYTES + 1) }
    for (let i = 0; i < 31; i++) {
      expect((await post('x', { ip, headers: declared })).status).toBe(413)
    }
    expect((await post(envelope(), { ip })).status).toBe(200)
  })

  it('reads a body without a Content-Length up to the cap, and refuses one byte more', async () => {
    const head = Buffer.from(`${envelope()}\n`)
    const sized = (size: number) => Buffer.concat([head, Buffer.alloc(size - head.length, 0x61)])
    const atCap = sized(MAX_ENVELOPE_BYTES)
    const req = streamed(atCap)
    expect(req.headers.get('content-length')).toBeNull()
    expect((await relay(req)).status).toBe(200)
    expect(Buffer.from(forwarded()[0]![1]?.body as Uint8Array).equals(atCap)).toBe(true)
    expect((await relay(streamed(sized(MAX_ENVELOPE_BYTES + 1)))).status).toBe(413)
    expect(forwarded()).toHaveLength(1)
  })

  it('allows 30 requests per IP in 10 minutes, valid or not', async () => {
    const ip = nextIp()
    for (let i = 0; i < 30; i++) expect((await post('x', { ip })).status).toBe(400)
    const blocked = await post(envelope(), { ip })
    expect(blocked.status).toBe(429)
    const wait = Number(blocked.headers.get('Retry-After'))
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(600)
    expect(forwarded()).toHaveLength(0)
    expect((await post(envelope())).status).toBe(200) // another client
  })

  it('counts an IPv6 client by its /64', async () => {
    const ip = nextIp()
    const sibling = ip.replace(/::1$/, '::2')
    for (let i = 0; i < 30; i++) expect((await post('x', { ip })).status).toBe(400)
    expect((await post(envelope(), { ip: sibling })).status).toBe(429)
  })

  it('refuses a browser request from another site before counting it', async () => {
    const ip = nextIp()
    for (const origin of ['https://evil.example', 'null']) {
      for (let i = 0; i < 16; i++) {
        expect((await post(envelope(), { ip, origin })).status).toBe(403)
      }
    }
    expect(forwarded()).toHaveLength(0)
    expect((await post(envelope(), { ip })).status).toBe(200)
  })

  it('takes a request without an Origin: only non-browsers omit it, and they could send any', async () => {
    expect((await post(envelope(), { origin: null })).status).toBe(200)
  })
})
