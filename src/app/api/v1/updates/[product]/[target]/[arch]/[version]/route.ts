import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getClient } from '@/lib/cms'
import { installerUrl, publishedReleases, slugParam } from '@/lib/downloads'
import { updateFor } from '@/lib/releases'

const params = z.object({
  product: slugParam,
  target: z.string().regex(/^[a-z0-9]{1,20}$/i),
  arch: z.string().regex(/^[a-z0-9_]{1,20}$/i),
  version: z.string().max(64),
})
const query = z.object({ channel: z.enum(['stable', 'beta']).default('stable') })

const noContent = () =>
  new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })

/**
 * Tauri v2 update feed (spec §12.5), URL frozen before the first public VYRO build:
 * GET /api/v1/updates/{product}/{target}/{arch}/{current_version}?channel=stable
 * → 200 { version, notes, pub_date, url, signature } for a newer release, otherwise 204.
 * Unknown products and malformed versions also answer 204, so old clients never error.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  const p = params.safeParse(await ctx.params)
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!p.success || !q.success) return new Response('Bad request', { status: 400 })

  const found = await publishedReleases(await getClient(), p.data.product)
  if (!found) return noContent()
  const release = updateFor(found.releases, {
    target: p.data.target,
    arch: p.data.arch,
    current: p.data.version,
    channel: q.data.channel,
  })
  const url = release && installerUrl(release, req.nextUrl.origin)
  if (!release || !url) return noContent()

  return Response.json(
    {
      version: release.version,
      notes: release.notes ?? '',
      pub_date: new Date(release.releasedAt).toISOString(),
      url,
      signature: release.updaterSignature.trim(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
