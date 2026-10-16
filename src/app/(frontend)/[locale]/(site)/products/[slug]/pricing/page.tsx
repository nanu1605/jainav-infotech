import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { FaqList } from '@/components/blocks/FaqList'
import { Comparison } from '@/components/blocks/product/Sections'
import { Container } from '@/components/layout/Container'
import { PricingTable, planTiers } from '@/components/product/PricingTable'
import { ProductShell } from '@/components/product/ProductShell'
import { SubpageHeader } from '@/components/product/SubpageHeader'
import type { Locale } from '@/i18n/routing'
import { loadProduct, productMetadata, productParams } from '@/lib/product'
import { getFaqs } from '@/lib/queries'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () => productParams(true)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const t = await getTranslations({ locale, namespace: 'ui.productSubNav' })
  return productMetadata(await loadProduct(locale, slug, true), locale, {
    path: 'pricing',
    title: t('pricing'),
  })
}

/** Hosted product pricing (spec §11.1): display only until the store opens in Phase 7. */
export default async function PricingPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const loaded = await loadProduct(locale, slug, true)
  const [t, tiers, faqs] = await Promise.all([
    getTranslations('ui.productPages'),
    planTiers(loaded, locale),
    getFaqs(locale, {
      productId: loaded.product.id,
      categories: ['pricing', 'licensing', 'devices', 'refunds', 'updates'],
    }),
  ])

  return (
    <ProductShell loaded={loaded} active="pricing">
      <SubpageHeader loaded={loaded} locale={locale} page="pricing" />
      <Container className="py-16 sm:py-24">
        {tiers.length ? (
          <PricingTable tiers={tiers} level={2} />
        ) : (
          <p className="text-lg text-fg-muted">{t('noPlans')}</p>
        )}
      </Container>
      {/* The Free vs Pro comparison (spec §11.1) is the product's own Comparison block. */}
      {(loaded.product.layout ?? []).map((block) =>
        block.blockType === 'comparison' ? (
          <Comparison
            key={block.id ?? 'comparison'}
            block={block}
            locale={locale}
            loaded={loaded}
          />
        ) : null,
      )}
      <FaqList heading={t('pricingFaq')} faqs={faqs} />
    </ProductShell>
  )
}
