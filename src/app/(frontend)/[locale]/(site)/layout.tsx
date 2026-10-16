import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { LanguageSuggestion } from '@/components/layout/LanguageSuggestion'
import { LivePreviewRefresh } from '@/components/layout/LivePreviewRefresh'
import { Maintenance } from '@/components/layout/Maintenance'
import { PreviewBar } from '@/components/layout/PreviewBar'
import type { Locale } from '@/i18n/routing'
import { isPreview } from '@/lib/cms'
import { getNavigation, getProducts, getSettings } from '@/lib/queries'
import { SITE_URL } from '@/lib/seo'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

/** Header, footer and announcement for every public page (spec §8.1). */
export default async function SiteLayout({ children, params }: Props) {
  const locale = (await params).locale as Locale
  setRequestLocale(locale)
  const [settings, navigation, products, preview, t] = await Promise.all([
    getSettings(locale),
    getNavigation(locale),
    getProducts(locale, { retired: false }),
    isPreview(),
    getTranslations('ui.announcement'),
  ])
  const { company, announcement } = settings
  const showAnnouncement = announcement?.active && announcement.text

  return (
    <>
      {preview && (
        <>
          <PreviewBar />
          <LivePreviewRefresh serverURL={SITE_URL} />
        </>
      )}
      {showAnnouncement && (
        <AnnouncementBar
          id={`${announcement.text}|${announcement.link ?? ''}`}
          text={announcement.text!}
          link={announcement.link ? { label: t('more'), href: announcement.link } : null}
        />
      )}
      <Header
        nav={navigation.header ?? []}
        products={products}
        showAccount={settings.storeEnabled ?? false}
      />
      {/* Staff previewing drafts still see the site while maintenance mode is on. */}
      {settings.maintenanceMode && !preview ? <Maintenance /> : children}
      <Footer
        columns={navigation.footer ?? []}
        socials={settings.socials ?? []}
        legal={{
          legalName: company?.legalName || 'Jainav Infotech Private Limited',
          cin: company?.cin,
          registeredAddress: company?.registeredAddress,
          email: company?.emails?.hello,
          phone: company?.phone,
        }}
      />
      <LanguageSuggestion />
    </>
  )
}
