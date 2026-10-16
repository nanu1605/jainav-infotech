import { ArrowRight, LifeBuoy, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { AccountShell } from '@/components/account/AccountShell'
import { OrderStatus } from '@/components/account/OrderStatus'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
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
  return pageMetadata({ locale, path: '/account', title: t('account'), noindex: true })
}

const link = 'font-medium text-fg underline-offset-4 hover:underline'

/** Account overview (spec §11.2): greeting, the latest orders, and where to go next. */
export default async function AccountPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const customer = await requireCustomer(locale, '/account')
  const [orders, t] = await Promise.all([
    customerOrders(await getClient(), customer, [{ status: { in: [...PAID_STATUSES] } }], 3),
    getTranslations('account'),
  ])

  return (
    <AccountShell
      locale={locale}
      active="overview"
      title={t('overview.greeting', { name: customer.name || customer.email })}
      intro={t('overview.signedInAs', { email: customer.email })}
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="recent-orders">
          <h2 id="recent-orders" className="font-display text-2xl font-semibold text-fg">
            {t('overview.recent')}
          </h2>
          {orders.length ? (
            <>
              <ul className="mt-6 grid gap-3">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-lg border border-border bg-surface p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{orderLabel(order)}</p>
                      <p className="mt-1 text-sm text-fg-muted">
                        {t('overview.orderLine', {
                          number: order.orderNumber,
                          date: formatDate(locale, order.paidAt ?? order.createdAt),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-fg tabular-nums">
                        {formatINR(locale, order.total)}
                      </span>
                      <OrderStatus status={order.status} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6">
                <Link href="/account/orders" className={`${link} inline-flex items-center gap-1.5`}>
                  {t('overview.allOrders')}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </p>
            </>
          ) : (
            <EmptyState
              className="mt-6"
              title={t('orders.emptyTitle')}
              description={t('orders.emptyText')}
              action={
                <Button asChild variant="secondary">
                  <Link href="/products">{t('orders.browse')}</Link>
                </Button>
              }
            />
          )}
        </section>
        <div className="grid content-start gap-4">
          <Shortcut icon={<Settings aria-hidden />} title={t('nav.settings')}>
            <p>{t('overview.settingsText')}</p>
            <Link href="/account/settings" className={link}>
              {t('overview.settingsLink')}
            </Link>
          </Shortcut>
          <Shortcut icon={<LifeBuoy aria-hidden />} title={t('overview.helpTitle')}>
            <p>{t('overview.helpText')}</p>
            <Link href="/contact?topic=support" className={link}>
              {t('overview.helpLink')}
            </Link>
          </Shortcut>
        </div>
      </div>
    </AccountShell>
  )
}

function Shortcut({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex gap-4 rounded-lg border border-border bg-surface p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg-muted [&_svg]:size-5">
        {icon}
      </span>
      <div className="grid min-w-0 gap-1.5 text-sm text-fg-muted">
        <h2 className="font-display text-base font-semibold text-fg">{title}</h2>
        {children}
      </div>
    </section>
  )
}
