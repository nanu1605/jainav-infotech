import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getClient } from '@/lib/cms'
import { downloadRedirect, publishedReleases, slugParam } from '@/lib/downloads'
import { DEFAULT_PLATFORM, latestRelease } from '@/lib/releases'

const query = z.object({
  channel: z.enum(['stable', 'beta']).default('stable'),
  platform: z
    .string()
    .regex(/^[a-z0-9]+-[a-z0-9_]+$/)
    .default(DEFAULT_PLATFORM),
})

/** GET /api/v1/downloads/{product}/latest?channel=stable → count, 302 to the newest installer. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ product: string }> }) {
  const slug = slugParam.safeParse((await params).product)
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!slug.success || !q.success) return new Response('Bad request', { status: 400 })

  const payload = await getClient()
  const found = await publishedReleases(payload, slug.data)
  const release = found && latestRelease(found.releases, q.data)
  if (!release || found.product.status === 'coming-soon') {
    return new Response('Not found', { status: 404 })
  }
  return downloadRedirect(payload, slug.data, release, req.nextUrl.origin)
}
