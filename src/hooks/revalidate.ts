import { revalidatePath, revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

import { routing } from '@/i18n/routing'

type Doc = { _status?: 'draft' | 'published' | null; slug?: string | null } & Record<
  string,
  unknown
>

/**
 * English URLs are rewritten to /en/... by next-intl, so the cache keys are the internal
 * /en and /hi paths, never the unprefixed public path (spec §4.3).
 */
export const internalPaths = (publicPath: string): string[] =>
  routing.locales.map((locale) => (publicPath === '/' ? `/${locale}` : `/${locale}${publicPath}`))

/**
 * Seeds and jobs set `context.disableRevalidate`. next/cache also throws outside a Next
 * request (payload run, tests, job runners), so a failure here must never fail the write.
 */
export function revalidate(
  req: PayloadRequest,
  { paths = [], tags = [] }: { paths?: string[]; tags?: string[] },
) {
  if (req.context.disableRevalidate) return
  try {
    for (const path of paths) revalidatePath(path)
    for (const tag of tags) revalidateTag(tag, { expire: 0 })
  } catch (err) {
    req.payload.logger.debug({ err }, 'revalidation skipped (no Next request context)')
  }
}

const isLive = (doc: Doc | undefined): doc is Doc =>
  Boolean(
    doc &&
    Object.keys(doc).length > 0 &&
    (doc._status === undefined || doc._status === 'published'),
  )

/**
 * Revalidates a collection's cache tag and, for documents with URLs, their pages in both locales.
 * `paths` returns public (unprefixed) paths for a document. Draft-only saves are skipped; an
 * unpublish or slug change also revalidates the previous URL.
 * Returns hook arrays: `hooks: { ...revalidateCollection({ tag: 'faqs' }) }`, or concatenate
 * with a collection's own hooks.
 */
export function revalidateCollection({
  tag,
  paths = () => [],
}: {
  tag: string
  paths?: (doc: Doc) => string[]
}): { afterChange: CollectionAfterChangeHook[]; afterDelete: CollectionAfterDeleteHook[] } {
  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
    const current = doc as Doc
    const previous = previousDoc as Doc | undefined
    if (!isLive(current) && !isLive(previous)) return doc
    const publicPaths = new Set<string>()
    if (isLive(current)) paths(current).forEach((p) => publicPaths.add(p))
    if (isLive(previous)) paths(previous).forEach((p) => publicPaths.add(p))
    revalidate(req, { paths: [...publicPaths].flatMap(internalPaths), tags: [tag] })
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
    revalidate(req, { paths: paths(doc as Doc).flatMap(internalPaths), tags: [tag] })
    return doc
  }
  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

export const revalidateGlobal =
  (tag: string): GlobalAfterChangeHook =>
  ({ doc, req }) => {
    revalidate(req, { tags: [tag] })
    return doc
  }
