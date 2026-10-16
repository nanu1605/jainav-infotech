import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/content/PageHeader'
import { RichText } from '@/components/content/RichText'
import { Container } from '@/components/layout/Container'
import { Callout } from '@/components/ui/Callout'
import type { Locale } from '@/i18n/routing'
import { staticParams } from '@/lib/cms'
import { formatDate } from '@/lib/format'
import { getLegalPage, getRoutable } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

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
 * date. In Hindi it says that the English text prevails (spec §6).
 */
export default async function LegalPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const [page, t] = await Promise.all([getLegalPage(locale, slug), getTranslations('legal')])
  if (!page) notFound()

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={page.title ?? ''}
        crumbs={[{ label: page.title ?? '', href: `/legal/${slug}` }]}
        locale={locale}
      >
        <p className="mt-4 text-sm text-fg-muted">
          {t('version', {
            version: page.version,
            date: formatDate(locale, page.effectiveDate, { dateStyle: 'long' }),
          })}
        </p>
      </PageHeader>
      <Container size="prose" className="py-12 sm:py-16">
        {locale !== 'en' && (
          <Callout tone="info" className="mb-10">
            {t('englishPrevails')}
          </Callout>
        )}
        <RichText data={page.body} locale={locale} />
      </Container>
    </main>
  )
}
