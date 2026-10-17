import { describe, expect, it } from 'vitest'

import { contentSecurityPolicy, securityHeaders } from '@/lib/csp'

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split('; ').map((d) => {
      const [name, ...values] = d.split(' ')
      return [name, values]
    }),
  )

describe('content security policy', () => {
  it('locks down the defaults', () => {
    const d = directives(contentSecurityPolicy({}))
    expect(d['default-src']).toEqual(["'self'"])
    expect(d['object-src']).toEqual(["'none'"])
    expect(d['base-uri']).toEqual(["'self'"])
    expect(d['frame-ancestors']).toEqual(["'self'"])
    expect(d['connect-src']).toEqual([
      "'self'",
      'https://api.razorpay.com',
      'https://lumberjack.razorpay.com',
    ])
    expect(d['script-src']).toContain('https://challenges.cloudflare.com')
    expect(d['frame-src']).toEqual(
      expect.arrayContaining(['https://www.youtube-nocookie.com', 'https://www.google.com']),
    )
  })

  it('adds the CDN, Umami and the Sentry ingest host from the environment', () => {
    const d = directives(
      contentSecurityPolicy({
        cdnUrl: 'https://cdn.example.in/media/',
        umamiUrl: 'https://analytics.example.in',
        sentryDsn: 'https://abc123@o42.ingest.sentry.io/7',
      }),
    )
    expect(d['img-src']).toContain('https://cdn.example.in')
    expect(d['media-src']).toContain('https://cdn.example.in')
    expect(d['script-src']).toContain('https://analytics.example.in')
    expect(d['connect-src']).toEqual([
      "'self'",
      'https://analytics.example.in',
      'https://o42.ingest.sentry.io',
      'https://api.razorpay.com',
      'https://lumberjack.razorpay.com',
    ])
  })

  it('allows Payload’s Monaco editor in the admin only', () => {
    const site = directives(contentSecurityPolicy({}))
    const admin = directives(contentSecurityPolicy({}, { admin: true }))
    for (const d of ['script-src', 'style-src', 'font-src']) {
      expect(site[d]).not.toContain('https://cdn.jsdelivr.net')
      expect(admin[d]).toContain('https://cdn.jsdelivr.net')
    }
    expect(admin['worker-src']).toContain('data:')
    expect(site['worker-src']).not.toContain('data:')
  })

  it('allows Razorpay Checkout everywhere (checkout is reached by client navigation)', () => {
    const d = directives(contentSecurityPolicy({}))
    expect(d['script-src']).toContain('https://checkout.razorpay.com')
    expect(d['frame-src']).toEqual(
      expect.arrayContaining(['https://api.razorpay.com', 'https://checkout.razorpay.com']),
    )
    expect(d['connect-src']).toContain('https://api.razorpay.com')
  })

  it('ignores values that are not URLs', () => {
    const csp = contentSecurityPolicy({ cdnUrl: 'not a url', umamiUrl: '', sentryDsn: undefined })
    expect(csp).not.toMatch(/not a url|undefined/)
  })

  it('ships the other security headers', () => {
    const keys = securityHeaders({}).map((h) => h.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]),
    )
  })
})
