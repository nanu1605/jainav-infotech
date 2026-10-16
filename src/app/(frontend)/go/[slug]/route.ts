import { after, type NextRequest } from 'next/server'

import { getClient } from '@/lib/cms'
import { slugParam } from '@/lib/downloads'
import { withUtm } from '@/lib/links'
import { clientIp, limit } from '@/lib/rateLimit'
import { countEvent } from '@/lib/stats'

/** Tracked outbound redirect: active short link → 302 with UTM; the click is counted after. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const slug = slugParam.safeParse((await params).slug)
  if (!slug.success) return new Response('Not found', { status: 404 })

  // Keeps scripted clicks from inflating the counters (spec §16).
  const wait = await limit('goClick', clientIp(req.headers))
  if (wait) {
    return new Response('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(wait), 'Cache-Control': 'no-store' },
    })
  }

  const payload = await getClient()
  // Short links are staff-only in the API (they are config); this only follows an active one.
  const { docs } = await payload.find({
    collection: 'short-links',
    where: { and: [{ slug: { equals: slug.data } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const link = docs[0]
  if (!link) return new Response('Not found', { status: 404 })

  if (req.method !== 'HEAD') after(() => countEvent(payload, 'go-click', slug.data))
  return new Response(null, {
    status: 302,
    headers: {
      Location: withUtm(link.destination, slug.data, link.utm),
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
