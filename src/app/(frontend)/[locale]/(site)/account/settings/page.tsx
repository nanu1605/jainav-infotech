import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AccountShell } from '@/components/account/AccountShell'
import { DeleteAccount } from '@/components/account/DeleteAccount'
import { SettingsForm } from '@/components/account/SettingsForm'
import type { Locale } from '@/i18n/routing'
import { requireCustomer } from '@/lib/account/pages'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'account.nav' })
  return pageMetadata({ locale, path: '/account/settings', title: t('settings'), noindex: true })
}

/** Account settings (spec §11.2): profile, billing details, marketing consent, delete account. */
export default async function SettingsPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const customer = await requireCustomer(locale, '/account/settings')
  const t = await getTranslations('account')
  const consent = customer.marketingConsent

  return (
    <AccountShell
      locale={locale}
      active="settings"
      title={t('nav.settings')}
      intro={t('settings.intro', { email: customer.email })}
    >
      <div className="grid max-w-3xl gap-16">
        <section aria-labelledby="profile">
          <h2 id="profile" className="mb-6 font-display text-2xl font-semibold text-fg">
            {t('settings.title')}
          </h2>
          <SettingsForm
            defaults={{
              name: customer.name ?? '',
              phone: customer.phone ?? '',
              preferredLocale: customer.preferredLocale,
              state: customer.state ?? '',
              businessName: customer.businessName ?? '',
              gstin: customer.gstin ?? '',
              marketing: !!consent?.given && !consent.withdrawnAt,
            }}
          />
        </section>
        <DeleteAccount />
      </div>
    </AccountShell>
  )
}
