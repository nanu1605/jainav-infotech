import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { JobList } from '@/components/content/JobList'
import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getJobs, getSettings } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'careers' })
  return pageMetadata({ locale, path: '/careers', title: t('title'), description: t('intro') })
}

const TYPES = ['full-time', 'part-time', 'internship', 'contract'] as const
const MODES = ['onsite', 'remote', 'hybrid'] as const

/**
 * Careers (spec §8.10): openings with filters; with none, an invitation to introduce yourself.
 * Applications (CV upload) are wired with the other forms in Phase 4; until then, by email.
 */
export default async function CareersPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [jobs, settings, t] = await Promise.all([
    getJobs(locale),
    getSettings(locale),
    getTranslations('careers'),
  ])
  const email = settings.company?.emails?.careers || settings.company?.emails?.hello

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/careers' }]}
        locale={locale}
      />
      <Container className="py-16 sm:py-24">
        <h2 className="mb-8 font-display text-2xl font-semibold text-fg">{t('openings')}</h2>
        {jobs.length ? (
          <JobList
            label={t('filter')}
            allLabel={t('all')}
            filters={[
              ...TYPES.map((value) => ({ key: 'type' as const, value, label: t(`type.${value}`) })),
              ...MODES.map((value) => ({
                key: 'workMode' as const,
                value,
                label: t(`mode.${value}`),
              })),
            ]}
            jobs={jobs.map((j) => ({
              slug: j.slug,
              title: j.title ?? '',
              type: j.type,
              workMode: j.workMode,
              meta: [t(`type.${j.type}`), t(`mode.${j.workMode}`), j.location]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        ) : (
          <p className="text-lg text-fg-muted">{t('none')}</p>
        )}
      </Container>
      <Section tone="subtle" title={t('introduceTitle')} intro={t('introduceText')}>
        <Button asChild size="lg">
          {email ? (
            <a href={`mailto:${email}?subject=${encodeURIComponent(t('introduceSubject'))}`}>
              <Mail aria-hidden />
              {email}
            </a>
          ) : (
            <Link href="/contact?topic=careers">{t('contact')}</Link>
          )}
        </Button>
      </Section>
      <Section title={t('internshipsTitle')} intro={t('internshipsText')} />
    </main>
  )
}
