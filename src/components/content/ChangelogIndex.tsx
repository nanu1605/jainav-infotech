import { getTranslations } from 'next-intl/server'

import { Container } from '@/components/layout/Container'
import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getChangelogFeed, getProducts } from '@/lib/queries'

import { ChangelogList } from './ChangelogList'
import { PageHeader } from './PageHeader'

/**
 * Company changelog (spec §8.12): every product's entries and releases by month. The product
 * filter is a link per product (/changelog/{product}), so it works without JavaScript.
 */
export async function ChangelogIndex({ locale, product }: { locale: Locale; product?: string }) {
  const [products, t] = await Promise.all([getProducts(locale), getTranslations('changelog')])
  const current = product ? products.find((p) => p.slug === product) : undefined
  const items = await getChangelogFeed(locale, { productId: current?.id })
  const crumbs = [{ label: t('title'), href: '/changelog' }]
  if (current) crumbs.push({ label: current.name, href: `/changelog/${current.slug}` })

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={current ? t('productTitle', { name: current.name }) : t('title')}
        intro={t('intro')}
        crumbs={crumbs}
        locale={locale}
      />
      <Container size="prose" className="py-16 sm:py-24">
        {products.length > 1 && (
          <nav aria-label={t('filter')} className="mb-12 flex flex-wrap gap-2">
            <Tag asChild>
              <Link href="/changelog" aria-current={!current ? 'page' : undefined}>
                {t('all')}
              </Link>
            </Tag>
            {products.map((p) => (
              <Tag asChild key={p.slug}>
                <Link
                  href={`/changelog/${p.slug}`}
                  aria-current={p.slug === current?.slug ? 'page' : undefined}
                >
                  {p.name}
                </Link>
              </Tag>
            ))}
          </nav>
        )}
        {items.length ? (
          <ChangelogList items={items} locale={locale} showProduct={!current} />
        ) : (
          <p className="text-lg text-fg-muted">{t('none')}</p>
        )}
      </Container>
    </main>
  )
}
