'use client'

import { Languages, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

import { rememberLocale } from './LanguageSwitch'

const noop = () => () => {}

/** No stored choice and the browser lists Hindi. Client-only: always false on the server. */
function prefersHindi() {
  try {
    if (localStorage.getItem('jv-lang-pref')) return false
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
    return languages.some((language) => language.toLowerCase().split('-')[0] === 'hi')
  } catch {
    return false
  }
}

/**
 * "हिंदी में देखें?" (spec §6): shown on English pages to Hindi-preferring browsers until a
 * language is chosen. It never redirects, so pages stay static. Floating, so it shifts nothing.
 */
export function LanguageSuggestion() {
  const locale = useLocale()
  const show = useSyncExternalStore(noop, prefersHindi, () => false)
  if (locale !== 'en' || !show) return null
  return (
    <LanguageSuggestionBanner className="fixed inset-x-4 bottom-4 z-40 sm:right-6 sm:bottom-6 sm:left-auto sm:max-w-sm" />
  )
}

/** The banner itself (also used inline by the styleguide). */
export function LanguageSuggestionBanner({ className }: { className?: string }) {
  const t = useTranslations('ui.languageSuggestion')
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div
      role="region"
      aria-label={t('label')}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-border bg-surface-raised py-2 pr-2 pl-4 text-fg shadow-lg',
        'transition-[opacity,translate] duration-(--duration-slow) ease-out starting:translate-y-2 starting:opacity-0',
        className,
      )}
    >
      <Languages aria-hidden className="size-5 shrink-0 text-primary" />
      <Link
        href={pathname}
        locale="hi"
        lang="hi"
        hrefLang="hi"
        onClick={() => rememberLocale('hi')}
        className="min-w-0 rounded-md px-1 py-1.5 font-medium underline-offset-4 hover:underline"
      >
        {t('prompt')}
      </Link>
      <IconButton
        label={t('dismiss')}
        size="sm"
        className="ml-auto"
        onClick={() => {
          rememberLocale('en')
          setDismissed(true)
        }}
      >
        <X aria-hidden />
      </IconButton>
    </div>
  )
}
