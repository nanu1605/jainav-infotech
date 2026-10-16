import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; status: string }> }

const STATUSES = ['confirmed', 'invalid', 'unsubscribed'] as const
type Status = (typeof STATUSES)[number]
const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s)

export const generateStaticParams = () => STATUSES.map((status) => ({ status }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, status } = (await params) as { locale: Locale; status: string }
  if (!isStatus(status)) return {}
  const t = await getTranslations({ locale, namespace: 'forms.newsletterStatus' })
  return pageMetadata({
    locale,
    path: `/newsletter/${status}`,
    title: t(`${status}.title`),
    noindex: true,
  })
}

/** Where the newsletter confirm and unsubscribe links land (spec §13). */
export default async function NewsletterStatusPage({ params }: Props) {
  const { locale, status } = (await params) as { locale: Locale; status: string }
  if (!isStatus(status)) notFound()
  setRequestLocale(locale)
  const t = await getTranslations('forms.newsletterStatus')

  return (
    <main id="main" className="scroll-mt-16">
      <Container size="prose" className="py-24 sm:py-32">
        <h1 className="font-display text-4xl font-bold text-balance text-fg sm:text-5xl">
          {t(`${status}.title`)}
        </h1>
        <p className="mt-4 text-lg text-fg-muted">{t(`${status}.text`)}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">{t('home')}</Link>
        </Button>
      </Container>
    </main>
  )
}
