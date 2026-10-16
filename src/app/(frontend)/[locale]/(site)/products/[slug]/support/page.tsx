import { LifeBuoy, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { FaqList } from '@/components/blocks/FaqList'
import { Section } from '@/components/layout/Section'
import { ProductShell } from '@/components/product/ProductShell'
import { SubpageHeader } from '@/components/product/SubpageHeader'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { loadProduct, productMetadata, productParams } from '@/lib/product'
import { getFaqs } from '@/lib/queries'

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

/** Support (spec §7): the product's FAQ and a way to reach us (the form arrives in Phase 4). */
export default async function SupportPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const loaded = await loadProduct(locale, slug, true)
  const { product, settings } = loaded
  const [t, faqs] = await Promise.all([
    getTranslations('ui.productPages'),
    getFaqs(locale, { productId: product.id }),
  ])
  const email = settings.company?.emails?.support || settings.company?.emails?.hello

  return (
    <ProductShell loaded={loaded} active="support">
      <SubpageHeader loaded={loaded} locale={locale} page="support" />
      <FaqList heading={t('faq')} faqs={faqs} />
      <Section tone="subtle" title={t('stillStuck')} intro={t('stillStuckText')}>
        <div className="flex flex-wrap gap-3">
          {email && (
            <Button asChild size="lg">
              <a href={`mailto:${email}?subject=${encodeURIComponent(product.name)}`}>
                <Mail aria-hidden />
                {email}
              </a>
            </Button>
          )}
          <Button asChild size="lg" variant={email ? 'secondary' : 'primary'}>
            <Link href={`/contact?product=${slug}&topic=support`}>
              <LifeBuoy aria-hidden />
              {t('contactForm')}
            </Link>
          </Button>
        </div>
      </Section>
    </ProductShell>
  )
}
