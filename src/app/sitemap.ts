import type { MetadataRoute } from 'next'

import { getRoutable } from '@/lib/queries'
import { docPaths, hostedProductSubpaths, publicPath } from '@/lib/routes'
import { sitemapEntries } from '@/lib/seo'

// Built on request and cached with the content tags, so publishing updates it (and CI builds
// without a database still work).
export const dynamic = 'force-dynamic'

/** Code-built pages: their Hindi comes from messages, so both languages are always paired. */
const CODE_PAGES = ['/products', '/contact', '/careers', '/blog', '/changelog']

/** sitemap.xml (spec §6, §15): every published page; Hindi only where it is ready. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pages, services, posts, jobs, legal, products, docs } = await getRoutable()
  const docPath = docPaths(docs)
  const hosted = new Map(
    products.filter((p) => p.hostingMode === 'hosted').map((p) => [p.id, p.slug]),
  )
  const home = pages.find((p) => p.slug === 'home')
  const servicesPage = pages.find((p) => p.slug === 'services')

  return [
    ...sitemapEntries('/', {
      hiStatus: home ? home.hiStatus : 'ready',
      lastModified: home?.updatedAt,
    }),
    ...sitemapEntries('/services', {
      hiStatus: servicesPage ? servicesPage.hiStatus : 'ready',
      lastModified: servicesPage?.updatedAt,
    }),
    ...CODE_PAGES.flatMap((path) => sitemapEntries(path)),
    ...pages
      .filter((p) => p.slug !== 'home' && p.slug !== 'services')
      .flatMap((p) =>
        sitemapEntries(publicPath.pages(p.slug), {
          hiStatus: p.hiStatus,
          lastModified: p.updatedAt,
        }),
      ),
    ...products.flatMap((p) => {
      const base = publicPath.products(p.slug)
      const paths =
        p.hostingMode === 'hosted'
          ? [base, ...hostedProductSubpaths.map((s) => `${base}/${s}`)]
          : [base]
      return paths.flatMap((path) =>
        sitemapEntries(path, { hiStatus: p.hiStatus, lastModified: p.updatedAt }),
      )
    }),
    ...services.flatMap((s) =>
      sitemapEntries(publicPath.services(s.slug), {
        hiStatus: s.hiStatus,
        lastModified: s.updatedAt,
      }),
    ),
    ...posts.flatMap((p) =>
      sitemapEntries(publicPath.posts(p.slug), { hiStatus: p.hiStatus, lastModified: p.updatedAt }),
    ),
    ...jobs.flatMap((j) =>
      sitemapEntries(publicPath.jobs(j.slug), { hiStatus: j.hiStatus, lastModified: j.updatedAt }),
    ),
    ...legal.flatMap((l) =>
      sitemapEntries(publicPath['legal-pages'](l.slug), {
        hiStatus: l.hiStatus,
        lastModified: l.updatedAt,
      }),
    ),
    ...docs.flatMap((d) => {
      const product = hosted.get(typeof d.product === 'object' ? d.product.id : d.product)
      const path = docPath.get(d.id)
      if (!product || !path) return []
      return sitemapEntries(`/products/${product}/docs/${path.join('/')}`, {
        hiStatus: d.hiStatus,
        lastModified: d.updatedAt,
      })
    }),
  ]
}
