/**
 * pnpm seed:publish — development only. Publishes every seeded draft so the public pages have
 * content locally and in e2e runs. On real servers editors (and the Owner, for legal pages and
 * releases) publish after review; this refuses to run against anything but a local database.
 */
import config from '@payload-config'
import { getPayload, type CollectionSlug } from 'payload'

const host = new URL(process.env.DATABASE_URL ?? 'postgres://invalid').hostname
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`seed:publish only runs against a local database (DATABASE_URL host: ${host}).`)
}

const COLLECTIONS: CollectionSlug[] = [
  'products',
  'services',
  'pages',
  'posts',
  'jobs',
  'docs',
  'legal-pages',
]

const payload = await getPayload({ config })
let published = 0
const skipped: string[] = []
for (const collection of COLLECTIONS) {
  const { docs } = await payload.find({
    collection,
    draft: true,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    where: { _status: { equals: 'draft' } },
  })
  for (const doc of docs) {
    try {
      // Update merges into the latest version (the draft) for every locale, then publishes it.
      await payload.update({
        collection,
        id: doc.id,
        data: { _status: 'published' } as never,
        depth: 0,
        overrideAccess: true,
        // Legal drafts may hold {{BLANKS}}, which real servers refuse to publish.
        context: { disableRevalidate: true, allowPlaceholders: true },
      })
      published++
    } catch (err) {
      // Publishing validates: drafts still waiting on a placeholder (a product URL…) stay drafts.
      skipped.push(`${collection}#${doc.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
payload.logger.info(`Published ${published} draft documents.`)
for (const line of skipped) payload.logger.warn(`Left as draft: ${line}`)
