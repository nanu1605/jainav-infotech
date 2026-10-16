import type { CollectionAfterChangeHook } from 'payload'

import type { Product } from '@/payload-types'
import { isDraftWrite } from '@/plugins/liveDoc'

/**
 * Spec §8.6: a published product with a Visit button keeps the short link /go/{slug} pointing at
 * its external URL, so the button's clicks are counted. Draft saves change nothing.
 */
export const syncShortLink: CollectionAfterChangeHook<Product> = async ({
  collection,
  doc,
  req,
}) => {
  if (isDraftWrite(req, collection.slug) || doc._status !== 'published') return doc
  const visits = [doc.primaryButton?.type, doc.secondaryButton?.type].includes('visit')
  if (!visits || !doc.externalUrl || !doc.slug) return doc

  const { docs } = await req.payload.find({
    collection: 'short-links',
    where: { slug: { equals: doc.slug } },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  const existing = docs[0]
  if (existing?.destination === doc.externalUrl && existing.active) return doc
  const data = { destination: doc.externalUrl, active: true }
  if (existing) {
    await req.payload.update({
      collection: 'short-links',
      id: existing.id,
      data,
      depth: 0,
      req,
      overrideAccess: true,
    })
  } else {
    await req.payload.create({
      collection: 'short-links',
      data: { ...data, slug: doc.slug, notes: `Kept in sync with the ${doc.name} product page.` },
      depth: 0,
      req,
      overrideAccess: true,
    })
  }
  return doc
}
