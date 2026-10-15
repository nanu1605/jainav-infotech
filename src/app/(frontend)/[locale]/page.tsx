import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { use } from 'react'

import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

// Phase 0 placeholder: proves tokens, theming, fonts and locale routing end to end.
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  setRequestLocale(locale)
  const t = useTranslations()

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {t('site.skipToContent')}
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <p className="mb-4 inline-flex rounded-full bg-bg-subtle px-3 py-1 text-sm font-medium text-fg-muted">
          {t('home.eyebrow')}
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          {t('home.title')}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-fg-muted">{t('home.subtitle')}</p>
        <div aria-hidden className="mt-12 h-1.5 w-40 rounded-full bg-primary shadow-md" />
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-fg-muted sm:px-6">
          {t('site.legalName')}
        </p>
      </footer>
    </>
  )
}
