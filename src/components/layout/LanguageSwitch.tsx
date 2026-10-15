'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

/** "EN | हिंदी" — keeps the visitor on the same page and remembers the choice (spec §6). */
export function LanguageSwitch() {
  const t = useTranslations('language')
  const current = useLocale()
  const pathname = usePathname()

  const remember = (locale: Locale) => {
    try {
      localStorage.setItem('jv-lang-pref', locale)
    } catch {
      // Storage can be unavailable (private mode); the switch still works.
    }
  }

  return (
    <nav aria-label={t('label')} className="flex items-center gap-1 text-sm">
      {routing.locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden className="text-fg-subtle">
              |
            </span>
          )}
          <Link
            href={pathname}
            locale={locale}
            lang={locale}
            hrefLang={locale}
            aria-current={locale === current ? 'true' : undefined}
            onClick={() => remember(locale)}
            className="rounded-sm px-1.5 py-1 text-fg-muted hover:text-fg aria-[current=true]:font-semibold aria-[current=true]:text-fg"
          >
            {t(locale)}
          </Link>
        </span>
      ))}
    </nav>
  )
}
