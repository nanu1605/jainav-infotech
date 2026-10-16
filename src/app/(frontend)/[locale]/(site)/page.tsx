import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { JsonLd } from '@/components/content/JsonLd'
import { PageView } from '@/components/content/PageView'
import { Container } from '@/components/layout/Container'
import type { Locale } from '@/i18n/routing'
import { getPage, getSettings } from '@/lib/queries'
import { absoluteUrl, pageMetadata, SITE_URL } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const [page, t] = await Promise.all([getPage(locale, 'home'), getTranslations('metadata')])
  return pageMetadata({
    locale,
    path: '/',
    title: t('title'),
    description: t('description'),
    // The home title is the site name itself, not "… | Jainav Infotech".
    seo: { ...page?.meta, title: page?.meta?.title || t('title') },
    hiStatus: page?.hiStatus,
  })
}

/** Home (spec §8.2): the Pages document `home`, built from blocks. */
export default async function HomePage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [page, settings, t] = await Promise.all([
    getPage(locale, 'home'),
    getSettings(locale),
    getTranslations('home'),
  ])
  const company = settings.company

  return (
    <>
      {page ? (
        <PageView page={page} locale={locale} />
      ) : (
        // Before the home page is published: the site still has a heading and a way in.
        <main id="main" className="scroll-mt-16">
          <Container className="py-24 sm:py-32">
            <h1 className="max-w-3xl font-display text-4xl font-bold text-balance sm:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-fg-muted">{t('subtitle')}</p>
          </Container>
        </main>
      )}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': `${SITE_URL}/#organization`,
              name: company?.legalName || 'Jainav Infotech Private Limited',
              alternateName: 'Jainav Infotech',
              url: absoluteUrl('en', '/'),
              ...(company?.phone && { telephone: company.phone }),
              ...(company?.emails?.hello && { email: company.emails.hello }),
              ...(company?.registeredAddress && {
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: company.registeredAddress,
                  addressCountry: 'IN',
                },
              }),
              sameAs: settings.socials?.map((s) => s.url) ?? [],
            },
            {
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#website`,
              url: absoluteUrl('en', '/'),
              name: 'Jainav Infotech',
              inLanguage: ['en-IN', 'hi-IN'],
              publisher: { '@id': `${SITE_URL}/#organization` },
            },
          ],
        }}
      />
    </>
  )
}
