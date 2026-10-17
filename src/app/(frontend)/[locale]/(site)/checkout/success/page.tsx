import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CopyKey } from '@/components/account/Licenses'
import { OrderPoller } from '@/components/checkout/OrderPoller'
import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Link, redirect } from '@/i18n/navigation'
import { ClientMessages } from '@/i18n/clientMessages'
import type { Locale } from '@/i18n/routing'
import { getCustomer } from '@/lib/account/session'
import { getClient } from '@/lib/cms'
import { errorCode } from '@/lib/commerce/http'
import { customerOrder, storeOpen } from '@/lib/commerce/store'
import { formatINR } from '@/lib/format'
import { licenseKeyOf } from '@/lib/licensing/deliver'
import { pageMetadata } from '@/lib/seo'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ order?: string | string[] }>
}

// Reads the session cookie and the order's live status.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'checkout.success' })
  return pageMetadata({ locale, path: '/checkout/success', title: t('title'), noindex: true })
}

/**
 * After Razorpay Checkout (spec §11.3 step 11). Only the order's owner sees it: customerOrder()
 * finds the order among the signed-in customer's own, so anyone else gets a 404.
 */
export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const { order: param } = await searchParams
  const number = typeof param === 'string' ? param : ''
  const payload = await getClient()
  if (!number || !(await storeOpen(payload))) notFound()
  const customer = await getCustomer()
  if (!customer) {
    return redirect({
      href: { pathname: '/account/sign-in', query: { next: `/checkout/success?order=${number}` } },
      locale,
    })
  }
  const order = await customerOrder(payload, customer, number, locale)
  if (!order) notFound()

  const t = await getTranslations('checkout.success')
  const item = order.items[0]
  const product = item && typeof item.product === 'object' ? item.product : null
  const invoice = typeof order.invoice === 'object' ? order.invoice : null
  const view =
    order.status === 'paid'
      ? 'paid'
      : order.status === 'created'
        ? 'pending'
        : order.status === 'expired'
          ? 'expired'
          : 'other'
  // The key the order created (spec §11.3 step 11), scoped to this customer's own license.
  let licenseKey: string | undefined
  if (view === 'paid') {
    // Reading decrypts the key: if that fails, the page still shows the order without it.
    try {
      const { docs } = await payload.find({
        collection: 'licenses',
        where: { and: [{ order: { equals: order.id } }, { customer: { equals: customer.id } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      licenseKey = docs[0] && licenseKeyOf(docs[0])
    } catch (error) {
      console.error('checkout/success: license key unavailable:', errorCode(error))
    }
  }

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t(`${view}.title`, { number: order.orderNumber })}
        intro={t(`${view}.intro`)}
        crumbs={[{ label: t('title'), href: `/checkout/success?order=${order.orderNumber}` }]}
        locale={locale}
      />
      <Container size="prose" className="grid gap-8 py-12 sm:py-16">
        {view === 'pending' && <OrderPoller order={order.orderNumber} />}
        <dl className="grid gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm sm:grid-cols-2">
          <div>
            <dt className="text-sm text-fg-muted">{t('order')}</dt>
            <dd className="mt-1 font-semibold text-fg">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-sm text-fg-muted">{t('total')}</dt>
            <dd className="mt-1 font-semibold text-fg tabular-nums">
              {formatINR(locale, order.total)}
            </dd>
          </div>
        </dl>
        {view === 'paid' && (
          <div className="grid gap-3 text-fg">
            <p>{t('receipt', { email: order.billing.email })}</p>
            {/* Fulfilment writes the invoice with the payment; the PDF is drawn on request. */}
            {invoice && (
              <p>
                <a
                  href={`/api/v1/account/invoices/${invoice.id}`}
                  className="font-medium text-fg underline underline-offset-4"
                >
                  {t('invoice', { number: invoice.number })}
                </a>
              </p>
            )}
          </div>
        )}
        {licenseKey && (
          <section
            aria-labelledby="license-key"
            className="grid gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
          >
            <h2 id="license-key" className="font-display text-xl font-semibold text-fg">
              {t('license.title')}
            </h2>
            <p className="text-fg-muted">{t('license.text', { product: product?.name ?? '' })}</p>
            <ClientMessages extra={['checkout', 'account']}>
              <CopyKey value={licenseKey} />
            </ClientMessages>
            <p>
              <Link
                href="/account/licenses"
                className="font-medium text-fg underline underline-offset-4"
              >
                {t('license.manage')}
              </Link>
            </p>
          </section>
        )}
        <div className="flex flex-wrap gap-3">
          {view === 'paid' && product && (
            <Button asChild size="lg">
              <Link href={`/products/${product.slug}/download`}>
                {t('download', { product: product.name })}
              </Link>
            </Button>
          )}
          {view === 'expired' && (
            <Button asChild size="lg">
              <Link href={{ pathname: '/checkout/failed', query: { order: order.orderNumber } }}>
                {t('expired.next')}
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="lg"
            variant={view === 'paid' || view === 'expired' ? 'secondary' : 'primary'}
          >
            <Link href="/account/orders">{t('orders')}</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}
