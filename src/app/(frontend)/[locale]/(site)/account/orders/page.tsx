import { FileDown, Receipt } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AccountShell } from '@/components/account/AccountShell'
import { OrderStatus } from '@/components/account/OrderStatus'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table } from '@/components/ui/Table'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { orderLabel, PAID_STATUSES, requireCustomer } from '@/lib/account/pages'
import { getClient } from '@/lib/cms'
import { customerOrders } from '@/lib/commerce/store'
import { formatDate, formatINR } from '@/lib/format'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'account.nav' })
  return pageMetadata({ locale, path: '/account/orders', title: t('orders'), noindex: true })
}

/** Orders & invoices (spec §11.2): every paid order, newest first, with its invoice PDF. */
export default async function OrdersPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const customer = await requireCustomer(locale, '/account/orders')
  // ponytail: the latest 50 only (customerOrders' default); add paging if anyone buys more.
  const [orders, t] = await Promise.all([
    customerOrders(await getClient(), customer, [{ status: { in: [...PAID_STATUSES] } }]),
    getTranslations('account'),
  ])

  return (
    <AccountShell locale={locale} active="orders" title={t('nav.orders')} intro={t('orders.intro')}>
      {orders.length ? (
        <Table caption={t('orders.caption')}>
          <thead>
            <tr>
              <th scope="col">{t('orders.number')}</th>
              <th scope="col">{t('orders.date')}</th>
              <th scope="col">{t('orders.product')}</th>
              <th scope="col">{t('orders.total')}</th>
              <th scope="col">{t('orders.status')}</th>
              <th scope="col">{t('orders.invoice')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const invoice = typeof order.invoice === 'object' ? order.invoice : null
              return (
                <tr key={order.id}>
                  <th scope="row" className="font-mono whitespace-nowrap">
                    {order.orderNumber}
                  </th>
                  <td className="whitespace-nowrap">
                    {formatDate(locale, order.paidAt ?? order.createdAt)}
                  </td>
                  <td className="text-fg">{orderLabel(order)}</td>
                  <td className="whitespace-nowrap text-fg tabular-nums">
                    {formatINR(locale, order.total)}
                  </td>
                  <td>
                    <OrderStatus status={order.status} />
                  </td>
                  <td className="whitespace-nowrap">
                    {invoice ? (
                      // A plain link: the browser downloads or opens the PDF itself.
                      <a
                        href={`/api/v1/account/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-1.5 font-medium text-fg underline-offset-4 hover:underline"
                      >
                        <FileDown aria-hidden className="size-4" />
                        {t('orders.invoiceLink', { number: invoice.number })}
                      </a>
                    ) : (
                      t('orders.noInvoice')
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<Receipt />}
          title={t('orders.emptyTitle')}
          description={t('orders.emptyText')}
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
