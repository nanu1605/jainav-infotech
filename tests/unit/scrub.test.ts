import * as Sentry from '@sentry/nextjs'
import type { ErrorEvent } from '@sentry/nextjs'
import { describe, expect, it, vi } from 'vitest'

import { scrubBreadcrumb, scrubEvent } from '@/lib/scrub'
import { initSentry } from '@/lib/sentry'

vi.mock('@sentry/nextjs', () => ({ init: vi.fn() }))

const message = (value: string) =>
  scrubEvent({ type: undefined, exception: { values: [{ value }] } }).exception?.values?.[0]?.value

describe('Sentry setup', () => {
  it('reports errors only, through the filters', () => {
    initSentry('https://key@example.test/1')
    const options = vi.mocked(Sentry.init).mock.calls[0]![0] as unknown as {
      beforeSend: unknown
      beforeBreadcrumb: unknown
      tracePropagationTargets: string[]
      sendClientReports: boolean
      dataCollection: { urlQueryParams: boolean }
      integrations: (defaults: { name: string }[]) => { name: string }[]
    }
    expect(options.beforeSend).toBe(scrubEvent)
    expect(options.beforeBreadcrumb).toBe(scrubBreadcrumb)
    // Spans skip both, and any rate, even 0, can still record them.
    expect(options).not.toHaveProperty('tracesSampleRate')
    expect(options).not.toHaveProperty('tracesSampler')
    expect(options.tracePropagationTargets).toEqual([])
    expect(options.sendClientReports).toBe(false)
    expect(options.dataCollection.urlQueryParams).toBe(false)
    const defaults = [
      'BrowserSession',
      'BrowserTracing',
      'ContextLines',
      'CultureContext',
      'LinkedErrors',
    ]
    expect(options.integrations(defaults.map((name) => ({ name })))).toEqual([
      { name: 'LinkedErrors' },
    ])
  })
})

