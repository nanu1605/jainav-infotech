import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { ProductBlocks } from '@/components/blocks/ProductBlocks'
import { JsonLd } from '@/components/content/JsonLd'
import { ProductShell } from '@/components/product/ProductShell'
import { WaitlistSlot } from '@/components/product/WaitlistSlot'
import type { Locale } from '@/i18n/routing'
import { loadProduct, productMetadata, productParams } from '@/lib/product'
import { absoluteUrl, fallbackLang } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () => productParams()

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  return productMetadata(await loadProduct(locale, slug), locale)
}

const CATEGORY = { desktop: 'UtilitiesApplication', mobile: 'UtilitiesApplication' } as const

/** Product page (spec §8.4): showcase (external) or overview (hosted), built from blocks. */
export default async function ProductPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const loaded = await loadProduct(locale, slug)
  const { product, plans, buttons, settings } = loaded

  return (
    <ProductShell loaded={loaded} active="overview">
      {/* Untranslated product: its CMS content is the English fallback (buttons stay Hindi). */}
      <div lang={fallbackLang(locale, product.hiStatus)}>
        <ProductBlocks loaded={loaded} locale={locale} />
      </div>
      {buttons.some((b) => b.kind === 'waitlist') && (
        <WaitlistSlot
          name={product.name}
          slug={product.slug}
          email={settings.company?.emails?.hello}
        />
      )}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: product.name,
          description: product.summary ?? product.tagline,
          url: absoluteUrl(locale, `/products/${product.slug}`),
          applicationCategory:
            CATEGORY[product.type as keyof typeof CATEGORY] ?? 'BusinessApplication',
          operatingSystem: product.platforms?.join(', '),
          ...(plans.length > 0 && {
            offers: plans.map((p) => ({
              '@type': 'Offer',
              name: p.name,
              price: ((p.priceINR ?? 0) / 100).toFixed(2),
              priceCurrency: 'INR',
            })),
          }),
          publisher: { '@type': 'Organization', name: 'Jainav Infotech' },
        }}
      />
    </ProductShell>
  )
}
