/**
 * pnpm seed:store — development only. The store has no product of its own since Clokrix sells on
 * its own site (2026-11-27), so this adds the Sample App, a published hosted stand-in with Free
 * and Pro plans, a Buy Pro button and a sample EULA: checkout, licensing and refunds can then be
 * tried locally and in e2e runs. Paid plans without a price (one added in a local admin) also get
 * the stand-in price and are switched on. It refuses to run against anything but a local
 * database, so neither the Sample App nor a stand-in price reaches staging or production.
 *
 * It also gives the dev customer (DEV_BUYER) a complimentary Sample App Pro license and prints its
 * key, for scripts/license-test-client.
 */
import { register } from 'node:module'

import config from '@payload-config'
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload, type RequiredDataFromCollectionSlug, type Where } from 'payload'

import type { HiPatch } from './content'
import { withHindi } from './withHindi'

const host = new URL(process.env.DATABASE_URL ?? 'postgres://invalid').hostname
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`seed:store only runs against a local database (DATABASE_URL host: ${host}).`)
}

// The license hooks load server-only modules; outside Next, `server-only` is Next's empty build
// (as in vitest.config.mts).
const SERVER_ONLY = 'next/dist/compiled/server-only/empty.js'
const hook = `export const resolve = (s, c, next) => next(s === 'server-only' ? '${SERVER_ONLY}' : s, c)`
register(`data:text/javascript,${encodeURIComponent(hook)}`)

/** ₹999 in paise: a round test figure, not a price decision. */
const STAND_IN_PRICE = 99_900
const DEV_BUYER = 'dev-buyer@example.test'
const SLUG = 'sample-app'
/** Checkout links /legal/eula-{product slug} and needs it published. */
const EULA_SLUG = `eula-${SLUG}`
// Like every seed: no page revalidation (spec §3).
const context = { disableRevalidate: true }

type Seeded<S extends 'products' | 'plans' | 'legal-pages'> = {
  en: RequiredDataFromCollectionSlug<S>
  hi: HiPatch
  /** Localized values written as a whole (rich text has no row ids to match). */
  hiRaw?: Record<string, unknown>
}

const sampleApp: Seeded<'products'> = {
  en: {
    name: 'Sample App',
    slug: SLUG,
    tagline: 'A stand-in product for trying the store locally.',
    summary:
      'It exists only in local development and test databases, so that checkout, licenses and refunds can be tried at a test price.',
    type: 'desktop',
    category: 'other',
    platforms: ['windows'],
    status: 'live',
    hostingMode: 'hosted',
    accentColor: '#64748B',
    hiStatus: 'draft',
    featured: false,
    sortOrder: 99,
    // No release is imported, so this resolves to "Join the waitlist".
    primaryButton: { type: 'download', channel: 'stable' },
    // secondaryButton (Buy Pro) is linked to the Pro plan once the plans exist (below).
    layout: [
      { blockType: 'productHero', animation: 'none' },
      { blockType: 'pricing', heading: 'Free and Pro', source: 'plans' },
      { blockType: 'download', heading: 'Download Sample App', channel: 'stable' },
    ],
  },
  hi: {
    tagline: 'स्टोर को लोकल तौर पर आज़माने के लिए एक नमूना प्रोडक्ट।',
    summary:
      'यह सिर्फ़ लोकल डेवलपमेंट और टेस्ट डेटाबेस में होता है, ताकि चेकआउट, लाइसेंस और रिफ़ंड एक टेस्ट कीमत पर आज़माए जा सकें।',
    layout: [{}, { heading: 'Free और Pro' }, { heading: 'Sample App डाउनलोड करें' }],
  },
}

/** The limits the e2e tests count on: two devices ("2 of 2"), 12 months of updates. */
const samplePlans: { en: Omit<Seeded<'plans'>['en'], 'product'>; hi: HiPatch }[] = [
  {
    en: {
      code: 'free',
      name: 'Free',
      billing: 'one_time',
      priceINR: 0,
      active: true,
      sortOrder: 1,
    },
    hi: { name: 'फ़्री' },
  },
  {
    en: {
      code: 'pro',
      name: 'Pro',
      billing: 'one_time',
      priceINR: STAND_IN_PRICE,
      maxActivations: 2,
      updatesForMonths: 12,
      highlight: true,
      active: true,
      sortOrder: 2,
    },
    hi: { name: 'प्रो' },
  },
]

// Kept here, not in ./legal/, which holds the site's real legal drafts.
const EULA_TEXT = {
  en: `This is a sample agreement for trying the store locally. It is not a real agreement.

The Sample App exists only in local development and test databases, and nothing real is sold under it.`,
  hi: `यह स्टोर को लोकल तौर पर आज़माने के लिए एक नमूना अनुबंध है। यह कोई असली अनुबंध नहीं है।

Sample App सिर्फ़ लोकल डेवलपमेंट और टेस्ट डेटाबेस में होता है, और इसके तहत कुछ भी असली नहीं बिकता।`,
}

const payload = await getPayload({ config })

type Found = { id: number; _status?: string | null }

/**
 * The document `where` finds, else a new one: English first, then the Hindi on top, as
 * scripts/seed/seed.ts `ensure` writes them. Products and legal pages start as drafts and are
 * published below; anything already present is left as it is.
 */
