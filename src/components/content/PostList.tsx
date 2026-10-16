import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { media } from '@/components/blocks/shared'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate } from '@/lib/format'
import type { getPosts } from '@/lib/queries'

type Result = Awaited<ReturnType<typeof getPosts>>

/** Post cards plus tag chips and pagination (spec §8.11). `base` builds page links. */
export async function PostList({
  result,
  locale,
  tags,
  activeTag,
  pageHref,
}: {
  result: Result
  locale: Locale
  tags: string[]
  activeTag?: string
  pageHref: (page: number) => string
}) {
  const t = await getTranslations('blog')
  return (
    <div>
      {tags.length > 0 && (
        <nav aria-label={t('tags')} className="mb-10 flex flex-wrap gap-2">
          <Tag asChild>
            <Link href="/blog" aria-current={!activeTag ? 'page' : undefined}>
              {t('all')}
            </Link>
          </Tag>
          {tags.map((tag) => (
            <Tag asChild key={tag}>
              <Link
                href={`/blog/tag/${encodeURIComponent(tag)}`}
                aria-current={tag === activeTag ? 'page' : undefined}
              >
                {tag}
              </Link>
            </Tag>
          ))}
        </nav>
      )}
      {result.docs.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.docs.map((post) => {
            const cover = media(post.cover)
            return (
              <li key={post.id}>
                <Card variant="interactive" className="flex h-full flex-col overflow-hidden p-0">
                  {cover && (
                    <div className="relative aspect-[16/9] bg-bg-subtle">
                      <ResponsiveImage
                        media={cover}
                        fill
                        decorative
                        sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt} className="text-sm text-fg-muted">
                        {formatDate(locale, post.publishedAt)}
                      </time>
                    )}
                    <CardTitle as="h2" href={`/blog/${post.slug}`} className="mt-1">
                      {post.title}
                    </CardTitle>
                    {post.excerpt && <CardDescription>{post.excerpt}</CardDescription>}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-lg text-fg-muted">{t('none')}</p>
      )}
      {result.totalPages > 1 && (
        <nav aria-label={t('pagination')} className="mt-12 flex items-center justify-between gap-4">
          {result.prevPage ? (
            <Link
              href={pageHref(result.prevPage)}
              rel="prev"
              className="inline-flex min-h-10 items-center gap-1 font-medium text-fg underline-offset-4 hover:underline"
            >
              <ChevronLeft aria-hidden className="size-4" />
              {t('newer')}
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-fg-muted">
            {t('page', { page: result.page ?? 1, total: result.totalPages })}
          </p>
          {result.nextPage ? (
            <Link
              href={pageHref(result.nextPage)}
              rel="next"
              className="inline-flex min-h-10 items-center gap-1 font-medium text-fg underline-offset-4 hover:underline"
            >
              {t('older')}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
