import type { CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Container } from '@/components/layout/Container'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { ProductButtons } from '@/components/product/ProductButtons'
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge'
import type { Locale } from '@/i18n/routing'
import type { ProductHeroBlock } from '@/payload-types'
import { accentVars } from '@/lib/accent'
import type { LoadedProduct } from '@/lib/product'

import { media } from '../shared'

/**
 * Product hero (spec §8.4): status and platforms, heading (the product name by default), buttons
 * and secondary links. Signature animations replace the media in Phase 5; until then a product
 * with an animation and no media shows an accent panel with its logo.
 */
export async function ProductHero({
  block,
  locale,
  loaded,
}: {
  block: Partial<ProductHeroBlock>
  locale: Locale
  loaded: LoadedProduct
}) {
  const { product, buttons } = loaded
  const t = await getTranslations('ui.productHero')
  const image = media(block.media) ?? media(product.heroMedia)
  const logo = media(product.logo)

  return (
    <section
      className="relative isolate overflow-hidden"
      style={accentVars(product.accentColor) as CSSProperties}
    >
      <div
        aria-hidden
        className="absolute -top-32 right-0 -z-10 size-[32rem] rounded-full bg-product-accent opacity-15 blur-3xl dark:opacity-20"
      />
      <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <div lang={locale} className="flex flex-wrap items-center gap-2">
            <StatusBadge status={product.status} />
            {product.platforms?.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>
          {block.eyebrow && <p className="mt-6 font-medium text-fg-muted">{block.eyebrow}</p>}
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold text-balance text-fg sm:text-6xl [&:not(:lang(hi))]:tracking-tight">
            {block.heading || product.name}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-fg-muted sm:text-xl">
            {block.subheading || product.summary || product.tagline}
          </p>
          <div className="mt-10">
            <ProductButtons
              buttons={buttons}
              name={product.name}
              slug={product.slug}
              locale={locale}
            />
          </div>
          {!!product.secondaryLinks?.length && (
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {product.secondaryLinks.map((l) => (
                <li key={l.id ?? l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-10 items-center gap-1 font-medium text-fg underline-offset-4 hover:underline"
                  >
                    {l.label || t(`links.${l.kind}`)}
                    <ArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only">{t('newTab')}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {image ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <ResponsiveImage
              media={image}
              fill
              priority
              sizes="(min-width: 1024px) 40rem, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="relative hidden aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface shadow-lg lg:flex"
          >
            <div className="absolute inset-0 bg-product-accent opacity-10" />
            {logo ? (
              <ResponsiveImage
                media={logo}
                decorative
                sizes="10rem"
                className="relative size-40 object-contain"
              />
            ) : (
              <span className="relative font-display text-8xl font-bold text-product-accent-text">
                {product.name.slice(0, 1)}
              </span>
            )}
          </div>
        )}
      </Container>
    </section>
  )
}
