import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { getPosts } from '@/lib/queries'
import { absoluteUrl, localizedPath, SITE_URL } from '@/lib/seo'

const FEEDS: Record<string, Locale> = { 'en.xml': 'en', 'hi.xml': 'hi' }

const escape = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  )

/** RSS 2.0 feeds /feeds/en.xml and /feeds/hi.xml (spec §8.11); Hindi lists only ready posts. */
export async function GET(_req: Request, { params }: { params: Promise<{ feed: string }> }) {
  const locale = FEEDS[(await params).feed]
  if (!locale) return new Response('Not found', { status: 404 })

  const [{ docs }, t] = await Promise.all([
    getPosts(locale, { limit: 50 }),
    getTranslations({ locale, namespace: 'blog' }),
  ])
  const posts = locale === 'hi' ? docs.filter((p) => p.hiStatus === 'ready') : docs
  const items = posts
    .map((p) => {
      const url = absoluteUrl(locale, `/blog/${p.slug}`)
      return [
        '<item>',
        `<title>${escape(p.title ?? '')}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : '',
        p.excerpt ? `<description>${escape(p.excerpt)}</description>` : '',
        ...(p.tags ?? []).map((tag) => `<category>${escape(tag)}</category>`),
        '</item>',
      ].join('')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escape(t('feedTitle'))}</title>
<link>${SITE_URL}${localizedPath(locale, '/blog')}</link>
<description>${escape(t('feedTitle'))}</description>
<language>${locale === 'hi' ? 'hi-IN' : 'en-IN'}</language>
<atom:link href="${SITE_URL}/feeds/${locale}.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  })
}
