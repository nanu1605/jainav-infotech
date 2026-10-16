import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { PageView } from '@/components/content/PageView'
import type { Locale } from '@/i18n/routing'
import { staticParams } from '@/lib/cms'
import { findRedirect, getPage, getPageSlugs } from '@/lib/queries'
import { localizedPath, pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; path: string[] }> }

// Pages with their own routes (home, the services index) aren't served here too.
const OWN_ROUTE = new Set(['home', 'services'])

export const generateStaticParams = () =>
  staticParams(async () =>
    (await getPageSlugs()).filter((s) => !OWN_ROUTE.has(s)).map((slug) => ({ path: [slug] })),
  )

const pageFor = async (locale: Locale, path: string[]) =>
  path.length === 1 && !OWN_ROUTE.has(path[0]!) ? getPage(locale, path[0]!) : null

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, path } = (await params) as { locale: Locale; path: string[] }
  const page = await pageFor(locale, path)
  if (!page?.slug) return {}
  return pageMetadata({
    locale,
    path: `/${page.slug}`,
    title: page.title ?? '',
    seo: page.meta,
    hiStatus: page.hiStatus,
  })
}

/**
 * Block-built pages at /{slug} (About…), then the redirects table (old URLs, vanity paths like
 * /vyro, spec §8.6), then the 404 page. Redirects keep the visitor's language.
 */
export default async function CatchAllPage({ params }: Props) {
  const { locale, path } = (await params) as { locale: Locale; path: string[] }
  setRequestLocale(locale)
  const page = await pageFor(locale, path)
  if (page) return <PageView page={page} locale={locale} />

  const target = await findRedirect(`/${path.map(decodeURIComponent).join('/')}`)
  if (target) {
    const to = target.to.startsWith('/') ? localizedPath(locale, target.to) : target.to
    // Next.js sends 308 / 307; 301 and 302 map to those (same caching, method preserved).
    if (target.permanent) permanentRedirect(to)
    redirect(to)
  }
  notFound()
}
