'use client'

import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { lazy, Suspense, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'

import type { MobileMenuProps } from './MobileMenuDialog'

const MobileMenuDialog = lazy(() =>
  import('./MobileMenuDialog').then((m) => ({ default: m.MobileMenuDialog })),
)
const preload = () => void import('./MobileMenuDialog')

/**
 * Mobile menu button. The dialog (Radix focus trap and scroll lock) loads on first use, keeping
 * it out of every page's initial JavaScript (spec §15); hover or focus starts loading it early.
 */
export function MobileMenu(props: MobileMenuProps) {
  const t = useTranslations('ui.header')
  const [used, setUsed] = useState(false)
  const button = (
    <IconButton
      label={t('openMenu')}
      className={props.className}
      aria-haspopup="dialog"
      aria-expanded={false}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={() => setUsed(true)}
    >
      <Menu aria-hidden />
    </IconButton>
  )
  if (!used) return button
  return (
    <Suspense fallback={button}>
      <MobileMenuDialog {...props} defaultOpen />
    </Suspense>
  )
}