async function ensure<S extends 'products' | 'plans' | 'legal-pages'>(
  collection: S,
  where: Where,
  { en, hi, hiRaw }: Seeded<S>,
): Promise<Found> {
  // As in seed.ts: Payload's per-collection option types don't narrow through a generic slug, and
  // the data above is type-checked already, so the Local API is called untyped here.
  const local = payload as unknown as {
    find(o: object): Promise<{ docs: Found[] }>
    create(o: object): Promise<Found & Record<string, unknown>>
    update(o: object): Promise<unknown>
  }
  const draft = collection !== 'plans'
  const { docs } = await local.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    draft,
    overrideAccess: true,
  })
  if (docs[0]) return docs[0]
  const doc = await local.create({
    collection,
    // Clone: Payload writes row ids onto the data it is given.
    data: structuredClone(en),
    locale: 'en',
    draft,
    depth: 0,
    context,
    overrideAccess: true,
  })
  await local.update({
    collection,
    id: doc.id,
    locale: 'hi',
    data: { ...(withHindi(doc, hi) as object), ...hiRaw },
    draft,
    depth: 0,
    context,
    overrideAccess: true,
  })
  return doc
}

const { docs: unpriced } = await payload.find({
  collection: 'plans',
  where: { and: [{ code: { not_equals: 'free' } }, { priceINR: { exists: false } }] },
  pagination: false,
  depth: 0,
  overrideAccess: true,
})
for (const plan of unpriced) {
  await payload.update({
    collection: 'plans',
    id: plan.id,
    data: { priceINR: STAND_IN_PRICE, active: true },
    depth: 0,
    overrideAccess: true,
    context,
  })
}
payload.logger.info(`Gave ${unpriced.length} plan(s) the stand-in price.`)

const productId = (await ensure('products', { slug: { equals: SLUG } }, sampleApp)).id
const planIds: Record<string, number> = {}
for (const plan of samplePlans) {
  const where: Where = {
    and: [{ product: { equals: productId } }, { code: { equals: plan.en.code } }],
  }
  const en = { ...plan.en, product: productId }
  planIds[plan.en.code] = (await ensure('plans', where, { en, hi: plan.hi })).id
}

// "Buy Pro" needs the Pro plan, which needs the product: link it once both exist, then publish
// in every language (seed:publish ran before this, so it doesn't).
const latest = await payload.findByID({
  collection: 'products',
  id: productId,
  draft: true,
  depth: 0,
  overrideAccess: true,
})
if (!latest.secondaryButton?.type || latest._status !== 'published') {
  await payload.update({
    collection: 'products',
    id: productId,
    data: {
      _status: 'published',
      ...(latest.secondaryButton?.type
        ? {}
        : { secondaryButton: { type: 'buy' as const, plan: planIds.pro } }),
    },
    depth: 0,
    context,
    overrideAccess: true,
  })
}

const editorConfig = await editorConfigFactory.default({ config: payload.config })
const body = (markdown: string) => convertMarkdownToLexical({ editorConfig, markdown })
const eula = await ensure(
  'legal-pages',
  { slug: { equals: EULA_SLUG } },
  {
    en: {
      title: 'Sample App End User License Agreement',
      slug: EULA_SLUG,
      // The EULA version the seeded commerce settings record at checkout.
      version: '0.1',
      effectiveDate: new Date().toISOString(),
      hiStatus: 'draft',
      body: body(EULA_TEXT.en),
    },
    hi: { title: 'Sample App अंतिम उपयोगकर्ता लाइसेंस अनुबंध' },
    hiRaw: { body: body(EULA_TEXT.hi) },
  },
)
if (eula._status !== 'published') {
  await payload.update({
    collection: 'legal-pages',
    id: eula.id,
    data: { _status: 'published' },
    depth: 0,
    context,
    overrideAccess: true,
  })
}
// Checkout also needs the seeded commerce settings and the Terms, refunds and delivery pages.
payload.logger.info(
  `Sample App ready: /products/${SLUG}, checkout at /checkout/${SLUG}/pro (after pnpm seed and seed:publish).`,
)

const first = async <T>(result: Promise<{ docs: T[] }>) => (await result).docs[0]
const customer =
  (await first(
    payload.find({
      collection: 'customers',
      where: { email: { equals: DEV_BUYER } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  )) ??
  (await payload.create({
    collection: 'customers',
    data: { email: DEV_BUYER, name: 'Dev Buyer', preferredLocale: 'en', status: 'active' },
    depth: 0,
    context,
    overrideAccess: true,
  }))

// The beforeChange hook generates the key; afterRead's licenseKey decrypts it.
const license =
  (await first(
    payload.find({
      collection: 'licenses',
      where: { and: [{ customer: { equals: customer.id } }, { product: { equals: productId } }] },
      sort: 'issuedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  )) ??
  (await payload.create({
    collection: 'licenses',
    data: {
      product: productId,
      plan: planIds.pro,
      customer: customer.id,
      status: 'active',
      source: 'complimentary',
    },
    depth: 0,
    context,
    overrideAccess: true,
  }))
payload.logger.info(
  `${DEV_BUYER}'s Sample App Pro license (${license.status}): ${license.licenseKey}`,
)
