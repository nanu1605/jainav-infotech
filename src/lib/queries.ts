import 'server-only'

import type { Locale } from '@/i18n/routing'
import type { Changelog, Media, Redirect } from '@/payload-types'
import type { Where } from 'payload'

import { as, getClient, read } from './cms'
import { publicPath, type RoutedCollection } from './routes'
import { downloadTotal } from './stats'

/** Rich text populates its uploads and internal links (any routed collection) at depth >= 1. */
const RICH_TEXT_TAGS = ['media', ...Object.keys(publicPath), 'docs']
/** Collections whose documents page blocks can pull in at depth 2. */
const BLOCK_TAGS = [...new Set([...RICH_TEXT_TAGS, 'faqs', 'testimonials', 'team'])]

export const getSettings = (locale: Locale) =>
  read(locale, ['site-settings', 'media'], ['settings'], (payload, v) =>
    payload.findGlobal({ slug: 'site-settings', depth: 1, ...as(v) }),
  )

export const getNavigation = (locale: Locale) =>
  read(locale, ['navigation'], ['navigation'], (payload, v) =>
    payload.findGlobal({ slug: 'navigation', depth: 0, ...as(v) }),
  )

/** Products for menus, cards and the hub, in admin order. Retired products only on request. */
export const getProducts = (locale: Locale, { retired = true }: { retired?: boolean } = {}) =>
  read(locale, ['products', 'media'], ['products', retired], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'products',
      depth: 1,
      pagination: false,
      sort: 'sortOrder',
      where: retired ? {} : { status: { not_equals: 'retired' } },
      select: {
        name: true,
        slug: true,
        tagline: true,
        status: true,
        platforms: true,
        accentColor: true,
        logo: true,
        featured: true,
        category: true,
        hostingMode: true,
      },
      ...as(v),
    })
    // depth 1 leaves an unreadable logo as its id.
    return docs.map((d) => ({
      ...d,
      logo: typeof d.logo === 'object' ? (d.logo as Media | null) : null,
    }))
  })

export const getPage = (locale: Locale, slug: string) =>
  read(locale, ['pages', ...BLOCK_TAGS], ['page', slug], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
      ...as(v),
    })
    return docs[0] ?? null
  })

/** Published page slugs for generateStaticParams. */
export const getPageSlugs = () =>
  read(
    'en',
    ['pages'],
    ['page-slugs'],
    async (payload, v) => {
      const { docs } = await payload.find({
        collection: 'pages',
        depth: 0,
        pagination: false,
        select: { slug: true },
        ...as(v),
      })
      return docs.flatMap((d) => (d.slug ? [d.slug] : []))
    },
    { visitor: true },
  )

const redirectTarget = (to: Redirect['to']): string | null => {
  if (to?.type === 'custom') return to.url ?? null
  const ref = to?.reference
  if (!ref || typeof ref.value !== 'object' || !ref.value.slug) return null
  // Read with access off: never send visitors to a page that isn't published.
  if (ref.value._status !== 'published') return null
  return publicPath[ref.relationTo as RoutedCollection](ref.value.slug)
}

/**
 * Redirect stored for a public (unprefixed) path, e.g. /vyro → /products/vyro (spec §8.6).
 * Redirects are staff-only in the API (they are config, not content), so this lookup reads them
 * with access off; it only ever returns where the path points.
 */
export const findRedirect = (path: string) =>
  read(
    'en',
    ['redirects', 'pages', 'products', 'services', 'posts'],
    ['redirect', path],
    async () => {
      const payload = await getClient()
      const { docs } = await payload.find({
        collection: 'redirects',
        where: { from: { in: [path, `${path}/`] } },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      })
      const doc = docs[0]
      const to = doc && redirectTarget(doc.to)
      return to ? { to, permanent: doc.type === '301' || doc.type === '308' } : null
    },
  )

export const getServices = (locale: Locale) =>
  read(locale, ['services', 'products', 'media'], ['services'], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'services',
      depth: 1,
      pagination: false,
      sort: 'sortOrder',
      ...as(v),
    })
    return docs
  })

export const getService = (locale: Locale, slug: string) =>
  read(locale, ['services', ...BLOCK_TAGS], ['service', slug], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'services',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
      ...as(v),
    })
    return docs[0] ?? null
  })

