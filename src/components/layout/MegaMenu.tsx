'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { NavigationMenu } from 'radix-ui'
import type { ComponentProps } from 'react'

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

/** Products mega-menu panel; render inside a `NavigationMenu.Item`, after its trigger. */
export function MegaMenu({ products, href }: { products: MenuProduct[]; href: string }) {
  const t = useTranslations('ui.header')
  const pathname = usePathname()

  return (
    <NavigationMenu.Content className="absolute top-full left-0 z-50 pt-3 transition-[opacity,translate] duration-(--duration-base) ease-out starting:-translate-y-1 starting:opacity-0">
      <div className="w-[40rem] rounded-xl border border-border bg-surface-raised p-2 text-fg shadow-lg">
        <ul className="grid grid-cols-2 gap-1">
          {products.map((product) => (
            <li key={product.slug}>
              <NavigationMenu.Link
                asChild
                active={isCurrent(pathname, `/products/${product.slug}`)}
                aria-current={currentAttr(pathname, `/products/${product.slug}`)}
              >
                <ProductEntry product={product} />
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-border px-3 pt-1">
          <NavigationMenu.Link asChild active={pathname === href}>
            <Link
              href={href}
              className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-fg underline-offset-4 hover:underline"
            >
              {t('allProducts')}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </NavigationMenu.Link>
        </div>
      </div>
    </NavigationMenu.Content>
  )
}
