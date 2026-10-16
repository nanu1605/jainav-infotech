import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ChangelogList } from '@/components/content/ChangelogList'
import { Container } from '@/components/layout/Container'
import { ProductShell } from '@/components/product/ProductShell'
import { SubpageHeader } from '@/components/product/SubpageHeader'
import type { Locale } from '@/i18n/routing'
import { loadProduct, productMetadata, productParams } from '@/lib/product'
import { getChangelogFeed } from '@/lib/queries'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () => productParams(true)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const t = await getTranslations({ locale, namespace: 'ui.productSubNav' })
  return productMetadata(await loadProduct(locale, slug, true), locale, {
    path: 'changelog',
    title: t('changelog'),
  })
}

/** A hosted product's release notes: changelog entries and published releases. */
export default async function ProductChangelogPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const loaded = await loadProduct(locale, slug, true)
  const [t, items] = await Promise.all([
    getTranslations('ui.productPages'),
    getChangelogFeed(locale, { productId: loaded.product.id }),
  ])

  return (
    <ProductShell loaded={loaded} active="changelog">
      <SubpageHeader loaded={loaded} locale={locale} page="changelog" />
      <Container size="prose" className="py-16 sm:py-24">
        {items.length ? (
          <ChangelogList items={items} locale={locale} />
        ) : (
          <p className="text-lg text-fg-muted">{t('noChanges')}</p>
        )}
      </Container>
    </ProductShell>
  )
}
