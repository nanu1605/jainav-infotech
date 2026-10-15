'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

const noop = () => () => {}

export function ThemeToggle() {
  const t = useTranslations('theme')
  const { resolvedTheme, setTheme } = useTheme()
  // resolvedTheme is unknown on the server; render a neutral icon until hydrated.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={t('toggle')}
      title={t('toggle')}
      className="inline-flex size-10 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg"
    >
      {isDark ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
    </button>
  )
}