export const getTeam = (locale: Locale) =>
  read(locale, ['team', 'media'], ['team'], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'team',
      depth: 1,
      pagination: false,
      sort: 'sortOrder',
      ...as(v),
    })
    return docs
  })

const POSTS_PER_PAGE = 12

/** Newest first; `tag` filters, `page` is 1-based. */
export const getPosts = (
  locale: Locale,
  { page = 1, limit = POSTS_PER_PAGE, tag }: { page?: number; limit?: number; tag?: string } = {},
) =>
  read(locale, ['posts', 'team', 'media'], ['posts', page, limit, tag], (payload, v) =>
    payload.find({
      collection: 'posts',
      depth: 1,
      page,
      limit,
      sort: '-publishedAt',
      where: tag ? { tags: { equals: tag } } : {},
      select: {
        title: true,
        slug: true,
        excerpt: true,
        cover: true,
        tags: true,
        publishedAt: true,
        author: true,
        hiStatus: true,
        updatedAt: true,
      },
      ...as(v),
    }),
  )

export const getPost = (locale: Locale, slug: string) =>
  read(locale, ['team', ...RICH_TEXT_TAGS], ['post', slug], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
      ...as(v),
    })
    return docs[0] ?? null
  })

/** Every product's published releases, newest first, with the installer file. */
export const getReleases = (locale: Locale, productId?: number) =>
  read(locale, ['releases', 'products'], ['releases', productId], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'releases',
      depth: 1,
      pagination: false,
      sort: '-releasedAt',
      where: productId ? { product: { equals: productId } } : {},
      ...as(v),
    })
    return docs
  })

type FeedProduct = { name: string; slug: string }
export type FeedItem = { id: string; date: string; product: FeedProduct | null; title: string } & (
  | { kind: 'entry'; type: 'new' | 'improved' | 'fixed'; body: Changelog['body'] }
  | { kind: 'release'; version: string; notes: string | null; channel: 'stable' | 'beta' }
)

const feedProduct = (p: unknown): FeedProduct | null =>
  p && typeof p === 'object' && 'slug' in p && 'name' in p
    ? { name: String(p.name), slug: String(p.slug) }
    : null

/** Company changelog (spec §8.12): changelog entries and published releases, newest first. */
export const getChangelogFeed = (
  locale: Locale,
  { productId, limit = 200 }: { productId?: number; limit?: number } = {},
) =>
  read(
    locale,
    ['changelog', 'releases', ...RICH_TEXT_TAGS],
    ['changelog-feed', productId, limit],
    async (payload, v): Promise<FeedItem[]> => {
      const where: Where = productId ? { product: { equals: productId } } : {}
      const [entries, releases] = await Promise.all([
        payload.find({ collection: 'changelog', depth: 1, limit, sort: '-date', where, ...as(v) }),
        payload.find({
          collection: 'releases',
          depth: 1,
          limit,
          sort: '-releasedAt',
          where,
          select: { product: true, version: true, notes: true, releasedAt: true, channel: true },
          ...as(v),
        }),
      ])
      return (
        [
          ...entries.docs.map((e): FeedItem => ({
            kind: 'entry',
            id: `entry-${e.id}`,
            date: e.date,
            product: feedProduct(e.product),
            title: e.title ?? '',
            type: e.type,
            body: e.body,
          })),
          ...releases.docs.map((r): FeedItem => ({
            kind: 'release',
            id: `release-${r.id}`,
            date: r.releasedAt,
            product: feedProduct(r.product),
            title: r.version,
            version: r.version,
            notes: r.notes ?? null,
            channel: r.channel,
          })),
        ]
          // An unreadable product (unpublished) hides its entries and releases too.
          .filter((item) => item.product)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit)
      )
    },
  )

/** Counters are written by raw SQL, so no hook expires them: refresh hourly. */
export const getDownloadTotal = () =>
  read('en', ['daily-stats'], ['download-total'], (payload) => downloadTotal(payload), {
    revalidate: 3600,
  })

export const getProduct = (locale: Locale, slug: string) =>
  read(locale, ['products', 'plans', ...BLOCK_TAGS], ['product', slug], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
      joins: { plans: { limit: 20, sort: 'sortOrder', where: { active: { equals: true } } } },
      ...as(v),
    })
    return docs[0] ?? null
  })

