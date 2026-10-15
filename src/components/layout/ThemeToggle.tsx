'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { IconButton } from '@/components/ui/IconButton'

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
    <IconButton label={t('toggle')} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </IconButton>
  )
}
