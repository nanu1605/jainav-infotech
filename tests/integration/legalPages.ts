import type { Payload } from 'payload'

// Seeded drafts can hold {{BLANKS}}, which real servers refuse to publish.
const context = { disableRevalidate: true, allowPlaceholders: true }

const slugsFor = (productSlug: string) => [
  'terms',
  `eula-${productSlug}`,
  'refunds-cancellation',
  'shipping-delivery',
]

/**
 * Publishes the legal pages the checkout needs for a product (seed.test.ts may have left drafts).
 * Returns what removes the product's own EULA again.
 */
export async function publishCheckoutPages(payload: Payload, productSlug: string) {
  for (const slug of slugsFor(productSlug)) {
    const { docs } = await payload.find({
      collection: 'legal-pages',
      where: { slug: { equals: slug } },
      draft: true,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const page = {
      version: '1.0',
      effectiveDate: new Date().toISOString(),
      _status: 'published' as const,
    }
    if (docs[0]) {
      await payload.update({
        collection: 'legal-pages',
        id: docs[0].id,
        data: page,
        depth: 0,
        overrideAccess: true,
        context,
      })
    } else {
      await payload.create({
        collection: 'legal-pages',
        data: { title: slug, slug, hiStatus: 'missing', ...page },
        depth: 0,
        overrideAccess: true,
        context,
      })
    }
  }
  return () =>
    payload.delete({
      collection: 'legal-pages',
      where: { slug: { equals: `eula-${productSlug}` } },
      depth: 0,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
}
