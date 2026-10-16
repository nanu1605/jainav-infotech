import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/seo'

// Read at request time: the same image serves staging (basic auth on) and production.
export const dynamic = 'force-dynamic'

/** spec §15: keep crawlers out of the admin, account, checkout and APIs, and out of staging. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.STAGING_BASIC_AUTH) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/hi/account', '/checkout', '/hi/checkout', '/api/', '/go/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
