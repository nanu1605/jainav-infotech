import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { MapEmbed } from '@/components/content/MapEmbed'
import { PageHeader } from '@/components/content/PageHeader'
import { Container } from '@/components/layout/Container'
import type { Locale } from '@/i18n/routing'
import { getSettings } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'contact' })
  return pageMetadata({ locale, path: '/contact', title: t('title'), description: t('intro') })
}

const EMAILS = ['hello', 'sales', 'support', 'careers', 'privacy'] as const

/**
 * Contact (spec §8.9): email, phone, WhatsApp, address with a map on request, business hours.
 * The topic-routed contact form is wired in Phase 4 (spec §13); it goes in the first column.
 */
export default async function ContactPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [{ company }, t] = await Promise.all([getSettings(locale), getTranslations('contact')])
  const emails = EMAILS.flatMap((k) => (company?.emails?.[k] ? [[k, company.emails[k]!]] : []))

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/contact' }]}
        locale={locale}
      />
      <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-2">
        <div className="space-y-8">
          {emails.length > 0 && (
            <Channel icon={<Mail aria-hidden />} label={t('email')}>
              <ul className="space-y-1">
                {emails.map(([kind, email]) => (
                  <li key={kind}>
                    <span className="text-fg-muted">{t(`emails.${kind}`)}: </span>
                    <a
                      href={`mailto:${email}`}
                      className="font-medium text-fg underline-offset-4 hover:underline"
                    >
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            </Channel>
          )}
          {company?.phone && (
            <Channel icon={<Phone aria-hidden />} label={t('phone')}>
              <a
                href={`tel:${company.phone.replace(/[^\d+]/g, '')}`}
                className="font-medium text-fg underline-offset-4 hover:underline"
              >
                {company.phone}
              </a>
            </Channel>
          )}
          {company?.whatsapp && (
            <Channel icon={<MessageCircle aria-hidden />} label={t('whatsapp')}>
              <a
                href={`https://wa.me/${company.whatsapp}?text=${encodeURIComponent(t('whatsappMessage'))}`}
                target="_blank"
                rel="noopener"
                className="font-medium text-fg underline-offset-4 hover:underline"
              >
                {t('whatsappCta')}
                <span className="sr-only"> {t('newTab')}</span>
              </a>
            </Channel>
          )}
          {company?.businessHours && (
            <Channel icon={<Clock aria-hidden />} label={t('hours')}>
              <p className="whitespace-pre-line text-fg">{company.businessHours}</p>
            </Channel>
          )}
          {company?.registeredAddress && (
            <Channel icon={<MapPin aria-hidden />} label={t('office')}>
              <address className="whitespace-pre-line text-fg not-italic">
                {company.registeredAddress}
              </address>
            </Channel>
          )}
        </div>
        {company?.registeredAddress && <MapEmbed address={company.registeredAddress} />}
      </Container>
    </main>
  )
}

function Channel({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-fg-muted [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 pt-1.5">
        <h2 className="text-sm font-semibold text-fg">{label}</h2>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}
