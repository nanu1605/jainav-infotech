import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BlogIndex, blogMetadata } from '@/components/content/BlogIndex'
import type { Locale } from '@/i18n/routing'
import { getPostTags } from '@/lib/queries'

type Props = { params: Promise<{ locale: string; tag: string }> }

/** Posts with one tag. ponytail: all on one page; paginate once a tag has 100+ posts. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, tag } = await params
  return blogMetadata(locale as Locale, { tag: decodeURIComponent(tag) })
}

export default async function BlogTagPage({ params }: Props) {
  const { locale, tag: raw } = (await params) as { locale: Locale; tag: string }
  setRequestLocale(locale)
  const tag = decodeURIComponent(raw)
  if (!(await getPostTags(locale)).includes(tag)) notFound()
  return <BlogIndex locale={locale} tag={tag} />
}
