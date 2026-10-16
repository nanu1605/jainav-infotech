import type { Metadata, MetadataRoute } from 'next'

import type { Locale } from '@/i18n/routing'
import type { Media } from '@/payload-types'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export type HiStatus = 'missing' | 'draft' | 'ready'

/** Public path for a locale: English unprefixed, Hindi under /hi (spec §4.4). */
export const localizedPath = (locale: Locale, path: string) =>
  locale === 'en' ? path : `/hi${path === '/' ? '' : path}`

export const absoluteUrl = (locale: Locale, path: string) => SITE_URL + localizedPath(locale, path)

type Seo = { title?: string | null; description?: string | null; image?: number | Media | null }

/**
 * Per-page metadata with spec §6 rules. `hiStatus` 'ready' (the default for code-built pages,
 * whose Hindi comes from messages) pairs both languages through hreflang. Otherwise each page
 * is its own canonical and the Hindi page is noindex. `seo` is the SEO plugin's `meta` group;
 * its title is complete ("… | Jainav Infotech"), so it bypasses the layout's title template.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  seo,
  hiStatus = 'ready',
  noindex = false,
  shareImage = '/og/site.png',
}: {
  locale: Locale
  path: string
  title: string
  description?: string | null
  seo?: Seo | null
  hiStatus?: HiStatus | null
  noindex?: boolean
  /** Generated share image used when the SEO tab has none (spec §15). */
  shareImage?: string
}): Metadata {
  const paired = hiStatus === 'ready'
  const image = typeof seo?.image === 'object' && seo.image?.url ? seo.image : null
  const desc = seo?.description || description || undefined
  return {
    title: seo?.title ? { absolute: seo.title } : title,
    description: desc,
    alternates: {
      canonical: absoluteUrl(locale, path),
      languages: paired
        ? {
            en: absoluteUrl('en', path),
            hi: absoluteUrl('hi', path),
            'x-default': absoluteUrl('en', path),
          }
        : undefined,
    },
    openGraph: {
      title: seo?.title || title,
      description: desc,
      url: absoluteUrl(locale, path),
      locale: locale === 'hi' ? 'hi_IN' : 'en_IN',
      images: image
        ? [{ url: image.url!, alt: image.alt ?? '' }]
        : [{ url: `${SITE_URL}${shareImage}`, width: 1200, height: 630 }],
    },
    robots: noindex || (locale === 'hi' && !paired) ? { index: false, follow: true } : undefined,
  }
}

/** Sitemap entries for one page: English always, Hindi only when ready (with alternates). */
export function sitemapEntries(
  path: string,
  {
    hiStatus = 'ready',
    lastModified,
  }: { hiStatus?: HiStatus | null; lastModified?: string | null } = {},
): MetadataRoute.Sitemap {
  const en = absoluteUrl('en', path)
  if (hiStatus !== 'ready') return [{ url: en, lastModified: lastModified ?? undefined }]
  const hi = absoluteUrl('hi', path)
  const alternates = { languages: { en, hi, 'x-default': en } }
  return [
    { url: en, lastModified: lastModified ?? undefined, alternates },
    { url: hi, lastModified: lastModified ?? undefined, alternates },
  ]
}

/** Serialized JSON-LD, safe inside a <script> (no closing tag can appear in the output). */
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c')
