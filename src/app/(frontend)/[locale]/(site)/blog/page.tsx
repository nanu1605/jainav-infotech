import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { BlogIndex, blogMetadata } from '@/components/content/BlogIndex'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogMetadata((await params).locale as Locale, {})
}

export default async function BlogPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  return <BlogIndex locale={locale} />
}
