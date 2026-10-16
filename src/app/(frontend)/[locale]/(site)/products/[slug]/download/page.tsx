import type { Metadata } from 'next'
import semver from 'semver'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Container } from '@/components/layout/Container'
import { ProductShell } from '@/components/product/ProductShell'
import { ReleaseDetails } from '@/components/product/ReleaseDetails'
import { SubpageHeader } from '@/components/product/SubpageHeader'
import { WaitlistSlot } from '@/components/product/WaitlistSlot'
import { Table } from '@/components/ui/Table'
import type { Locale } from '@/i18n/routing'
import { formatBytes, formatDate } from '@/lib/format'
import { loadProduct, productMetadata, productParams } from '@/lib/product'

type Props = { params: Promise<{ locale: string; slug: string }> }

export const generateStaticParams = () => productParams(true)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const t = await getTranslations({ locale, namespace: 'ui.productSubNav' })
  return productMetadata(await loadProduct(locale, slug, true), locale, {
    path: 'download',
    title: t('download'),
  })
}

/**
 * Downloads (spec §12.5): the latest stable (and beta) build with its facts and notes, how to
 * verify the file, and every earlier version.
 */
export default async function DownloadPage({ params }: Props) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  setRequestLocale(locale)
  const loaded = await loadProduct(locale, slug, true)
  const { product, releases, latest } = loaded
  const t = await getTranslations('ui.release')
  // A beta only while it is newer than stable; older betas stay in the version list.
  const { stable, beta } = latest
  const current = [
    stable,
    beta && (!stable || semver.gt(beta.version, stable.version)) ? beta : null,
  ].filter((r) => r !== null)

  return (
    <ProductShell loaded={loaded} active="download">
      <SubpageHeader loaded={loaded} locale={locale} page="download" />
      {product.status === 'coming-soon' || !current.length ? (
        <WaitlistSlot name={product.name} slug={slug} />
      ) : (
        <Container size="prose" className="space-y-16 py-16 sm:py-24">
          {current.map((release) => (
            <section
              key={release.id}
              aria-labelledby={`release-${release.id}`}
              className="space-y-6"
            >
              <h2 id={`release-${release.id}`} className="sr-only">
                {t('version', { version: release.version })}
                {release.channel === 'beta' && ` (${t('beta')})`}
              </h2>
              <ReleaseDetails
                release={release}
                locale={locale}
                href={`/api/v1/downloads/${slug}/latest?channel=${release.channel}`}
              />
              {release.notes && (
                <div>
                  <h3 className="font-display text-lg font-semibold text-fg">{t('notes')}</h3>
                  <p className="mt-2 whitespace-pre-line text-fg-muted">{release.notes}</p>
                </div>
              )}
            </section>
          ))}

          <section>
            <h2 className="font-display text-2xl font-semibold text-fg">{t('verifyTitle')}</h2>
            <p className="mt-3 text-fg-muted">{t('verifyText')}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4 text-sm text-fg">
              {/* The placeholder is translated; angle brackets would be read as ICU tags. */}
              <code>{`Get-FileHash .\\<${t('verifyFile')}> -Algorithm SHA256`}</code>
            </pre>
          </section>

          {releases.length > 1 && (
            <section>
              <h2 className="sr-only">{t('previous')}</h2>
              <Table caption={t('previous')}>
                <thead>
                  <tr>
                    <th scope="col">{t('versionCol')}</th>
                    <th scope="col">{t('released')}</th>
                    <th scope="col">{t('size')}</th>
                    <th scope="col">
                      <span className="sr-only">{t('download')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r) => (
                    <tr key={r.id}>
                      <th scope="row" className="tabular-nums">
                        {r.version}
                        {r.channel === 'beta' && ` (${t('beta')})`}
                      </th>
                      <td>{formatDate(locale, r.releasedAt)}</td>
                      <td className="tabular-nums">
                        {r.sizeBytes ? formatBytes(locale, r.sizeBytes) : '–'}
                      </td>
                      <td>
                        <a
                          href={`/api/v1/downloads/release/${r.id}`}
                          className="font-medium text-fg underline underline-offset-4 hover:no-underline"
                        >
                          {t('download')}
                          <span className="sr-only"> {r.version}</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </section>
          )}
        </Container>
      )}
    </ProductShell>
  )
}
