import { Rss } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Container } from '@/components/layout/Container'
import type { Locale } from '@/i18n/routing'
import { getPosts, getPostTags } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

import { PageHeader } from './PageHeader'
import { PostList } from './PostList'

const tagPath = (tag: string) => `/blog/tag/${encodeURIComponent(tag)}`

export async function blogMetadata(
  locale: Locale,
  { page = 1, tag }: { page?: number; tag?: string },
) {
  const t = await getTranslations({ locale, namespace: 'blog' })
  const path = tag ? tagPath(tag) : page > 1 ? `/blog/page/${page}` : '/blog'
  return pageMetadata({
    locale,
    path,
    title: tag ? t('tagTitle', { tag }) : page > 1 ? t('pageTitle', { page }) : t('title'),
    description: t('intro'),
  }) satisfies Metadata
}

/** Blog list, tag pages and later pages share this (spec §8.11). */
export async function BlogIndex({
  locale,
  page = 1,
  tag,
}: {
  locale: Locale
  page?: number
  tag?: string
}) {
  const [result, tags, t] = await Promise.all([
    getPosts(locale, { page, tag, limit: tag ? 100 : undefined }),
    getPostTags(locale),
    getTranslations('blog'),
  ])
  if (page > 1 && !result.docs.length) notFound()
  const crumbs = [{ label: t('title'), href: '/blog' }]
  if (tag) crumbs.push({ label: tag, href: tagPath(tag) })
  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={tag ? t('tagTitle', { tag }) : t('title')}
        intro={t('intro')}
        crumbs={crumbs}
        locale={locale}
      >
        <a
          href={`/feeds/${locale}.xml`}
          className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-fg underline-offset-4 hover:underline"
        >
          <Rss aria-hidden className="size-4" />
          {t('rss')}
        </a>
      </PageHeader>
      <Container className="py-16 sm:py-24">
        <PostList
          result={result}
          locale={locale}
          tags={tags}
          activeTag={tag}
          pageHref={(n) => (n === 1 ? '/blog' : `/blog/page/${n}`)}
        />
      </Container>
    </main>
  )
}
