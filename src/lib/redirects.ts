import 'server-only'

import { notFound, permanentRedirect, redirect } from 'next/navigation'

import type { Locale } from '@/i18n/routing'

import { findRedirect } from './queries'
import { localizedPath } from './seo'

/**
 * End of every lookup that found nothing (spec §8.6): follow a stored redirect for the public
 * path (old URLs, vanity paths), keeping the visitor's language, else the 404 page. Next.js can
 * only send 308 or 307 from a render, so 301/302 redirects map to those.
 */
export async function redirectOrNotFound(locale: Locale, path: string): Promise<never> {
  const target = await findRedirect(path)
  if (target) {
    const to = target.to.startsWith('/') ? localizedPath(locale, target.to) : target.to
    if (target.permanent) permanentRedirect(to)
    redirect(to)
  }
  notFound()
}
