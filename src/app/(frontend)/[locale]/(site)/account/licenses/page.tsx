import { KeyRound } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AccountShell } from '@/components/account/AccountShell'
import { LicenseBadge } from '@/components/account/LicenseBadge'
import { CopyKey, DeactivateDevice } from '@/components/account/Licenses'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/EmptyState'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { requireCustomer } from '@/lib/account/pages'
import { getClient } from '@/lib/cms'
import { formatDate } from '@/lib/format'
import { customerLicenses } from '@/lib/licensing/account'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'account.nav' })
  return pageMetadata({ locale, path: '/account/licenses', title: t('licenses'), noindex: true })
}

/**
 * Licenses (spec §11.2): each key with its plan, status, update period and active devices, which
 * the customer can deactivate to free a slot (within the monthly limit).
 */
export default async function LicensesPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const customer = await requireCustomer(locale, '/account/licenses')
  const [licenses, t] = await Promise.all([
    customerLicenses(await getClient(), customer.id, locale),
    getTranslations('account'),
  ])

  return (
    <AccountShell
      locale={locale}
      active="licenses"
      title={t('nav.licenses')}
      intro={t('licenses.intro')}
    >
      {licenses.length ? (
        <div className="grid max-w-4xl gap-8">
          {licenses.map((license) => {
            const product = license.product.name
            const devicesId = `devices-${license.id}`
            return (
              <section
                key={license.id}
                aria-labelledby={`license-${license.id}`}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id={`license-${license.id}`}
                    className="font-display text-2xl font-semibold text-fg"
                  >
                    {t('licenses.name', { product, plan: license.plan })}
                  </h2>
                  <LicenseBadge status={license.status} />
                </div>
                {license.status !== 'active' && (
                  <Callout
                    tone={license.status === 'suspended' ? 'warning' : 'danger'}
                    className="mt-4"
                  >
                    {t(`licenses.statusText.${license.status}`)}
                  </Callout>
                )}
                <div className="mt-6">
                  <CopyKey value={license.key} />
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-fg-muted">{t('licenses.updatesUntil')}</dt>
                    <dd className="mt-0.5 font-medium text-fg">
                      {license.updatesUntil
                        ? formatDate(locale, license.updatesUntil, { dateStyle: 'long' })
                        : t('licenses.lifetime')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-muted">{t('licenses.devices')}</dt>
                    <dd className="mt-0.5 font-medium text-fg tabular-nums">
                      {t('licenses.devicesUsed', {
                        count: license.devices.length,
                        max: license.maxActivations,
                      })}
                    </dd>
                  </div>
                </dl>

                <h3
                  id={devicesId}
                  tabIndex={-1}
                  className="mt-8 font-display text-lg font-semibold text-fg"
                >
                  {t('licenses.devicesTitle')}
                </h3>
                {license.devices.length ? (
                  <ul className="mt-4 grid gap-3">
                    {license.devices.map((device) => (
                      <li
                        key={device.id}
                        className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-lg border border-border bg-bg p-4"
                      >
                        <div className="min-w-0 text-sm text-fg-muted">
                          <p className="text-base font-medium break-words text-fg">
                            {device.deviceName}
                          </p>
                          <p className="mt-1">
                            {[
                              device.os,
                              device.appVersion &&
                                t('licenses.appVersion', { version: device.appVersion }),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          {device.lastSeenAt && (
                            <p className="mt-1">
                              {t('licenses.lastSeen', {
                                date: formatDate(locale, device.lastSeenAt, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }),
                              })}
                            </p>
                          )}
                        </div>
                        {/* None left this month: the note below says when they reset. */}
                        {license.deactivationsLeft > 0 && (
                          <DeactivateDevice
                            activationId={device.id}
                            device={device.deviceName}
                            product={product}
                            focusAfter={devicesId}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-fg-muted">
                    {t('licenses.noDevices', { product })}
                  </p>
                )}
                <div className="mt-6 grid gap-1 text-sm text-fg-muted">
                  <p>{t('licenses.help', { product })}</p>
                  <p>
                    {t('licenses.deactivationsLeft', {
                      count: license.deactivationsLeft,
                      date: formatDate(locale, license.resetsAt),
                    })}
                  </p>
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<KeyRound />}
          title={t('licenses.emptyTitle')}
          description={t('licenses.emptyText')}
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
