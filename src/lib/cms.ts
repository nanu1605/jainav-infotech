import 'server-only'

import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import { cache } from 'react'

import type { Locale } from '@/i18n/routing'
import type { User } from '@/payload-types'

/**
 * The Payload client. `cron` starts the jobs queue's autoRun in the server process (spec §2);
 * Payload skips it during builds, and tests run their jobs themselves.
 */
export const getClient = () => getPayload({ config, cron: process.env.NODE_ENV !== 'test' })

export type Viewer = { draft: boolean; user: User | null; locale: Locale }

/**
 * Visitors read published content as anonymous users. In draft mode (live preview) the signed-in
 * admin reads drafts with their own access rights; a draft cookie without a session reads as a
 * visitor. Only draft mode touches headers, so public pages stay static.
 */
const getSession = cache(async (): Promise<{ draft: boolean; user: User | null }> => {
  if (!(await draftMode()).isEnabled) return { draft: false, user: null }
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'users' ? { draft: true, user } : { draft: false, user: null }
})

/** True while a signed-in admin previews drafts. */
export const isPreview = async () => (await getSession()).draft

/**
 * Runs a Local API read for `locale`, cached until one of `tags` (collection slugs, revalidated by
 * the collection hooks) is expired. `key` must identify every input the read depends on.
 * Draft mode skips the cache (Next bypasses unstable_cache there anyway), and so does development.
 */
export async function read<T>(
  locale: Locale,
  tags: string[],
  key: (string | number | boolean | null | undefined)[],
  run: (payload: Payload, viewer: Viewer) => Promise<T>,
  opts: {
    /** Seconds, for data no hook revalidates (counters). */
    revalidate?: number
    /** Always read as a visitor: for generateStaticParams, which has no request. */
    visitor?: boolean
  } = {},
): Promise<T> {
  const session = opts.visitor ? { draft: false, user: null } : await getSession()
  const viewer: Viewer = { ...session, locale }
  const exec = async () => run(await getClient(), viewer)
  // Development renders every request anyway, and seeds and scripts can't expire tags.
  if (viewer.draft || process.env.NODE_ENV === 'development') return exec()
  return unstable_cache(exec, ['cms', locale, ...key.map(String)], {
    tags,
    revalidate: opts.revalidate,
  })()
}

/** Local API options shared by every public read (CLAUDE.md: explicit access and depth). */
export const as = ({ draft, user, locale }: Viewer) => ({
  draft,
  user,
  locale,
  overrideAccess: false,
})

/** generateStaticParams: CI builds without a database render pages on first request (§4.3). */
export const staticParams = async <T>(load: () => Promise<T[]>): Promise<T[]> =>
  process.env.SKIP_DB_AT_BUILD === '1' ? [] : load()
