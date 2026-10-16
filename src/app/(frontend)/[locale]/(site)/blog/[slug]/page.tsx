import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { media } from '@/components/blocks/shared'
import { JsonLd } from '@/components/content/JsonLd'
import { PageHeader } from '@/components/content/PageHeader'
import { RichText } from '@/components/content/RichText'
import { Container } from '@/components/layout/Container'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardTitle } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Team } from '@/payload-types'
import { staticParams } from '@/lib/cms'
import { formatDate, plainText, readingMinutes } from '@/lib/format'
import { getPosts, getPost, getRoutable } from '@/lib/queries'
import { absoluteUrl, pageMetadata, SITE_URL } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () =>
  staticParams(async () => (await getRoutable()).posts.map((p) => ({ slug: p.slug })))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const post = await getPost(locale, slug)
  if (!post) return {}
  const meta = pageMetadata({
    locale,
    path: `/blog/${slug}`,
    title: post.title ?? '',
    description: post.excerpt,
    seo: post.meta,
    hiStatus: post.hiStatus,
    shareImage: `/og/blog/${slug}.png`,
  })
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: 'article', publishedTime: post.publishedAt ?? undefined },
  }
}

/** Blog post (spec §8.11): reading time, author, share links, related posts. */
export default async function PostPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const [post, t] = await Promise.all([getPost(locale, slug), getTranslations('blog')])
  if (!post) notFound()
  const text = plainText(post.body)
  const author = typeof post.author === 'object' ? (post.author as Team | null) : null
  const cover = media(post.cover)
  const url = absoluteUrl(locale, `/blog/${slug}`)
  const related = post.tags?.length
    ? (await getPosts(locale, { tag: post.tags[0], limit: 4 })).docs
        .filter((p) => p.id !== post.id)
        .slice(0, 3)
    : []
  const share = [
    {
      name: 'X',
      href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title ?? '')}`,
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${post.title ?? ''} ${url}`)}`,
    },
  ]

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={post.title ?? ''}
        intro={post.excerpt}
        crumbs={[
          { label: t('title'), href: '/blog' },
          { label: post.title ?? '', href: `/blog/${slug}` },
        ]}
        locale={locale}
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          {author && (
            <span className="inline-flex items-center gap-2">
              <Avatar name={author.name} image={media(author.photo)} size="sm" decorative />
              <span className="font-medium text-fg">{author.name}</span>
            </span>
          )}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>
              {formatDate(locale, post.publishedAt, { dateStyle: 'long' })}
            </time>
          )}
          <span>{t('readingTime', { minutes: readingMinutes(text) })}</span>
        </div>
      </PageHeader>

      <Container size="prose" className="py-12 sm:py-16">
        {cover && (
          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-xl border border-border">
            <ResponsiveImage
              media={cover}
              fill
              priority
              sizes="(min-width: 768px) 48rem, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <RichText data={post.body} locale={locale} />

        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-8">
          {!!post.tags?.length && (
            <ul className="flex flex-wrap gap-2" aria-label={t('tags')}>
              {post.tags.map((tag) => (
                <li key={tag}>
                  <Tag asChild>
                    <Link href={`/blog/tag/${encodeURIComponent(tag)}`}>{tag}</Link>
                  </Tag>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-fg-muted">{t('share')}</span>
            {share.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-10 items-center font-medium text-fg underline-offset-4 hover:underline"
              >
                {s.name}
                <span className="sr-only"> {t('newTab')}</span>
              </a>
            ))}
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="border-t border-border bg-bg-subtle py-16">
          <Container>
            <h2 className="font-display text-2xl font-semibold text-fg">{t('related')}</h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <Card variant="interactive" className="h-full">
                    <CardTitle href={`/blog/${p.slug}`}>{p.title}</CardTitle>
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt ?? undefined,
          url,
          inLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN',
          datePublished: post.publishedAt ?? undefined,
          dateModified: post.updatedAt,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          ...(cover && { image: new URL(cover.url!, SITE_URL).toString() }),
          ...(author && { author: { '@type': 'Person', name: author.name } }),
          publisher: { '@type': 'Organization', name: 'Jainav Infotech' },
        }}
      />
    </main>
  )
}
