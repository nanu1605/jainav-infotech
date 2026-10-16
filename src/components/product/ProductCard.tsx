import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import type { CSSProperties } from 'react'

import { Spotlight } from '@/components/motion/Spotlight'
import { Tilt } from '@/components/motion/Tilt'
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge'
import { Link } from '@/i18n/navigation'
import { accentVars } from '@/lib/accent'
import type { Media, Product } from '@/payload-types'

import { CardPreview } from './CardPreview'

export type ProductCardData = Pick<
  Product,
  'name' | 'slug' | 'tagline' | 'status' | 'platforms' | 'accentColor'
> & {
  logo?: Media | null
  /** The product's `cardPreview` video: a muted loop over the card's top area. */
  preview?: Media | null
}

type Props = {
  product: ProductCardData
  /** Defaults to the product's page. */
  href?: string
  headingLevel?: 'h2' | 'h3'
}

/**
 * Product card for the products hub, mega-menu and home showcase (spec §8.3): logo, name, tagline,
 * status and platforms, with a glow in the product's accent color. The name's link covers the
 * whole card; the card shows the focus ring. Tilt and the cursor spotlight are mouse-only. A
 * preview video plays on hover (mouse) or in view (touch, one card at a time), see CardPreview.
 */
export function ProductCard({ product, href, headingLevel: Heading = 'h3' }: Props) {
  const t = useTranslations('ui.productCard')
  const { name, slug, tagline, status, platforms, accentColor, logo, preview } = product

  return (
    <Tilt className="h-full">
      <Spotlight
        color="color-mix(in oklch, var(--product-accent, var(--brand-accent)) 22%, transparent)"
        style={accentVars(accentColor) as CSSProperties}
        className="group flex h-full flex-col rounded-lg border border-border bg-surface p-6 shadow-sm transition-[translate] duration-[var(--duration-base)] ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 -z-10 size-56 rounded-full bg-product-accent opacity-15 blur-3xl transition-opacity duration-[var(--duration-slow)] ease-out group-hover:opacity-30 dark:opacity-20 dark:group-hover:opacity-35"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-product-accent to-transparent opacity-70"
        />
        {preview?.url && preview.mimeType?.startsWith('video/') && (
          <CardPreview src={preview.url} />
        )}

        <div className="flex items-start justify-between gap-4">
          {logo?.url ? (
            // The name sits right below, so the logo is decorative.
            <Image
              src={logo.url}
              alt=""
              width={logo.width ?? 48}
              height={logo.height ?? 48}
              sizes="48px"
              className="size-12 rounded-md object-contain"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-md bg-product-accent font-display text-xl font-bold text-[var(--product-accent-fg,var(--brand-accent-fg))]"
            >
              {name.charAt(0)}
            </span>
          )}
          {/* Solid backing and stacked above the preview video; looks the same without it. */}
          <span className="relative flex rounded-sm bg-surface">
            <StatusBadge status={status} />
          </span>
        </div>

        <Heading className="mt-6 font-display text-xl font-semibold text-fg">
          <Link
            href={href ?? `/products/${slug}`}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {name}
          </Link>
        </Heading>
        {tagline && <p className="mt-2 text-fg-muted">{tagline}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="flex flex-wrap gap-1.5">
            {platforms?.map((platform) => (
              <PlatformBadge key={platform} platform={platform} />
            ))}
          </div>
          <span className="ms-auto flex items-center gap-1.5 text-sm font-medium text-fg">
            {status === 'coming-soon' && t('waitlist')}
            <ArrowRight
              aria-hidden
              className="size-4 text-fg-muted transition-[translate] duration-[var(--duration-base)] ease-out group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
            />
          </span>
        </div>
      </Spotlight>
    </Tilt>
  )
}
