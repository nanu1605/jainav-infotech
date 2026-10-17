import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { PageHeader, type Crumb } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

import { SignOutButton } from './SignOutButton'

const PAGES = [
  { key: 'overview', href: '/account' },
  { key: 'orders', href: '/account/orders' },
  { key: 'licenses', href: '/account/licenses' },
  { key: 'downloads', href: '/account/downloads' },
  { key: 'settings', href: '/account/settings' },
] as const

export type AccountPage = (typeof PAGES)[number]['key']

/** Heading, sub-navigation and Sign out around every signed-in account page (spec §11.2). */
export function AccountShell({
  locale,
  active,
  title,
  intro,
  children,
}: {
  locale: Locale
  active: AccountPage
  title: string
  intro?: ReactNode
  children: ReactNode
}) {
  const t = useTranslations('account.nav')
  const crumbs: Crumb[] = [{ label: t('account'), href: '/account' }]
  if (active !== 'overview') crumbs.push({ label: t(active), href: `/account/${active}` })

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader title={title} intro={intro} crumbs={crumbs} locale={locale}>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <nav aria-label={t('label')} className="min-w-0">
            <ul className="-m-1 flex gap-1 overflow-x-auto p-1">
              {PAGES.map(({ key, href }) => (
                <li key={key} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={key === active ? 'page' : undefined}
                    className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-fg-muted transition-colors duration-(--duration-fast) hover:bg-hover hover:text-fg aria-[current=page]:bg-surface aria-[current=page]:text-fg aria-[current=page]:shadow-sm"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <SignOutButton />
        </div>
      </PageHeader>
      <Container className="py-12 sm:py-16">{children}</Container>
    </main>
  )
}
