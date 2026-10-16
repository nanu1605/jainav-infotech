import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { ProductCard } from '@/components/product/ProductCard'
import type { Locale } from '@/i18n/routing'
import { getProducts } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'products' })
  return pageMetadata({ locale, path: '/products', title: t('title'), description: t('intro') })
}

/**
 * Products hub (spec §8.3). Live products first in admin order; retired ones last.
 * ponytail: category/platform filters are specced for more than six products; add them then.
 */
export default async function ProductsPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [products, t] = await Promise.all([getProducts(locale), getTranslations('products')])
  const sorted = [...products].sort(
    (a, b) => Number(a.status === 'retired') - Number(b.status === 'retired'),
  )

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/products' }]}
        locale={locale}
      />
      <Container className="py-16 sm:py-24">
        <Stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <StaggerItem as="li" key={p.slug}>
              <ProductCard product={p} headingLevel="h2" />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </main>
  )
}
