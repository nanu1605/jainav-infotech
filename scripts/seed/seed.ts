import type { CollectionSlug, Payload, RequiredDataFromCollectionSlug, Where } from 'payload'

import * as content from './content'
import type { HiPatch } from './content'
import { withHindi } from './withHindi'

// Seeds never trigger page revalidation (spec §3) and never overwrite existing content:
// anything already present (matched by its natural key) is left exactly as editors left it.
const context = { disableRevalidate: true }

export type SeedSummary = { created: string[]; skipped: string[] }

type Entry<S extends CollectionSlug> = {
  collection: S
  label: string
  where: Where
  en: RequiredDataFromCollectionSlug<S>
  hi: HiPatch
  /** Localized values written as a whole (rich text has no row ids to match). */
  hiRaw?: Record<string, unknown>
  /** Draft-enabled collections are seeded as drafts: Appendix A content is "to confirm". */
  draft: boolean
}

async function ensure<S extends CollectionSlug>(
  payload: Payload,
  summary: SeedSummary,
  { collection, label, where, en, hi, hiRaw, draft }: Entry<S>,
): Promise<number> {
  // Payload's per-collection option types don't narrow through a generic slug; the Entry type
  // above keeps the seed data itself type-checked, so the Local API is called untyped here.
  const local = payload as unknown as {
    find(o: object): Promise<{ docs: { id: number }[] }>
    create(o: object): Promise<{ id: number } & Record<string, unknown>>
    update(o: object): Promise<unknown>
  }
  const found = await local.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    draft,
    pagination: false,
    overrideAccess: true,
  })
  const existing = found.docs[0]
  if (existing) {
    summary.skipped.push(label)
    return existing.id
  }
  const doc = await local.create({
    collection,
    // Clone: seed data shares row objects between documents, and Payload writes ids onto rows.
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
  summary.created.push(label)
  return doc.id
}

export async function seed(payload: Payload): Promise<SeedSummary> {
  const summary: SeedSummary = { created: [], skipped: [] }

  // Local owner account for development (credentials live only in the gitignored .env).
  const { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD } = process.env
  if (process.env.NODE_ENV !== 'production' && DEV_ADMIN_EMAIL && DEV_ADMIN_PASSWORD) {
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    if (totalDocs === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: DEV_ADMIN_EMAIL,
          password: DEV_ADMIN_PASSWORD,
          name: 'Dev owner',
          roles: ['owner'],
        },
        context,
        overrideAccess: true,
      })
      summary.created.push('users:dev-owner')
    } else summary.skipped.push('users:dev-owner')
  }

  const productIds: Record<string, number> = {}
  for (const doc of content.products) {
    productIds[doc.en.slug] = await ensure(payload, summary, {
      collection: 'products',
      label: `products:${doc.en.slug}`,
      where: { slug: { equals: doc.en.slug } },
      draft: true,
      ...doc,
    })
  }

  const planIds: Record<string, number> = {}
  for (const plan of content.vyroPlans) {
    planIds[plan.en.code] = await ensure(payload, summary, {
      collection: 'plans',
      label: `plans:vyro/${plan.en.code}`,
      where: {
        and: [{ product: { equals: productIds.vyro } }, { code: { equals: plan.en.code } }],
      },
      draft: false,
      en: { ...plan.en, product: productIds.vyro },
      hi: plan.hi,
    })
  }

  // "Buy Pro" needs the Pro plan, which needs the product: link it once both exist.
  const vyro = await payload.findByID({
    collection: 'products',
    id: productIds.vyro,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  if (!vyro.secondaryButton?.type) {
    await payload.update({
      collection: 'products',
      id: vyro.id,
      data: { secondaryButton: { type: 'buy', plan: planIds.pro } },
      draft: true,
      context,
      overrideAccess: true,
    })
  }

  for (const { related, ...doc } of content.services) {
    await ensure(payload, summary, {
      collection: 'services',
      label: `services:${doc.en.slug}`,
      where: { slug: { equals: doc.en.slug } },
      draft: true,
      en: { ...doc.en, relatedProducts: related.map((slug) => productIds[slug]) },
      hi: doc.hi,
    })
  }

  await ensure(payload, summary, {
    collection: 'team',
    label: 'team:founder',
    where: { founder: { equals: true } },
    draft: false,
    ...content.founder,
  })

  for (const doc of content.faqs) {
    await ensure(payload, summary, {
      collection: 'faqs',
      label: `faqs:${doc.en.question}`,
      where: { question: { equals: doc.en.question } },
      draft: false,
      ...doc,
    })
  }

  for (const doc of content.pages) {
    await ensure(payload, summary, {
      collection: 'pages',
      label: `pages:${doc.en.slug}`,
      where: { slug: { equals: doc.en.slug } },
      draft: true,
      ...doc,
    })
  }

  for (const doc of content.legalPages) {
    await ensure(payload, summary, {
      collection: 'legal-pages',
      label: `legal-pages:${doc.en.slug}`,
      where: { slug: { equals: doc.en.slug } },
      draft: true,
      hiRaw: { body: content.legalBodyHi },
      ...doc,
    })
  }

  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })
  if (!settings.updatedAt) {
    const en = await payload.updateGlobal({
      slug: 'site-settings',
      locale: 'en',
      data: content.siteSettings.en,
      depth: 0,
      context,
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'site-settings',
      locale: 'hi',
      data: withHindi(en, content.siteSettings.hi) as typeof content.siteSettings.en,
      depth: 0,
      context,
      overrideAccess: true,
    })
    summary.created.push('site-settings')
  } else summary.skipped.push('site-settings')

  const nav = await payload.findGlobal({ slug: 'navigation', depth: 0, overrideAccess: true })
  if (!nav.header?.length && !nav.footer?.length) {
    const en = await payload.updateGlobal({
      slug: 'navigation',
      locale: 'en',
      data: structuredClone(content.navigation.en),
      depth: 0,
      context,
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'navigation',
      locale: 'hi',
      data: withHindi(en, content.navigation.hi) as typeof content.navigation.en,
      depth: 0,
      context,
      overrideAccess: true,
    })
    summary.created.push('navigation')
  } else summary.skipped.push('navigation')

  return summary
}
