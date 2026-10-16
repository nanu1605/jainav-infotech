import type { Metadata } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/feedback/Toast'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { routing } from '@/i18n/routing'
import { fontVariables } from '@/styles/fonts'
import '@/styles/globals.css'

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

// CI builds images without a database: render on first request instead (spec §4.3).
export function generateStaticParams() {
  return process.env.SKIP_DB_AT_BUILD === '1' ? [] : routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return { title: t('title'), description: t('description') }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-fg">
        <NextIntlClientProvider>
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
