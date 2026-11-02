import 'server-only'

import type { Payload, Where } from 'payload'

import type { Locale } from '@/i18n/routing'
import { getClient } from '@/lib/cms'
import type { TaxSettings } from '@/lib/tax/gst'
import type { CommerceSetting, Customer, Order, Plan, Product } from '@/payload-types'

/** Commerce settings (not cached: checkout must see a change at once). */
export const getCommerceSettings = async (payload?: Payload): Promise<CommerceSetting> =>
  (payload ?? (await getClient())).findGlobal({
    slug: 'commerce-settings',
    depth: 0,
    overrideAccess: true,
  })

export const taxSettings = (s: CommerceSetting): TaxSettings => ({
  gstEnabled: s.gstEnabled ?? false,
  ratePercent: s.gstRatePercent ?? 18,
  pricesIncludeGst: s.pricesIncludeGst ?? true,
  homeStateCode: s.homeStateCode ?? '23',
})

/**
 * Whether accounts and checkout are open (spec §8.1): `storeEnabled` in site settings. Local
 * development always opens them, so the store can be tried before launch; staging turns the
 * setting on with Razorpay test keys.
 */
export async function storeOpen(payload?: Payload): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') return true
  const settings = await (payload ?? (await getClient())).findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })
  return settings.storeEnabled === true
}

/**
 * Whether every legal page the checkout links to is live, read as a visitor reads them: a buyer
 * can't accept a EULA that is a 404 (spec §8.13).
 */
export async function checkoutPagesPublished(
  payload: Payload,
  productSlug: string,
): Promise<boolean> {
  const slugs = ['terms', `eula-${productSlug}`, 'refunds-cancellation', 'shipping-delivery']
  const { totalDocs } = await payload.count({
    collection: 'legal-pages',
    where: { slug: { in: slugs } },
    overrideAccess: false,
  })
  return totalDocs === slugs.length
}

export type Purchasable = { product: Product; plan: Plan }

/**
 * A published hosted product and one of its active paid plans, as a visitor reads them (the
 * public pricing page), or null.
 */
export async function findPurchasable(
  payload: Payload,
  productSlug: string,
  planCode: string,
  locale: Locale = 'en',
): Promise<Purchasable | null> {
  const { docs: products } = await payload.find({
    collection: 'products',
    where: { and: [{ slug: { equals: productSlug } }, { hostingMode: { equals: 'hosted' } }] },
    limit: 1,
    depth: 0,
    locale,
    overrideAccess: false,
  })
  const product = products[0]
  if (!product) return null
  const { docs: plans } = await payload.find({
    collection: 'plans',
    where: {
      and: [
        { product: { equals: product.id } },
        { code: { equals: planCode } },
        { active: { equals: true } },
        { priceINR: { greater_than: 0 } },
      ],
    },
    limit: 1,
    depth: 0,
    locale,
    overrideAccess: false,
  })
  return plans[0] ? { product, plan: plans[0] } : null
}

/** A customer's own orders (CLAUDE.md: overrideAccess plus an explicit where on the customer). */
export async function customerOrders(
  payload: Payload,
  customer: Customer,
  where: Where[] = [],
  limit = 50,
  /** Product and plan names in this language. */
  locale: Locale = 'en',
): Promise<Order[]> {
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ customer: { equals: customer.id } }, ...where] },
    sort: '-createdAt',
    limit,
    depth: 1,
    locale,
    overrideAccess: true,
  })
  return docs
}

/** One of the customer's orders by number, or null (also when it belongs to someone else). */
export async function customerOrder(
  payload: Payload,
  customer: Customer,
  orderNumber: string,
  locale: Locale = 'en',
) {
  const [order] = await customerOrders(
    payload,
    customer,
    [{ orderNumber: { equals: orderNumber } }],
    1,
    locale,
  )
  return order ?? null
}