describe('Sentry scrubbing (spec §16)', () => {
  it('keeps only the url, method and user agent of a request', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'GET /api/v1/forms/newsletter/confirm?token=secret failed',
      user: { id: '1', email: 'a@example.com', ip_address: '1.2.3.4' },
      request: {
        url: 'https://jainav.test/api/v1/forms/unsubscribe?token=secret#top',
        method: 'POST',
        query_string: 'token=secret',
        cookies: { 'payload-token': 'x' },
        data: { email: 'a@example.com' },
        headers: {
          'user-agent': 'Firefox',
          cookie: 'payload-token=x',
          referer: 'https://x.test/?q=1',
        },
      },
      contexts: { nextjs: { request_path: '/api/v1/forms/newsletter/confirm?token=secret' } },
    }
    expect(scrubEvent(event)).toEqual({
      type: undefined,
      message: 'GET /api/v1/forms/newsletter/confirm failed',
      request: {
        url: 'https://jainav.test/api/v1/forms/unsubscribe',
        method: 'POST',
        headers: { 'User-Agent': 'Firefox' },
      },
      contexts: { nextjs: { request_path: '/api/v1/forms/newsletter/confirm' } },
    })
  })

  it("keeps the browser SDK's User-Agent header too", () => {
    const event = { type: undefined, request: { url: '/x', headers: { 'User-Agent': 'Firefox' } } }
    expect(scrubEvent(event as ErrorEvent).request?.headers).toEqual({ 'User-Agent': 'Firefox' })
  })

  it('strips query strings and fragments from breadcrumb URLs', () => {
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/en/newsletter/confirmed?utm_source=x', to: '/hi#form' },
      }),
    ).toEqual({ category: 'navigation', data: { from: '/en/newsletter/confirmed', to: '/hi' } })
  })

  it.each([
    ['bad link ?token=SECRET&x=1 here', 'bad link  here'],
    ['bad link ?x&token=SECRET here', 'bad link  here'],
    ['file.pdf#sig=SECRET', 'file.pdf'],
    ['https://x.test/a?inline&sig=SECRET', 'https://x.test/a'],
    ['/a?x=SECRET and https://b.test/c#d=SECRET', '/a and https://b.test/c'],
  ])('strips a query or fragment wherever it is quoted: %s', (value, expected) => {
    expect(message(value)).toBe(expected)
  })

  it('leaves text that is not a URL alone', () => {
    expect(scrubBreadcrumb({ message: 'Is 1/2? Yes.' })?.message).toBe('Is 1/2? Yes.')
  })

  describe('secrets in URL paths', () => {
    const token = '123456789:AAH-s3cret_token'
    const telegram = `https://api.telegram.org/bot${token}/sendMessage`

    it('cuts an outgoing request down to its host', () => {
      const breadcrumb = scrubBreadcrumb({
        category: 'http',
        type: 'http',
        data: {
          url: telegram,
          'http.request.method': 'POST',
          status_code: 200,
          'url.query': 'chat=1&key=SECRET',
          'url.fragment': 'SECRET',
        },
      })
      expect(breadcrumb).toEqual({
        category: 'http',
        type: 'http',
        data: {
          url: 'https://api.telegram.org',
          'http.request.method': 'POST',
          status_code: 200,
        },
      })
      expect(JSON.stringify(breadcrumb)).not.toContain('SECRET')
      expect(
        scrubBreadcrumb({
          category: 'fetch',
          data: { url: 'https://bucket.test/cvs/jane-doe.pdf?sig=1', status_code: 200 },
        })?.data?.url,
      ).toBe('https://bucket.test')
    })

    it("keeps the path of the site's own requests", () => {
      expect(
        scrubBreadcrumb({ category: 'fetch', data: { url: '/api/v1/forms/contact?x=1' } })?.data
          ?.url,
      ).toBe('/api/v1/forms/contact')
    })

    it('leaves no token anywhere in an event', () => {
      const event = {
        type: undefined,
        exception: {
          values: [{ value: `Failed to parse URL from ${telegram} and bot1:a-b and bot2:c_d` }],
        },
        breadcrumbs: [{ category: 'http', type: 'http', data: { url: telegram } }],
      } as ErrorEvent
      const scrubbed = scrubEvent(event)
      expect(JSON.stringify(scrubbed)).not.toMatch(/s3cret|bot1:|bot2:/)
      expect(scrubbed.breadcrumbs?.[0]?.data?.url).toBe('https://api.telegram.org')
    })

    it("cuts the token from Payload's password reset path", () => {
      const reset = '/admin/reset/0123456789abcdef0123456789abcdef01234567'
      const scrubbed = scrubEvent({
        type: undefined,
        request: { url: `https://jainav.test${reset}` },
        contexts: { nextjs: { request_path: reset } },
        breadcrumbs: [{ category: 'navigation', data: { from: reset, to: '/admin' } }],
      })
      expect(JSON.stringify(scrubbed)).not.toContain('0123456789abcdef')
      expect(scrubbed.request?.url).toBe('https://jainav.test/admin/reset/[Filtered]')
      expect(message('POST /api/users/reset-password failed')).toBe(
        'POST /api/users/reset-password failed',
      )
    })
  })

  describe('what people typed', () => {
    it("drops a database error's query and bound values", () => {
      // Drizzle's DrizzleQueryError and the node-postgres error it wraps, as Sentry links them.
      const event = {
        type: undefined,
        exception: {
          values: [
            { type: 'error', value: 'value too long for type character varying(255)' },
            {
              type: 'Error',
              value:
                'Failed query: insert into "leads" ("email", "name") values ($1, $2)\n' +
                'params: jane@example.com,Jane Doe,+91 98765 43210',
            },
          ],
        },
      } as ErrorEvent
      expect(scrubEvent(event).exception?.values).toEqual([
        { type: 'error', value: 'value too long for type character varying(255)' },
        { type: 'Error', value: 'Failed query: [Filtered]' },
      ])
    })

    it.each([
      [
        'invalid input syntax for type integer: "Jane Doe"',
        'invalid input syntax for type integer: [Filtered]',
      ],
      [
        'invalid input value for enum enum_leads_type: "x"',
        'invalid input value for enum enum_leads_type: [Filtered]',
      ],
      [
        'value "98765432109876" is out of range for type integer',
        'value [Filtered] is out of range for type integer',
      ],
      // Postgres doesn't escape a quote inside the value.
      [
        'invalid input syntax for type date: "5" screen for Jane Doe <j@x.co>"',
        'invalid input syntax for type date: [Filtered]',
      ],
    ])('drops the value Postgres quotes: %s', (value, expected) => {
      expect(message(value)).toBe(expected)
    })

    it.each([
      ['Invalid `to`: Jane.Doe+work@example.co.in', 'Invalid `to`: [Filtered]'],
      ['jane@example.com and JOHN@EXAMPLE.COM', '[Filtered] and [Filtered]'],
      ['Could not reach +91 98765 43210 today', 'Could not reach [Filtered] today'],
      ['Could not reach +91 98765 43210: timeout', 'Could not reach [Filtered]: timeout'],
      ['SMS to 919876543210: failed', 'SMS to [Filtered]: failed'],
      ['Could not reach 98765-43210.', 'Could not reach [Filtered].'],
      ['Tried 98765 - 43210 twice', 'Tried [Filtered] twice'],
      ['9876543210 and 9123456780', '[Filtered] and [Filtered]'],
      ['Call (0731) 234-5678 now', 'Call ([Filtered] now'],
      ['+91-98765-43210-2026-resume.pdf', '[Filtered]-2026-resume.pdf'],
      ['9876543210-face-scan.jpg', '[Filtered]-face-scan.jpg'],
    ])('drops an address or number in any message: %s', (value, expected) => {
      expect(message(value)).toBe(expected)
    })

    it.each([
      // Cutting the query first would take away what the other rules look for.
      ['Bad reply from /api/v1/leads?id=7: "Jane Doe"', 'Bad reply from /api/v1/leads [Filtered]'],
      ['GET /x?phone=98765 43210', 'GET /x'],
      ['see /x#Failed query: insert into "leads"\nparams: Jane', 'see /x query: [Filtered]'],
      ['9876543210@example.com', '[Filtered]'],
    ])('applies the rules in a safe order: %s', (value, expected) => {
      expect(message(value)).toBe(expected)
    })

    it.each([
      "Cannot read properties of undefined (reading 'id')",
      'relation "leads" does not exist',
      'duplicate key value violates unique constraint "customers_email_idx"',
      'Telegram sendMessage failed: 500',
      'Order JO-7K2M9P4Q failed at 2026-11-01 10:42:33 and 2026-11-01T10:42:33.000Z',
    ])('leaves the rest of a message readable: %s', (value) => {
      expect(message(value)).toBe(value)
    })

    it("leaves the SDK's paths and ids alone", () => {
      const event = {
        type: undefined,
        event_id: '12345678901234567890123456789012',
        contexts: { trace: { trace_id: 'a'.repeat(32), span_id: '1234567890123456' } },
        debug_meta: {
          images: [
            { debug_id: 'a1b2c3d4-aaaa-4aaa-8aaa-123456789012' },
            { debug_id: '12345678-1234-4234-8234-123456789012' },
          ],
        },
        exception: {
          values: [
            {
              stacktrace: {
                frames: [
                  {
                    filename:
                      '/app/node_modules/.pnpm/pg@8.16.3_pg-native@3.0.0/node_modules/pg.js',
                    lineno: 1234567890,
                  },
                  // Turbopack names chunks after scoped packages.
                  { filename: '/app/.next/server/chunks/ssr/0_i3_@payloadcms_next_0f_x13._.js' },
                ],
              },
            },
          ],
        },
      } as unknown as ErrorEvent
      expect(scrubEvent(event)).toEqual(event)
    })

    it('drops frames the SDK read from lines of a message, and keeps real ones', () => {
      const frames = [
        // Bound values with a timestamp: its digits read as a line and column.
        { filename: 'Kumar,+91,IN,2026-11-01T18', function: '?', lineno: 24, colno: 22 },
        { filename: 'Tally batch', function: 'your courses' },
        { filename: 'Indore' },
        { function: 'noPath' },
      ]
      const real = [
        { filename: '/app/.next/server/chunks/0.js', lineno: 7 },
        { filename: 'node:internal/process/task_queues', lineno: 95 },
        { filename: 'file:///app/x.mjs', lineno: 1 },
        { filename: 'app:///_next/server/x.js', lineno: 1 },
        { filename: 'https://example.test/_next/static/chunks/x.js', lineno: 1 },
        { filename: 'S:\\Projects\\x.js', lineno: 1 },
        { filename: '<anonymous>', function: 'JSON.parse' },
      ]
      const event = {
        type: undefined,
        exception: { values: [{ value: 'x', stacktrace: { frames: [...frames, ...real] } }] },
      } as unknown as ErrorEvent
      expect(scrubEvent(event).exception?.values?.[0]?.stacktrace?.frames).toEqual(real)
    })

    it('drops a very long string whole', () => {
      expect(message('a.'.repeat(200_000))).toBe('[Filtered]')
      // A cut here would take away the quote that closes the value.
      const value = `invalid input syntax for type date: "${'5" Jane Doe '.repeat(2_000)}"`
      expect(message(value)).toBe('[Filtered]')
    })

    it('drops console lines, clicks and earlier errors, however they reach the event', () => {
      expect(scrubBreadcrumb({ category: 'console', message: 'saved Jane Doe' })).toBeNull()
      expect(scrubBreadcrumb({ category: 'ui.click', message: 'button[title="Jane"]' })).toBeNull()
      expect(scrubBreadcrumb({ category: 'ui.input', message: 'input[name="name"]' })).toBeNull()
      expect(scrubBreadcrumb({ category: 'sentry.event', message: 'boom: Jane Doe' })).toBeNull()
      const event = {
        type: undefined,
        breadcrumbs: [
          { category: 'console', message: 'forms/contact: Jane Doe failed' },
          { category: 'ui.click', message: 'button[title="Jane"]' },
          { category: 'navigation', data: { from: '/', to: '/contact' } },
        ],
      } as ErrorEvent
      expect(JSON.stringify(scrubEvent(event))).not.toContain('Jane')
      expect(scrubEvent(event).breadcrumbs).toEqual([event.breadcrumbs?.[2]])
    })

    it("drops the fields of a thrown object, which Sentry puts in 'extra'", () => {
      const event = {
        type: undefined,
        exception: { values: [{ value: 'Object captured as exception with keys: name' }] },
        extra: { __serialized__: { name: 'Jane Doe' } },
      }
      expect(JSON.stringify(scrubEvent(event as ErrorEvent))).not.toContain('Jane')
    })
  })
})
