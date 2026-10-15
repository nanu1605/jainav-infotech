'use client'

import { ChevronDown, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { NavigationMenu } from 'radix-ui'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { Navigation } from '@/payload-types'

import { Container } from './Container'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'
import { currentAttr, isCurrent, MegaMenu, type MenuProduct } from './MegaMenu'
import { MobileMenu } from './MobileMenu'
import { ThemeToggle } from './ThemeToggle'

export type HeaderNavItem = Pick<
  NonNullable<Navigation['header']>[number],
  'label' | 'href' | 'megaMenu'
>
export type NavLink = HeaderNavItem & { label: string }

export type HeaderProps = {
  nav: HeaderNavItem[]
  products: MenuProduct[]
  /** Account link, only while the store is enabled (spec §8.1). */
  showAccount?: boolean
}

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

const navItem = cn(
  'relative inline-flex h-10 items-center gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap text-fg-muted',
  'transition-colors duration-(--duration-fast) hover:bg-hover hover:text-fg data-active:text-fg data-[state=open]:bg-hover data-[state=open]:text-fg',
  'after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-active:after:opacity-100',
)

/**
 * Site header (spec §8.1). Sticky in a fixed 4rem box. It compacts on scroll with opacity and
 * transform only: the background fades in at 3.5rem, the row moves up and the logo shrinks, so
 * nothing below ever shifts (§14: CLS).
 * Pages give their `<main>` `id="main"` (skip link target) and `scroll-mt-16`.
 * Breakpoints are container queries, so the header also lays out correctly inside narrow frames.
 */
export function Header({ nav, products, showAccount = false }: HeaderProps) {
  const t = useTranslations()
  const pathname = usePathname()
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  )
  const links = nav.filter((item): item is NavLink => !!item.label)

  return (
    <header
      data-scrolled={scrolled ? '' : undefined}
      className="group/header @container sticky top-0 z-40 h-16"
    >
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-10"
      >
        {t('site.skipToContent')}
      </a>
      <div
        aria-hidden
        className="absolute inset-0 origin-top border-b border-border bg-bg/80 opacity-0 shadow-sm backdrop-blur-md transition-[opacity,scale] duration-(--duration-base) ease-out group-data-[scrolled]/header:scale-y-[0.875] group-data-[scrolled]/header:opacity-100"
      />
      <Container className="relative flex h-full translate-y-1 items-center gap-2 transition-transform duration-(--duration-base) ease-out group-data-[scrolled]/header:-translate-y-1">
        <Link
          href="/"
          className="-ml-1 mr-4 shrink-0 origin-left rounded-md p-1 transition-[scale] duration-(--duration-base) ease-out group-data-[scrolled]/header:scale-90"
        >
          <Logo />
        </Link>

        <NavigationMenu.Root aria-label={t('ui.header.mainNav')} className="hidden @5xl:block">
          <NavigationMenu.List className="flex items-center gap-1">
            {links.map((item) => (
              <NavigationMenu.Item key={`${item.href}-${item.label}`}>
                {item.megaMenu === 'products' && products.length > 0 ? (
                  <>
                    <NavigationMenu.Trigger
                      data-active={isCurrent(pathname, item.href) ? '' : undefined}
                      aria-current={isCurrent(pathname, item.href) ? 'true' : undefined}
                      className={cn(navItem, 'group/trigger')}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden
                        className="size-3.5 transition-transform duration-(--duration-fast) group-data-[state=open]/trigger:rotate-180"
                      />
                    </NavigationMenu.Trigger>
                    <MegaMenu products={products} href={item.href} />
                  </>
                ) : (
                  <NavigationMenu.Link
                    asChild
                    active={isCurrent(pathname, item.href)}
                    // Radix would say "page" on every page below the link too.
                    aria-current={currentAttr(pathname, item.href)}
                  >
                    <Link href={item.href} className={navItem}>
                      {item.label}
                    </Link>
                  </NavigationMenu.Link>
                )}
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitch className="hidden @2xl:flex" />
          <ThemeToggle />
          {showAccount && (
            <IconButton asChild label={t('ui.header.account')} className="hidden @2xl:inline-flex">
              <Link href="/account">
                <User aria-hidden />
              </Link>
            </IconButton>
          )}
          <Button asChild size="sm" className="ml-2 hidden @2xl:inline-flex">
            <Link href="/contact">{t('ui.header.cta')}</Link>
          </Button>
          <MobileMenu
            nav={links}
            products={products}
            showAccount={showAccount}
            className="@5xl:hidden"
          />
        </div>
      </Container>
    </header>
  )
}
