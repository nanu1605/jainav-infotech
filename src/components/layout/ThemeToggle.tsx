'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { track } from '@/lib/analytics'

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
  const toggle = () => {
    const theme = isDark ? 'light' : 'dark'
    setTheme(theme)
    track('theme_switch', { to: theme })
  }

  return (
    <IconButton label={t('toggle')} onClick={toggle}>
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </IconButton>
  )
}
