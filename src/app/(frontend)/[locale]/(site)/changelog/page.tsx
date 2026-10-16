import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ChangelogIndex } from '@/components/content/ChangelogIndex'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'changelog' })
  return pageMetadata({ locale, path: '/changelog', title: t('title'), description: t('intro') })
}

export default async function ChangelogPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  return <ChangelogIndex locale={locale} />
}
