import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { SignInForm } from '@/components/account/SignInForm'
import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { safeNext } from '@/lib/account/pages'
import { getCustomer } from '@/lib/account/session'
import { storeOpen } from '@/lib/commerce/store'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'account.signIn' })
  return pageMetadata({ locale, path: '/account/sign-in', title: t('title'), noindex: true })
}

/** Email-code sign-in (spec §11.2). Signed-in visitors go straight on to `?next=`. */
export default async function SignInPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  if (!(await storeOpen())) notFound()
  const next = safeNext((await searchParams).next)
  if (await getCustomer()) return redirect({ href: next, locale })
  const t = await getTranslations('account.signIn')

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/account/sign-in' }]}
        locale={locale}
      />
      <Container size="prose" className="py-12 sm:py-16">
        <div className="max-w-md">
          <SignInForm next={next} />
        </div>
      </Container>
    </main>
  )
}
