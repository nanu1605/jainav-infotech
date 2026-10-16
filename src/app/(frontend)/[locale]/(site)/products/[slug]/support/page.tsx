import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { FaqList } from '@/components/blocks/FaqList'
import { ContactForm } from '@/components/forms/lazy'
import { Section } from '@/components/layout/Section'
import { ProductShell } from '@/components/product/ProductShell'
import { SubpageHeader } from '@/components/product/SubpageHeader'
import type { Locale } from '@/i18n/routing'
import { loadProduct, productMetadata, productParams } from '@/lib/product'
import { getFaqs, getProducts } from '@/lib/queries'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () => productParams(true)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const t = await getTranslations({ locale, namespace: 'ui.productSubNav' })
  return productMetadata(await loadProduct(locale, slug, true), locale, {
    path: 'support',
    title: t('support'),
  })
}

/** Support (spec §7): the product's FAQ, then the contact form set to support for it. */
export default async function SupportPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const loaded = await loadProduct(locale, slug, true)
  const { product } = loaded
  const [t, faqs, products] = await Promise.all([
    getTranslations('ui.productPages'),
    getFaqs(locale, { productId: product.id }),
    getProducts(locale),
  ])

  return (
    <ProductShell loaded={loaded} active="support">
      <SubpageHeader loaded={loaded} locale={locale} page="support" />
      <FaqList heading={t('faq')} faqs={faqs} />
      <Section tone="subtle" size="prose" title={t('stillStuck')} intro={t('stillStuckText')}>
        <ContactForm
          products={products.map((p) => ({ slug: p.slug, name: p.name }))}
          topic="support"
          product={slug}
        />
      </Section>
    </ProductShell>
  )
}
