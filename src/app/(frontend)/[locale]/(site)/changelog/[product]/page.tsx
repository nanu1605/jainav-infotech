import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ChangelogIndex } from '@/components/content/ChangelogIndex'
import type { Locale } from '@/i18n/routing'
import { productParams } from '@/lib/product'
import { getProducts } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; product: string }> }

export const generateStaticParams = async () =>
  (await productParams()).map(({ slug }) => ({ product: slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, product } = (await params) as { locale: Locale; product: string }
  const [products, t] = await Promise.all([
    getProducts(locale),
    getTranslations({ locale, namespace: 'changelog' }),
  ])
  const current = products.find((p) => p.slug === product)
  if (!current) return {}
  return pageMetadata({
    locale,
    path: `/changelog/${product}`,
    title: t('productTitle', { name: current.name }),
    description: t('intro'),
  })
}

/** The company changelog filtered to one product. */
export default async function ProductChangelogFilterPage({ params }: Props) {
  const { locale, product } = (await params) as { locale: Locale; product: string }
  setRequestLocale(locale)
  if (!(await getProducts(locale)).some((p) => p.slug === product)) notFound()
  return <ChangelogIndex locale={locale} product={product} />
}
