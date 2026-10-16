import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/content/PageHeader'
import { RichText } from '@/components/content/RichText'
import { DataRequestForm } from '@/components/forms/lazy'
import { Container } from '@/components/layout/Container'
import { Callout } from '@/components/ui/Callout'
import type { Locale } from '@/i18n/routing'
import { staticParams } from '@/lib/cms'
import { formatDate } from '@/lib/format'
import { getLegalPage, getRoutable } from '@/lib/queries'
import { redirectOrNotFound } from '@/lib/redirects'
import { fallbackLang, pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () =>
  staticParams(async () => (await getRoutable()).legal.map((l) => ({ slug: l.slug })))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const page = await getLegalPage(locale, slug)
  if (!page) return {}
  return pageMetadata({
    locale,
    path: `/legal/${slug}`,
    title: page.title ?? '',
    hiStatus: page.hiStatus,
  })
}

/**
 * Legal page (spec §8.13): only the Owner-published version shows, with its version and effective
 * date. In Hindi it says that the English text prevails (spec §6). Privacy requests end with the
 * data request form (spec §16).
 */
export default async function LegalPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const [page, t, tf] = await Promise.all([
    getLegalPage(locale, slug),
    getTranslations('legal'),
    getTranslations('forms.dataRequest'),
  ])
  if (!page) return redirectOrNotFound(locale, `/legal/${slug}`)

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={page.title ?? ''}
        crumbs={[{ label: page.title ?? '', href: `/legal/${slug}` }]}
        locale={locale}
        lang={fallbackLang(locale, page.hiStatus)}
      >
        <p className="mt-4 text-sm text-fg-muted">
          {t('version', {
            version: page.version,
            date: formatDate(locale, page.effectiveDate, { dateStyle: 'long' }),
          })}
        </p>
      </PageHeader>
      <Container size="prose" className="py-12 sm:py-16">
        {/* A Hindi translation says English prevails; an untranslated page just says so. */}
        {locale !== 'en' && (
          <Callout tone="info" className="mb-10">
            {page.hiStatus === 'missing' ? t('englishOnly') : t('englishPrevails')}
          </Callout>
        )}
        <RichText data={page.body} locale={locale} lang={fallbackLang(locale, page.hiStatus)} />
        {slug === 'privacy-requests' && (
          <section
            aria-labelledby="data-request"
            className="mt-12 rounded-xl border border-border bg-surface p-6 shadow-sm"
          >
            <h2 id="data-request" className="font-display text-xl font-semibold text-fg">
              {tf('title')}
            </h2>
            <p className="mt-2 text-fg-muted">{tf('intro')}</p>
            <div className="mt-6">
              <DataRequestForm />
            </div>
          </section>
        )}
      </Container>
    </main>
  )
}
