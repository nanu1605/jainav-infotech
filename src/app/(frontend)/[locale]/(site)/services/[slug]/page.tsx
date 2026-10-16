import { ArrowRight, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageBlocks } from '@/components/blocks/PageBlocks'
import { docs, media } from '@/components/blocks/shared'
import { Icon } from '@/components/content/Icon'
import { JsonLd } from '@/components/content/JsonLd'
import { PageHeader } from '@/components/content/PageHeader'
import { Section } from '@/components/layout/Section'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { ProductCard } from '@/components/product/ProductCard'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Product } from '@/payload-types'
import { staticParams } from '@/lib/cms'
import { getRoutable, getService } from '@/lib/queries'
import { absoluteUrl, pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () =>
  staticParams(async () => (await getRoutable()).services.map((s) => ({ slug: s.slug })))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const service = await getService(locale, slug)
  if (!service) return {}
  return pageMetadata({
    locale,
    path: `/services/${slug}`,
    title: service.title ?? '',
    description: service.summary,
    seo: service.meta,
    hiStatus: service.hiStatus,
  })
}

/** One service pillar (spec §8.7): capabilities, deliverables, our own products as proof. */
export default async function ServicePage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const [service, t] = await Promise.all([getService(locale, slug), getTranslations('services')])
  if (!service) notFound()
  const lists = [
    { title: t('capabilities'), items: service.capabilities },
    { title: t('deliverables'), items: service.deliverables },
  ].filter((l) => l.items?.some((i) => i.text))
  const related = docs<Product>(service.relatedProducts).map((p) => ({ ...p, logo: media(p.logo) }))

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={service.title ?? ''}
        intro={service.summary}
        crumbs={[
          { label: t('title'), href: '/services' },
          { label: service.title ?? '', href: `/services/${slug}` },
        ]}
        locale={locale}
      >
        <div className="mt-8">
          <MagneticButton asChild size="lg">
            <Link href={`/contact?topic=project&service=${slug}`}>
              {t('start')}
              <ArrowRight aria-hidden />
            </Link>
          </MagneticButton>
        </div>
      </PageHeader>

      {lists.length > 0 && (
        <Section>
          <div className="grid gap-12 md:grid-cols-2">
            {lists.map((list) => (
              <div key={list.title}>
                <h2 className="flex items-center gap-3 font-display text-2xl font-semibold text-fg">
                  <Icon name={service.icon} className="text-primary" />
                  {list.title}
                </h2>
                <ul className="mt-6 space-y-3">
                  {list.items!.map(
                    (item) =>
                      item.text && (
                        <li key={item.id ?? item.text} className="flex gap-2.5 text-fg">
                          <Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
                          {item.text}
                        </li>
                      ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section title={t('proof')} intro={t('proofIntro')} tone="subtle">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <PageBlocks blocks={service.layout} locale={locale} />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: service.title,
          description: service.summary,
          url: absoluteUrl(locale, `/services/${slug}`),
          areaServed: 'Worldwide',
          provider: { '@type': 'Organization', name: 'Jainav Infotech' },
        }}
      />
    </main>
  )
}
