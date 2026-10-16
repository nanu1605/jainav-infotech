import type { ErrorEvent } from '@sentry/nextjs'
import { describe, expect, it } from 'vitest'

import { scrubBreadcrumb, scrubEvent } from '@/lib/scrub'

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

  it('strips query strings and fragments from breadcrumb URLs', () => {
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/en/newsletter/confirmed?utm_source=x', to: '/hi#form' },
      }),
    ).toEqual({ category: 'navigation', data: { from: '/en/newsletter/confirmed', to: '/hi' } })
    expect(
      scrubBreadcrumb({
        category: 'fetch',
        data: { url: 'https://api.test/v1?key=1', method: 'GET', status_code: 200 },
      }).data,
    ).toEqual({ url: 'https://api.test/v1', method: 'GET', status_code: 200 })
  })

  it('strips a query string quoted without its URL', () => {
    const event = { exception: { values: [{ value: 'bad link ?token=SECRET&x=1 here' }] } }
    expect(JSON.stringify(scrubEvent(event as never))).not.toContain('SECRET')
  })

  it('leaves text that is not a URL alone', () => {
    expect(scrubBreadcrumb({ message: 'Is 1/2 enough? Yes.' }).message).toBe('Is 1/2 enough? Yes.')
  })
})
