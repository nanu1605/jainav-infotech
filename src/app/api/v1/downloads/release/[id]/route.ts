import type { NextRequest } from 'next/server'
import { z } from 'zod'

import type { Product } from '@/payload-types'
import { getClient } from '@/lib/cms'
import { downloadRedirect } from '@/lib/downloads'

const idParam = z.coerce.number().int().positive()

/** GET /api/v1/downloads/release/{id} → count, 302 to that release's installer (spec §12.5). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = idParam.safeParse((await params).id)
  if (!id.success) return new Response('Bad request', { status: 400 })

  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'releases',
    where: { id: { equals: id.data } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  const release = docs[0]
  // The product must be readable (published) too, not only the release.
  const product = release?.product as Product | number | undefined
  if (!release || typeof product !== 'object' || product.status === 'coming-soon') {
    return new Response('Not found', { status: 404 })
  }
  return downloadRedirect(payload, product.slug, release, req.nextUrl.origin)
}
