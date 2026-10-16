'use client'

import NextLink from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment } from 'react'

import { getPathname, usePathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'

/** Stores the visitor's language choice (spec §6). Storage can be unavailable (private mode). */
export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem('jv-lang-pref', locale)
  } catch {
    // The switch still works; the choice just isn't remembered.
  }
}

/** "EN | हिंदी" — keeps the visitor on the same page and remembers the choice (spec §6). */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations('language')
  const current = useLocale()
  const pathname = usePathname()

  return (
    <nav aria-label={t('label')} className={cn('flex items-center text-sm', className)}>
      {routing.locales.map((locale, i) => (
        <Fragment key={locale}>
          {i > 0 && (
            <span aria-hidden className="text-fg-subtle">
              |
            </span>
          )}
          {/* next/link on purpose: given `locale`, next-intl's Link forces /en/… for English,
              which only 307-redirects here (docs/decisions.md). */}
          <NextLink
            href={getPathname({ href: pathname, locale })}
            lang={locale}
            hrefLang={locale}
            aria-current={locale === current ? 'true' : undefined}
            onClick={() => rememberLocale(locale)}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg aria-[current=true]:font-semibold aria-[current=true]:text-fg"
          >
            {t(locale)}
          </NextLink>
        </Fragment>
      ))}
    </nav>
  )
}
