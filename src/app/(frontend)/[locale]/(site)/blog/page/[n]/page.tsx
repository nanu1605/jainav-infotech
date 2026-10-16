import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { BlogIndex, blogMetadata } from '@/components/content/BlogIndex'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: string; n: string }> }

/** Page 2 and later; page 1 is /blog itself, so it has one URL. */
const pageNumber = (n: string) => (/^[2-9]\d{0,3}$|^1\d{1,3}$/.test(n) ? Number(n) : null)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, n } = await params
  const page = pageNumber(n)
  return page ? blogMetadata(locale as Locale, { page }) : {}
}

export default async function BlogPageN({ params }: Props) {
  const { locale, n } = await params
  const page = pageNumber(n)
  if (!page) notFound()
  setRequestLocale(locale)
  return <BlogIndex locale={locale as Locale} page={page} />
}
