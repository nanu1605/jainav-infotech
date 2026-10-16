import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { Locale } from '@/i18n/routing'
import type { Plan } from '@/payload-types'

import { resolveProductButton } from './productButtons'
import { staticParams } from './cms'
import { getProduct, getProductSlugs, getReleases, getSettings } from './queries'
import { latestRelease } from './releases'
import { pageMetadata } from './seo'

/**
 * Everything a product page and its hosted sub-pages need, loaded once per request:
 * the product, its active plans, published releases (latest per channel) and resolved buttons.
 * Unknown or unpublished slugs 404; `hostedOnly` 404s sub-pages of external products.
 */
export const loadProduct = cache(async (locale: Locale, slug: string, hostedOnly = false) => {
  const [product, settings] = await Promise.all([getProduct(locale, slug), getSettings(locale)])
  if (!product || (hostedOnly && product.hostingMode !== 'hosted')) notFound()
  const releases = await getReleases(locale, product.id)
  const latest = {
    stable: latestRelease(releases, { channel: 'stable' }),
    beta: latestRelease(releases, { channel: 'beta' }),
  }
  const plans = (product.plans?.docs ?? []).filter((p): p is Plan => typeof p === 'object')
  const ctx = {
    releases: latest,
    storeEnabled: settings.storeEnabled ?? false,
    schedulerUrl: settings.schedulerUrl,
  }
  return {
    product,
    plans,
    releases,
    latest,
    settings,
    buttons: [
      resolveProductButton(product.primaryButton, product, ctx),
      resolveProductButton(product.secondaryButton, product, ctx),
    ]
      .filter((b) => b !== null)
      // Both buttons can collapse to the waitlist (coming soon): show it once.
      .filter((b, i, all) => all.findIndex((o) => o.href === b.href) === i),
  }
})

export type LoadedProduct = Awaited<ReturnType<typeof loadProduct>>

/** Metadata for a product page or one of its hosted sub-pages (same Hindi status as the product). */
export function productMetadata(
  { product }: LoadedProduct,
  locale: Locale,
  sub?: { path: string; title: string; description?: string },
) {
  return pageMetadata({
    locale,
    path: `/products/${product.slug}${sub ? `/${sub.path}` : ''}`,
    title: sub ? `${sub.title} – ${product.name}` : product.name,
    description: sub?.description ?? product.summary ?? product.tagline,
    seo: sub ? null : product.meta,
    hiStatus: product.hiStatus,
  })
}

/** Product slugs for generateStaticParams; `hosted` limits them to products with sub-pages. */
export const productParams = (hosted = false) =>
  staticParams(async () =>
    (await getProductSlugs())
      .filter((p) => !hosted || p.hostingMode === 'hosted')
      .map((p) => ({ slug: p.slug })),
  )
