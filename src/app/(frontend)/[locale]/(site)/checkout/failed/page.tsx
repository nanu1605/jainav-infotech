import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getCustomer } from '@/lib/account/session'
import { getClient } from '@/lib/cms'
import { customerOrder, storeOpen } from '@/lib/commerce/store'
import { pageMetadata } from '@/lib/seo'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ order?: string | string[] }>
}

// Reads the session cookie: "Try again" returns to the order's plan for its owner.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'checkout.failed' })
  return pageMetadata({ locale, path: '/checkout/failed', title: t('title'), noindex: true })
}

/** A payment that didn't complete (spec §11.3 step 11): reassurance and a retry. */
export default async function CheckoutFailedPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const { order: param } = await searchParams
  const payload = await getClient()
  if (!(await storeOpen(payload))) notFound()
  const [customer, t] = await Promise.all([getCustomer(), getTranslations('checkout.failed')])
  const order =
    customer && typeof param === 'string' && param
      ? await customerOrder(payload, customer, param, locale)
      : null
  const item = order?.items[0]
  const retry =
    item && typeof item.product === 'object' && typeof item.plan === 'object'
      ? `/checkout/${item.product.slug}/${item.plan.code}`
      : '/products'

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/checkout/failed' }]}
        locale={locale}
      />
      <Container size="prose" className="grid gap-8 py-12 sm:py-16">
        <div className="grid gap-3 text-lg text-fg">
          {order && <p className="text-fg-muted">{t('order', { number: order.orderNumber })}</p>}
          <p>{t('noCharge')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={retry}>{t('retry')}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href={{ pathname: '/contact', query: { topic: 'support' } }}>{t('support')}</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
