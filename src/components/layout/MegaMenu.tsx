'use client'

import { ArrowRight, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type PointerEvent,
} from 'react'

import { StatusBadge } from '@/components/ui/Badge'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { Media, Product } from '@/payload-types'

export type MenuProduct = Pick<Product, 'name' | 'slug' | 'tagline' | 'status'> & {
  logo?: Media | null
}

/** True on `href` itself and on pages below it (`/products` is current on `/products/vyro`). */
export const isCurrent = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

/** aria-current: "page" only on the page itself, "true" on the section it sits in. */
export const currentAttr = (pathname: string, href: string) =>
  pathname === href ? 'page' : isCurrent(pathname, href) ? 'true' : undefined

type ProductEntryProps = { product: MenuProduct } & Omit<
  ComponentProps<typeof Link>,
  'href' | 'children'
>

/** One product in the header menus: logo (or monogram), name, status and tagline. */
export function ProductEntry({ product, className, ...props }: ProductEntryProps) {
  const { name, slug, tagline, status, logo } = product

  return (
    <Link
      href={`/products/${slug}`}
      className={cn(
        'flex items-start gap-3 rounded-lg p-3 transition-colors duration-(--duration-fast) hover:bg-hover aria-[current]:bg-hover',
        className,
      )}
      {...props}
    >
      {logo?.url ? (
        <Image
          src={logo.url}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-md object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg-subtle font-display font-semibold text-fg"
        >
          {name.charAt(0)}
        </span>
      )}
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-fg">{name}</span>
          <StatusBadge status={status} />
        </span>
        {tagline && <span className="mt-1 block text-sm text-fg-muted">{tagline}</span>}
      </span>
    </Link>
  )
}

// Hover opens after a short pause and closes after a longer one, so passing over the trigger
// or moving down into the panel doesn't flicker it.
const OPEN_DELAY = 120
const CLOSE_DELAY = 300

/**
 * The header's products menu (spec §8.1): a disclosure button and its panel (WAI disclosure
 * navigation pattern). Opens on click, Enter or Space, or on hover with a mouse; closes on
 * Escape (focus returns to the button), a click or focus outside, and navigation. Hand-built
 * rather than Radix NavigationMenu, which put about 15 KB into every page's initial JS (§15).
 */
export function ProductsMenu({
  label,
  href,
  products,
  triggerClassName,
  defaultOpen = false,
}: {
  label: string
  href: string
  products: MenuProduct[]
  triggerClassName?: string
  /** Styleguide only: start open. */
  defaultOpen?: boolean
}) {
  const t = useTranslations('ui.header')
  const pathname = usePathname()
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Open on the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(defaultOpen ? pathname : null)
  const open = openOn === pathname

  const set = (next: boolean, delay = 0) => {
    clearTimeout(timer.current)
    const apply = () => setOpenOn(next ? pathname : null)
    if (delay) timer.current = setTimeout(apply, delay)
    else apply()
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpenOn(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenOn(null)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])

  const blur = (e: FocusEvent) => {
    if (!root.current?.contains(e.relatedTarget as Node | null)) set(false)
  }
  const active = isCurrent(pathname, href)

  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={(e: PointerEvent) => e.pointerType === 'mouse' && set(true, OPEN_DELAY)}
      onPointerLeave={(e: PointerEvent) => e.pointerType === 'mouse' && set(false, CLOSE_DELAY)}
      onBlur={blur}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        // Only while the panel exists: a reference to a missing id is invalid ARIA.
        aria-controls={open ? id : undefined}
        aria-current={active ? 'true' : undefined}
        data-active={active ? '' : undefined}
        data-state={open ? 'open' : 'closed'}
        onClick={() => set(!open)}
        className={cn('group/trigger', triggerClassName)}
      >
        {label}
        <ChevronDown
          aria-hidden
          className="size-3.5 transition-transform duration-(--duration-fast) group-data-[state=open]/trigger:rotate-180"
        />
      </button>
      {open && (
        <div
          id={id}
          className="absolute top-full left-0 z-50 pt-3 transition-[opacity,translate] duration-(--duration-base) ease-out starting:-translate-y-1 starting:opacity-0"
        >
          <div className="w-[40rem] rounded-xl border border-border bg-surface-raised p-2 text-fg shadow-lg">
            <ul className="grid grid-cols-2 gap-1">
              {products.map((product) => (
                <li key={product.slug}>
                  <ProductEntry
                    product={product}
                    aria-current={currentAttr(pathname, `/products/${product.slug}`)}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-1 border-t border-border px-3 pt-1">
              <Link
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-fg underline-offset-4 hover:underline"
              >
                {t('allProducts')}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
