import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/feedback/Toast'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { routing } from '@/i18n/routing'
import { SITE_URL } from '@/lib/seo'
import { fontVariables } from '@/styles/fonts'
import '@/styles/globals.css'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

/**
 * Namespaces client components read. Everything else stays on the server, so page text isn't
 * shipped twice in every page's payload. A client component using another namespace needs it here.
 */
const CLIENT_MESSAGES = ['site', 'language', 'theme', 'ui', 'contact', 'system'] as const

// CI builds images without a database: render on first request instead (spec §4.3).
export function generateStaticParams() {
  return process.env.SKIP_DB_AT_BUILD === '1' ? [] : routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  // Pages give plain titles ("Contact"); home and SEO-tab titles are absolute.
  return {
    title: { default: t('title'), template: t('titleTemplate') },
    description: t('description'),
    metadataBase: new URL(SITE_URL),
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-fg">
        <NextIntlClientProvider
          messages={Object.fromEntries(CLIENT_MESSAGES.map((key) => [key, messages[key]]))}
        >
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MotionProvider>{children}</MotionProvider>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
