'use client'

import { Menu, User, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Dialog } from 'radix-ui'
import { useState, type MouseEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Link, usePathname } from '@/i18n/navigation'

import type { HeaderProps, NavLink } from './Header'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'
import { currentAttr, ProductEntry } from './MegaMenu'
import { ThemeToggle } from './ThemeToggle'

export type MobileMenuProps = Omit<HeaderProps, 'nav'> & { nav: NavLink[]; className?: string }

/**
 * Full-screen menu below the desktop breakpoint. Radix traps focus, locks scroll, closes on Escape.
 * Loaded on first use by MobileMenu, which opens it straight away (`defaultOpen`).
 */
export function MobileMenuDialog({
  nav,
  products,
  showAccount = false,
  className,
  defaultOpen = false,
}: MobileMenuProps & { defaultOpen?: boolean }) {
  const t = useTranslations()
  const pathname = usePathname()
  // Open only for the page it was opened on, so any navigation (links, back/forward) closes it.
  const [openOn, setOpenOn] = useState<string | null>(defaultOpen ? pathname : null)
  // Also close at once on a link click (same-page links and the language switch keep the pathname).
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as Element).closest('a')) setOpenOn(null)
  }

  return (
    <Dialog.Root
      open={openOn === pathname}
      onOpenChange={(open) => setOpenOn(open ? pathname : null)}
    >
      <Dialog.Trigger asChild>
        <IconButton label={t('ui.header.openMenu')} className={className}>
          <Menu aria-hidden />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        {/* Hidden behind the content, but Radix locks page scroll through the overlay. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={closeOnLink}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg text-fg transition-[opacity,translate] duration-(--duration-base) ease-out starting:translate-y-2 starting:opacity-0"
        >
          <Dialog.Title className="sr-only">{t('ui.header.menu')}</Dialog.Title>
          <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg px-4 sm:px-6">
            <Link href="/" className="-ml-1 rounded-md p-1">
              <Logo />
            </Link>
            <Dialog.Close asChild>
              <IconButton label={t('ui.header.closeMenu')}>
                <X aria-hidden />
              </IconButton>
            </Dialog.Close>
          </div>

          <nav aria-label={t('ui.header.mainNav')} className="px-4 py-6 sm:px-6">
            <ul className="space-y-1">
              {nav.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    aria-current={currentAttr(pathname, item.href)}
                    className="flex min-h-12 items-center rounded-md px-2 font-display text-2xl font-semibold transition-colors duration-(--duration-fast) hover:bg-hover aria-[current]:text-primary"
                  >
                    {item.label}
                  </Link>
                  {item.megaMenu === 'products' && products.length > 0 && (
                    <ul className="mt-1 mb-4 grid gap-1 sm:grid-cols-2">
                      {products.map((product) => (
                        <li key={product.slug}>
                          <ProductEntry
                            product={product}
                            aria-current={currentAttr(pathname, `/products/${product.slug}`)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto space-y-4 border-t border-border px-4 py-6 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <LanguageSwitch className="-ml-2" />
              <ThemeToggle />
            </div>
            {showAccount && (
              <Button asChild variant="secondary" size="lg" className="w-full">
                <Link href="/account">
                  <User aria-hidden />
                  {t('ui.header.account')}
                </Link>
              </Button>
            )}
            <Button asChild size="lg" className="w-full">
              <Link href="/services#start">{t('ui.header.cta')}</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
