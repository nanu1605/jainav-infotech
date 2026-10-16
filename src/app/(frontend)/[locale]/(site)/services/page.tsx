import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ServiceCards } from '@/components/blocks/page/Sections'
import { PageHeader } from '@/components/content/PageHeader'
import { PageView } from '@/components/content/PageView'
import { ProjectForm } from '@/components/forms/lazy'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import type { Locale } from '@/i18n/routing'
import { getPage, getServices } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const [page, t] = await Promise.all([
    getPage(locale, 'services'),
    getTranslations({ locale, namespace: 'services' }),
  ])
  return pageMetadata({
    locale,
    path: '/services',
    title: page?.title || t('title'),
    description: t('intro'),
    seo: page?.meta,
    hiStatus: page ? page.hiStatus : 'ready',
  })
}

/**
 * Services (spec §8.7): the Pages document `services` (hero, pillars, process, engagement
 * models, FAQ). Until it is published, the four pillars from the services collection. Both end
 * with the start-a-project form (#start), where "Start a project" links lead.
 */
export default async function ServicesPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [page, services, t, tf] = await Promise.all([
    getPage(locale, 'services'),
    getServices(locale),
    getTranslations('services'),
    getTranslations('forms.project'),
  ])
  const start = (
    <Section
      id="start"
      size="prose"
      title={tf('title')}
      intro={tf('intro')}
      className="scroll-mt-16"
    >
      <ProjectForm
        services={services.map((s) => ({
          slug: s.slug,
          title: s.title ?? '',
          summary: s.summary,
        }))}
      />
    </Section>
  )

  if (page)
    return (
      <PageView page={page} locale={locale}>
        {start}
      </PageView>
    )

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/services' }]}
        locale={locale}
      />
      <Container className="py-16 sm:py-24">
        <ServiceCards services={services} />
      </Container>
      {start}
    </main>
  )
}
