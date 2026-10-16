import 'server-only'

import { after } from 'next/server'
import type { Payload } from 'payload'
import { z } from 'zod'

import type { Installer, Release } from '@/payload-types'

import { countEvent } from './stats'

export const slugParam = z.string().regex(/^[a-z0-9-]{1,80}$/)

/** Published releases of a published product, as an anonymous visitor would see them. */
export async function publishedReleases(payload: Payload, slug: string) {
  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    select: { slug: true, status: true },
    overrideAccess: false,
  })
  const product = docs[0]
  if (!product) return null
  const releases = await payload.find({
    collection: 'releases',
    where: { product: { equals: product.id } },
    pagination: false,
    depth: 1,
    overrideAccess: false,
  })
  return { product, releases: releases.docs }
}

/** The installer's absolute URL (local-disk URLs are relative to the site). */
export const installerUrl = (release: Release, origin: string): string | null => {
  const installer = release.installer as Installer | number
  if (typeof installer !== 'object' || !installer.url) return null
  return new URL(installer.url, origin).toString()
}

/** Counts the download after the response, then 302s to the file (spec §12.5). */
export function downloadRedirect(
  payload: Payload,
  slug: string,
  release: Release,
  req: Request & { nextUrl: URL },
) {
  const url = installerUrl(release, req.nextUrl.origin)
  if (!url) return new Response('Not found', { status: 404 })
  // Next answers HEAD with the GET handler; a HEAD probe (link checkers) is not a download.
  if (req.method !== 'HEAD')
    after(() => countEvent(payload, 'download', `${slug}@${release.version}`))
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Cache-Control': 'no-store' },
  })
}
