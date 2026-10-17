import { ArrowRight, Download } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AccountShell } from '@/components/account/AccountShell'
import { ReleaseDetails } from '@/components/product/ReleaseDetails'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { latestPerPlatform, platformParts } from '@/lib/account/downloads'
import { requireCustomer } from '@/lib/account/pages'
import { getClient } from '@/lib/cms'
import { getProducts, getReleases } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'account.nav' })
  return pageMetadata({ locale, path: '/account/downloads', title: t('downloads'), noindex: true })
}

const link = 'font-medium text-fg underline-offset-4 hover:underline'

/**
 * Downloads (spec §11.2): for each product the customer holds a license for (any status but
 * revoked), the latest stable build per platform through the counting endpoint, and a link to the
 * product's download page with every version, the checksums and how to verify them.
 */
export default async function DownloadsPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const customer = await requireCustomer(locale, '/account/downloads')
  // Customer data: overrideAccess with an explicit where on the customer (CLAUDE.md).
  const [{ docs: licenses }, products, t, tUi] = await Promise.all([
    (await getClient()).find({
      collection: 'licenses',
      where: {
        and: [{ customer: { equals: customer.id } }, { status: { not_equals: 'revoked' } }],
      },
      select: { product: true },
      depth: 0,
      limit: 100,
      overrideAccess: true,
    }),
    getProducts(locale),
    getTranslations('account'),
    getTranslations('ui'),
  ])
  const licensed = new Set(
    licenses.map((l) => (typeof l.product === 'object' ? l.product.id : l.product)),
  )
  // Published products only (public reads); a coming-soon product has nothing to download yet.
  const owned = await Promise.all(
    products
      .filter((p) => licensed.has(p.id))
      .map(async (product) => ({
        product,
        releases:
          product.status === 'coming-soon'
            ? []
            : latestPerPlatform(await getReleases(locale, product.id)),
      })),
  )
  const platformName = (platform: string) => {
    const { os, arch } = platformParts(platform)
    const name = tUi.has(`platform.${os}`) ? tUi(`platform.${os}`) : os
    return arch ? t('downloads.platform', { os: name, arch }) : name
  }

  return (
    <AccountShell
      locale={locale}
      active="downloads"
      title={t('nav.downloads')}
      intro={t.rich('downloads.intro', {
        // Underlined: inside a sentence, color alone wouldn't mark it as a link.
        licenses: (chunks) => (
          <Link href="/account/licenses" className="text-fg underline underline-offset-4">
            {chunks}
          </Link>
        ),
      })}
    >
      {owned.length ? (
        <div className="grid max-w-3xl gap-16">
          {owned.map(({ product, releases }) => (
            <section
              key={product.id}
              aria-labelledby={`product-${product.id}`}
              className="grid gap-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2
                  id={`product-${product.id}`}
                  className="font-display text-2xl font-semibold text-fg"
                >
                  {product.name}
                </h2>
                <Link
                  href={`/products/${product.slug}/download`}
                  className={`${link} inline-flex items-center gap-1.5 text-sm`}
                >
                  {tUi('release.allDownloads')}
                  <span className="sr-only"> ({product.name})</span>
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
              {releases.length ? (
                releases.map((release) => (
                  <div key={release.id} className="grid gap-2">
                    <h3 className="text-sm font-medium text-fg-muted">
                      {platformName(release.platform)}
                    </h3>
                    <ReleaseDetails release={release} locale={locale} />
                  </div>
                ))
              ) : (
                <p className="text-fg-muted">{t('downloads.noRelease')}</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Download />}
          title={t('downloads.emptyTitle')}
          description={t('downloads.emptyText')}
          action={
            <Button asChild variant="secondary">
              <Link href="/products">{t('orders.browse')}</Link>
            </Button>
          }
        />
      )}
    </AccountShell>
  )
}
