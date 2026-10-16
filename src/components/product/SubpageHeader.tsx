import { useTranslations } from 'next-intl'

import { PageHeader, type Crumb } from '@/components/content/PageHeader'
import type { Locale } from '@/i18n/routing'
import type { LoadedProduct } from '@/lib/product'
import type { hostedProductSubpaths } from '@/lib/routes'

/** Title and breadcrumbs (Products › VYRO › Pricing) of a hosted product's sub-page. */
export function SubpageHeader({
  loaded: { product },
  locale,
  page,
  doc,
}: {
  loaded: LoadedProduct
  locale: Locale
  page: (typeof hostedProductSubpaths)[number]
  /** A docs page: its title becomes the h1 and the last crumb. */
  doc?: Crumb
}) {
  const t = useTranslations('ui')
  const base = `/products/${product.slug}`
  return (
    <PageHeader
      title={doc?.label ?? t(`productPages.${page}Title`, { name: product.name })}
      crumbs={[
        { label: t('header.allProducts'), href: '/products' },
        { label: product.name, href: base },
        { label: t(`productSubNav.${page}`), href: `${base}/${page}` },
        ...(doc ? [doc] : []),
      ]}
      locale={locale}
    />
  )
}
