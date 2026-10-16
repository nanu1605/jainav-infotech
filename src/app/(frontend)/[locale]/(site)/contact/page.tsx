import { CalendarClock, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { MapEmbed } from '@/components/content/MapEmbed'
import { PageHeader } from '@/components/content/PageHeader'
import { ContactForm } from '@/components/forms/lazy'
import { Container } from '@/components/layout/Container'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getProducts, getSettings } from '@/lib/queries'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale
  const t = await getTranslations({ locale, namespace: 'contact' })
  return pageMetadata({ locale, path: '/contact', title: t('title'), description: t('intro') })
}

const EMAILS = ['hello', 'sales', 'support', 'careers', 'privacy'] as const

const link = 'font-medium text-fg underline-offset-4 hover:underline'

/**
 * Contact (spec §8.9): the topic-routed form (spec §13), then email, phone, WhatsApp, a booking
 * link, business hours and the address with a map on request.
 */
export default async function ContactPage({ params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [{ company, schedulerUrl }, products, t, tf] = await Promise.all([
    getSettings(locale),
    getProducts(locale, { retired: false }),
    getTranslations('contact'),
    getTranslations('forms.contact'),
  ])
  const emails = EMAILS.flatMap((k) => (company?.emails?.[k] ? [[k, company.emails[k]!]] : []))

  return (
    <main id="main" className="scroll-mt-16">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: t('title'), href: '/contact' }]}
        locale={locale}
      />
      <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
        <section aria-labelledby="contact-form">
          <h2 id="contact-form" className="font-display text-2xl font-semibold text-fg">
            {tf('title')}
          </h2>
          <p className="mt-2 text-fg-muted">
            {tf.rich('planning', {
              link: (chunks) => (
                <Link href="/services#start" className="text-fg underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <div className="mt-8">
            <ContactForm products={products.map(({ slug, name }) => ({ slug, name }))} />
          </div>
        </section>
        <div className="space-y-8">
          {emails.length > 0 && (
            <Channel icon={<Mail aria-hidden />} label={t('email')}>
              <ul className="space-y-1">
                {emails.map(([kind, email]) => (
                  <li key={kind}>
                    <span className="text-fg-muted">{t(`emails.${kind}`)}: </span>
                    <a href={`mailto:${email}`} className={link}>
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            </Channel>
          )}
          {company?.phone && (
            <Channel icon={<Phone aria-hidden />} label={t('phone')}>
              <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`} className={link}>
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
                className={link}
              >
                {t('whatsappCta')}
                <span className="sr-only"> {t('newTab')}</span>
              </a>
            </Channel>
          )}
          {/* A plain link: the scheduler loads nothing until it is opened. */}
          {schedulerUrl && (
            <Channel icon={<CalendarClock aria-hidden />} label={tf('bookCall')}>
              <a href={schedulerUrl} target="_blank" rel="noopener" className={link}>
                {tf('bookCallText')}
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
            <>
              <Channel icon={<MapPin aria-hidden />} label={t('office')}>
                <address className="whitespace-pre-line text-fg not-italic">
                  {company.registeredAddress}
                </address>
              </Channel>
              <MapEmbed address={company.registeredAddress} />
            </>
          )}
        </div>
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
