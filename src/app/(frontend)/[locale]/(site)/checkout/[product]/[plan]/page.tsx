import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { Callout } from '@/components/ui/Callout'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getCustomer } from '@/lib/account/session'
import { getClient } from '@/lib/cms'
import { quote } from '@/lib/commerce/pricing'
import type { QuoteView } from '@/lib/commerce/schemas'
import {
  checkoutPagesPublished,
  findPurchasable,
  getCommerceSettings,
  storeOpen,
  taxSettings,
} from '@/lib/commerce/store'
import { formatINR } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; product: string; plan: string }> }

// Reads the session cookie and live prices.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, product, plan } = (await params) as {
    locale: Locale
    product: string
    plan: string
  }
  const t = await getTranslations({ locale, namespace: 'checkout' })
  return pageMetadata({
    locale,
    path: `/checkout/${product}/${plan}`,
    title: t('title'),
    noindex: true,
  })
}

/** Checkout for one plan (spec §11.3 step 2): quantity is fixed at 1. */
export default async function CheckoutPage({ params }: Props) {
  const { locale, ...slugs } = (await params) as { locale: Locale; product: string; plan: string }
  setRequestLocale(locale)
  const payload = await getClient()
  if (!(await storeOpen(payload))) notFound()
  const item = await findPurchasable(payload, slugs.product, slugs.plan, locale)
  if (!item) notFound()
  const { product, plan } = item
  const path = `/checkout/${product.slug}/${plan.code}`
  const t = await getTranslations('checkout')
  const crumbs = [
    { label: product.name, href: `/products/${product.slug}` },
    { label: t('title'), href: path },
  ]
  // Nothing to sign in for: the create endpoint refuses these orders too.
  if (!(await checkoutPagesPublished(payload, product.slug))) {
    return (
      <main id="main" className="scroll-mt-16">
        <PageHeader title={t('title')} crumbs={crumbs} locale={locale} />
        <Container className="py-12 sm:py-16">
          <Callout tone="warning">{t('problems.unavailable')}</Callout>
        </Container>
      </main>
    )
  }
  const customer = await getCustomer()
  if (!customer)
    return redirect({ href: { pathname: '/account/sign-in', query: { next: path } }, locale })

  const settings = await getCommerceSettings(payload)
  const price = plan.priceINR ?? 0
  const quoteState = customer.state || settings.homeStateCode
  const { subtotal, discount, tax, total } = quote(price, null, quoteState, taxSettings(settings))
  const initial: QuoteView = {
    subtotal,
    discount,
    taxable: tax.taxable,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    total,
    mode: tax.mode,
    ratePercent: tax.ratePercent,
    coupon: null,
  }
  const names = { product: product.name, plan: plan.name || plan.code }

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader title={t('title')} intro={t('intro', names)} crumbs={crumbs} locale={locale} />
      <Container className="py-12 sm:py-16">
        <CheckoutForm
          product={{ slug: product.slug, name: product.name }}
          plan={{ code: plan.code }}
          email={customer.email}
          billing={{
            name: customer.name ?? '',
            phone: customer.phone ?? '',
            state: customer.state ?? '',
            businessName: customer.businessName ?? '',
            gstin: customer.gstin ?? '',
          }}
          quote={initial}
          quoteState={quoteState}
          summary={
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-fg">{t('summary.item', names)}</p>
                {plan.description && (
                  <p className="mt-1 text-sm text-fg-muted">{plan.description}</p>
                )}
                <p className="mt-1 text-sm text-fg-muted">{t('summary.quantity')}</p>
              </div>
              <p className="shrink-0 text-end">
                <span className="font-semibold text-fg tabular-nums">
                  {formatINR(locale, price)}
                </span>
                {settings.gstEnabled && (
                  <span className="block text-sm text-fg-muted">
                    {settings.pricesIncludeGst === false
                      ? t('summary.plusGst')
                      : t('summary.inclGst')}
                  </span>
                )}
              </p>
            </div>
          }
        />
      </Container>
    </main>
  )
}
