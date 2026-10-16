import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { JsonLd } from '@/components/content/JsonLd'
import { PageHeader } from '@/components/content/PageHeader'
import { RichText } from '@/components/content/RichText'
import { CareersForm } from '@/components/forms/lazy'
import { Container } from '@/components/layout/Container'
import type { Locale } from '@/i18n/routing'
import { staticParams } from '@/lib/cms'
import { formatDate, plainText } from '@/lib/format'
import { getJob, getRoutable, getSettings } from '@/lib/queries'
import { redirectOrNotFound } from '@/lib/redirects'
import { absoluteUrl, fallbackLang, pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () =>
  staticParams(async () => (await getRoutable()).jobs.map((j) => ({ slug: j.slug })))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const job = await getJob(locale, slug)
  if (!job) return {}
  return pageMetadata({
    locale,
    path: `/careers/${slug}`,
    title: job.title ?? '',
    description: plainText(job.description).slice(0, 160),
    hiStatus: job.hiStatus,
  })
}

const EMPLOYMENT = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  internship: 'INTERN',
  contract: 'CONTRACTOR',
} as const

/** A job opening with JobPosting structured data (spec §8.10, §15). */
export default async function JobPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const [job, settings, t, tf] = await Promise.all([
    getJob(locale, slug),
    getSettings(locale),
    getTranslations('careers'),
    getTranslations('forms.careers'),
  ])
  if (!job) return redirectOrNotFound(locale, `/careers/${slug}`)
  const posted = job.postedAt ?? job.createdAt
  const lang = fallbackLang(locale, job.hiStatus)
  const meta = [t(`type.${job.type}`), t(`mode.${job.workMode}`), job.location].filter(Boolean)

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={job.title ?? ''}
        intro={meta.join(' · ')}
        crumbs={[
          { label: t('title'), href: '/careers' },
          { label: job.title ?? '', href: `/careers/${slug}` },
        ]}
        locale={locale}
      >
        <p className="mt-2 text-sm text-fg-muted">
          {t('posted', { date: formatDate(locale, posted, { dateStyle: 'long' }) })}
        </p>
      </PageHeader>
      <Container size="prose" className="py-16 sm:py-24">
        <RichText data={job.description} locale={locale} lang={lang} />
        <section
          aria-labelledby="apply"
          className="mt-12 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <h2 id="apply" className="font-display text-xl font-semibold text-fg">
            {tf('applyTitle')}
          </h2>
          <p className="mt-2 text-fg-muted">{t('applyText')}</p>
          <div className="mt-6">
            <CareersForm job={{ slug }} />
          </div>
        </section>
      </Container>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: plainText(job.description) || job.title,
          datePosted: posted,
          employmentType: EMPLOYMENT[job.type],
          url: absoluteUrl(locale, `/careers/${slug}`),
          hiringOrganization: {
            '@type': 'Organization',
            name: settings.company?.legalName || 'Jainav Infotech Private Limited',
            sameAs: absoluteUrl('en', '/'),
          },
          ...(job.workMode === 'remote'
            ? {
                jobLocationType: 'TELECOMMUTE',
                applicantLocationRequirements: { '@type': 'Country', name: 'India' },
              }
            : {
                jobLocation: {
                  '@type': 'Place',
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: job.location || 'Indore',
                    addressRegion: 'Madhya Pradesh',
                    addressCountry: 'IN',
                  },
                },
              }),
        }}
      />
    </main>
  )
}