/** Product (or company-wide, `productId: null`) FAQs in admin order, optionally by category. */
export const getFaqs = (
  locale: Locale,
  { productId, categories }: { productId: number | null; categories?: string[] },
) =>
  read(locale, ['faqs'], ['faqs', productId, categories?.join(',')], async (payload, v) => {
    const where: Where = {
      and: [
        productId ? { product: { equals: productId } } : { product: { exists: false } },
        ...(categories ? [{ category: { in: categories } }] : []),
      ],
    }
    const { docs } = await payload.find({
      collection: 'faqs',
      depth: 0,
      pagination: false,
      sort: 'sortOrder',
      where,
      ...as(v),
    })
    return docs
  })

export const getTestimonials = (locale: Locale, productId: number) =>
  read(locale, ['testimonials', 'media'], ['testimonials', productId], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'testimonials',
      depth: 1,
      pagination: false,
      where: { product: { equals: productId } },
      ...as(v),
    })
    return docs
  })

/** A product's docs, flat; the docs pages build the tree from `parent`. */
export const getDocs = (locale: Locale, productId: number) =>
  read(locale, RICH_TEXT_TAGS, ['docs', productId], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'docs',
      // Rich text needs its uploads and link targets; keep the product and parent to slugs.
      depth: 1,
      populate: { products: { slug: true }, docs: { slug: true } },
      pagination: false,
      sort: 'sortOrder',
      where: { product: { equals: productId } },
      ...as(v),
    })
    return docs
  })

export const getProductSlugs = () =>
  read(
    'en',
    ['products'],
    ['product-slugs'],
    async (payload, v) => {
      const { docs } = await payload.find({
        collection: 'products',
        depth: 0,
        pagination: false,
        select: { slug: true, hostingMode: true },
        ...as(v),
      })
      return docs
    },
    { visitor: true },
  )

export const getJobs = (locale: Locale) =>
  read(locale, ['jobs'], ['jobs'], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'jobs',
      depth: 0,
      pagination: false,
      sort: '-postedAt',
      select: {
        title: true,
        slug: true,
        type: true,
        workMode: true,
        location: true,
        postedAt: true,
      },
      ...as(v),
    })
    return docs
  })

export const getJob = (locale: Locale, slug: string) =>
  read(locale, RICH_TEXT_TAGS, ['job', slug], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'jobs',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
      ...as(v),
    })
    return docs[0] ?? null
  })

export const getLegalPage = (locale: Locale, slug: string) =>
  read(locale, RICH_TEXT_TAGS, ['legal', slug], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'legal-pages',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
      ...as(v),
    })
    return docs[0] ?? null
  })

/** Every published document with its own URL, for the sitemap and static params. */
export const getRoutable = () =>
  read(
    'en',
    ['pages', 'products', 'services', 'posts', 'jobs', 'legal-pages', 'docs'],
    ['routable'],
    async (payload, v) => {
      const select = { slug: true, hiStatus: true, updatedAt: true } as const
      const all = (collection: 'pages' | 'services' | 'posts' | 'jobs' | 'legal-pages') =>
        payload
          .find({ collection, depth: 0, pagination: false, select, ...as(v) })
          .then((r) => r.docs)
      const [pages, services, posts, jobs, legal, products, docs] = await Promise.all([
        all('pages'),
        all('services'),
        all('posts'),
        all('jobs'),
        all('legal-pages'),
        payload
          .find({
            collection: 'products',
            depth: 0,
            pagination: false,
            select: { ...select, hostingMode: true },
            ...as(v),
          })
          .then((r) => r.docs),
        payload
          .find({
            collection: 'docs',
            depth: 0,
            pagination: false,
            select: { ...select, parent: true, product: true },
            ...as(v),
          })
          .then((r) => r.docs),
      ])
      return { pages, services, posts, jobs, legal, products, docs }
    },
    { visitor: true },
  )

/** Every tag used by a published post, most used first. */
export const getPostTags = (locale: Locale) =>
  read(locale, ['posts'], ['post-tags'], async (payload, v) => {
    const { docs } = await payload.find({
      collection: 'posts',
      depth: 0,
      pagination: false,
      select: { tags: true },
      ...as(v),
    })
    const counts = new Map<string, number>()
    for (const tag of docs.flatMap((d) => d.tags ?? [])) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  })
