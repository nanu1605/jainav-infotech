import { ArrowRight, Check, Cloud, HardDrive } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { ChangelogList } from '@/components/content/ChangelogList'
import { Icon } from '@/components/content/Icon'
import { RichText } from '@/components/content/RichText'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Gallery } from '@/components/media/Gallery'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { PricingTable, planTiers } from '@/components/product/PricingTable'
import { ProductButtons } from '@/components/product/ProductButtons'
import { ReleaseDetails } from '@/components/product/ReleaseDetails'
import { Table } from '@/components/ui/Table'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type {
  Faq,
  ProductChangelogPreviewBlock,
  ProductComparisonBlock,
  ProductCtaBandBlock,
  ProductDownloadBlock,
  ProductEmbedBlock,
  ProductFaqBlock,
  ProductFeatureGridBlock,
  ProductFeatureScrollerBlock,
  ProductHowItWorksBlock,
  ProductPricingBlock,
  ProductPrivacyBlock,
  ProductProblemSolutionBlock,
  ProductRequirementsBlock,
  ProductRichTextBlock,
  ProductScreenshotsBlock,
  ProductStatStripBlock,
  ProductTestimonialsBlock,
  ProductUseCasesBlock,
  ProductVideoBlock,
  Testimonial,
} from '@/payload-types'
import { cn } from '@/lib/cn'
import { isAllowedEmbedUrl } from '@/lib/embed'
import type { LoadedProduct } from '@/lib/product'
import { getChangelogFeed, getFaqs, getTestimonials } from '@/lib/queries'

import { FaqList } from '../FaqList'
import { Testimonials as QuoteGrid } from '../page/Sections'
import { resolveStats, StatGrid } from '../Stats'
import { ButtonRow, docs, LinkButton, media } from '../shared'
import { FeatureScrollerSync } from './FeatureScroller.client'

export type ProductBlockProps<B> = { block: B; locale: Locale; loaded: LoadedProduct }

const texts = (items?: { text?: string | null; id?: string | null }[] | null) =>
  (items ?? []).flatMap((i) => (i.text ? [i.text] : []))

export async function ProblemSolution({ block }: ProductBlockProps<ProductProblemSolutionBlock>) {
  const points = texts(block.points)
  if (!block.problem && !block.solution && !points.length) return null
  const t = await getTranslations('ui.problemSolution')
  return (
    <Section title={block.heading}>
      <div className="grid gap-6 md:grid-cols-2">
        {block.problem && (
          <div className="rounded-xl border border-border bg-bg-subtle p-8">
            <h3 className="text-sm font-semibold text-fg-muted">{t('problem')}</h3>
            <p className="mt-3 text-lg text-fg">{block.problem}</p>
          </div>
        )}
        {block.solution && (
          <div className="rounded-xl border border-product-accent/40 bg-surface p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-fg-muted">{t('solution')}</h3>
            <p className="mt-3 text-lg text-fg">{block.solution}</p>
          </div>
        )}
      </div>
      {points.length > 0 && <CheckList items={points} className="mt-10 sm:grid-cols-2" />}
    </Section>
  )
}

function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('grid gap-3', className)}>
      {items.map((text) => (
        <li key={text} className="flex gap-2.5 text-fg">
          <Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
          {text}
        </li>
      ))}
    </ul>
  )
}

/** Feature grid and audience / use cases share one layout (icon, title, text). */
export function IconGrid({
  block,
}: ProductBlockProps<ProductFeatureGridBlock | ProductUseCasesBlock>) {
  if (!block.items?.length) return null
  const intro = 'intro' in block ? block.intro : undefined
  return (
    <Section title={block.heading} intro={intro}>
      <Stagger as="ul" className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {block.items.map((item) => (
          <StaggerItem as="li" key={item.id ?? item.title}>
            <span className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-product-accent-text">
              <Icon name={item.icon} className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-fg">{item.title}</h3>
            {item.text && <p className="mt-1.5 text-fg-muted">{item.text}</p>}
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  )
}

/**
 * Feature rows (spec §8.4). When any item has media, md+ screens without reduced motion get the
 * scroll-linked layout (`motion-safe:md:`): the steps scroll past a sticky 4:3 frame that
 * cross-fades to the media of the step crossing the viewport's middle (FeatureScrollerSync).
 * Small screens, reduced motion and media-less blocks keep alternating rows with their own images.
 */
export function FeatureScroller({ block }: ProductBlockProps<ProductFeatureScrollerBlock>) {
  if (!block.items?.length) return null
  const items = block.items.map((item) => ({ ...item, image: media(item.media) }))
  const first = items.findIndex((item) => item.image)
  const scroll = first >= 0
  const sizes = '(min-width: 768px) 36rem, 100vw'

  const rows = (
    <ol className={cn('space-y-16 sm:space-y-24', scroll && 'motion-safe:md:space-y-0')}>
      {items.map(({ id, title, text, image }, i) => (
        <li
          key={id ?? title}
          data-step={scroll ? i : undefined}
          data-active={scroll && i === 0 ? '' : undefined}
          className={cn(
            'group/step grid items-center gap-8 md:grid-cols-2 md:gap-16',
            scroll && 'motion-safe:md:flex motion-safe:md:min-h-[70svh]',
          )}
        >
          <div
            className={cn(
              i % 2 === 1 && image && 'md:order-2',
              scroll &&
                'relative motion-safe:md:border-s motion-safe:md:border-border motion-safe:md:ps-6',
            )}
          >
            {scroll && (
              <span
                aria-hidden
                className="absolute inset-y-0 -start-px hidden w-0.5 rounded-full bg-product-accent opacity-0 transition-opacity duration-(--duration-base) ease-out group-data-active/step:opacity-100 motion-safe:md:block"
              />
            )}
            <h3 className="font-display text-2xl font-semibold text-fg">{title}</h3>
            {text && <p className="mt-3 text-lg text-fg-muted">{text}</p>}
          </div>
          {image && (
            <div
              className={cn(
                'relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface shadow-md',
                scroll && 'motion-safe:md:hidden',
              )}
            >
              <ResponsiveImage media={image} fill sizes={sizes} className="object-cover" />
            </div>
          )}
        </li>
      ))}
    </ol>
  )

  if (!scroll) return <Section title={block.heading}>{rows}</Section>
  return (
    <Section title={block.heading}>
      <FeatureScrollerSync className="motion-safe:md:grid motion-safe:md:grid-cols-2 motion-safe:md:gap-16">
        {rows}
        <div className="hidden motion-safe:md:block">
          <div className="sticky top-32 aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface shadow-md">
            {items.map(
              ({ id, title, image }, i) =>
                image && (
                  <ResponsiveImage
                    key={id ?? title}
                    media={image}
                    fill
                    sizes={sizes}
                    data-frame={i}
                    data-active={i === first ? '' : undefined}
                    className="scale-[1.03] object-cover opacity-0 transition-[opacity,scale] duration-(--duration-slow) ease-out data-active:scale-100 data-active:opacity-100"
                  />
                ),
            )}
          </div>
        </div>
      </FeatureScrollerSync>
    </Section>
  )
}

export function Screenshots({ block }: ProductBlockProps<ProductScreenshotsBlock>) {
  const images = (block.images ?? []).flatMap((i) => {
    const image = media(i.image)
    return image ? [{ ...image, alt: i.caption || image.alt }] : []
  })
  if (!images.length) return null
  return (
    <Section title={block.heading}>
      <Gallery images={images} />
    </Section>
  )
}

export async function Video({ block }: ProductBlockProps<ProductVideoBlock>) {
  const video = media(block.video)
  if (!video) return null
  const captions = media(block.captions)
  const t = await getTranslations('ui.video')
  return (
    <Section title={block.heading}>
      {/* Loads nothing until played; captions per spec §15. */}
      <video
        controls
        preload="none"
        poster={media(block.poster)?.url ?? undefined}
        className="aspect-video w-full rounded-xl border border-border bg-bg-subtle shadow-md"
      >
        <source src={video.url!} type={video.mimeType ?? undefined} />
        {captions && (
          <track
            kind="captions"
            src={captions.url!}
            // The captions file isn't localized: product videos are captioned in English.
            srcLang="en"
            label={t('captionsEnglish')}
            default
          />
        )}
      </video>
    </Section>
  )
}

export function HowItWorks({ block }: ProductBlockProps<ProductHowItWorksBlock>) {
  if (!block.steps?.length) return null
  return (
    <Section title={block.heading} tone="subtle">
      <ol className="grid gap-10 md:grid-cols-3">
        {block.steps.map((step, i) => {
          const image = media(step.media)
          return (
            <li key={step.id ?? step.title}>
              {image && (
                <div className="relative mb-6 aspect-video overflow-hidden rounded-lg border border-border bg-surface">
                  <ResponsiveImage
                    media={image}
                    fill
                    sizes="(min-width: 768px) 24rem, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-product-accent font-display font-semibold text-product-accent-fg tabular-nums"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-fg">{step.title}</h3>
              {step.text && <p className="mt-1.5 text-fg-muted">{step.text}</p>}
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

export async function Pricing({ block, locale, loaded }: ProductBlockProps<ProductPricingBlock>) {
  const t = await getTranslations('ui.pricing')
  const tiers =
    block.source === 'plans'
      ? await planTiers(loaded, locale)
      : (block.tiers ?? []).map((tier, i) => ({
          key: tier.id ?? String(i),
          name: tier.name ?? '',
          price: tier.price ?? '',
          features: texts(tier.features),
          highlight: tier.highlight,
        }))
  if (!tiers.length) return null
  return (
    <Section title={block.heading} id="pricing" className="scroll-mt-28">
      <PricingTable tiers={tiers} />
      {block.source === 'manual' && block.fullPricingUrl && (
        <a
          href={block.fullPricingUrl}
          target="_blank"
          rel="noopener"
          className="mt-8 inline-flex min-h-10 items-center gap-1.5 font-medium text-fg underline-offset-4 hover:underline"
        >
          {t('fullPricing')}
          <ArrowRight aria-hidden className="size-4" />
        </a>
      )}
    </Section>
  )
}

export async function Privacy({ block }: ProductBlockProps<ProductPrivacyBlock>) {
  const local = texts(block.local)
  const cloud = texts(block.cloud)
  if (!local.length && !cloud.length) return null
  const t = await getTranslations('ui.privacy')
  return (
    <Section title={block.heading} intro={block.note}>
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { items: local, title: t('local'), Glyph: HardDrive },
          { items: cloud, title: t('cloud'), Glyph: Cloud },
        ].map(({ items, title, Glyph }) =>
          items.length ? (
            <div key={title} className="rounded-xl border border-border bg-surface p-8 shadow-sm">
              <h3 className="flex items-center gap-2.5 font-display text-lg font-semibold text-fg">
                <Glyph aria-hidden className="size-5 text-product-accent-text" />
                {title}
              </h3>
              <CheckList items={items} className="mt-5" />
            </div>
          ) : null,
        )}
      </div>
    </Section>
  )
}

export async function Requirements({ block }: ProductBlockProps<ProductRequirementsBlock>) {
  if (!block.rows?.length) return null
  const t = await getTranslations('ui.requirements')
  return (
    <Section title={block.heading} size="prose">
      <Table caption={block.heading || t('caption')}>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">{t('item')}</span>
            </th>
            <th scope="col">{t('minimum')}</th>
            <th scope="col">{t('recommended')}</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.id ?? row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.minimum}</td>
              <td>{row.recommended}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Section>
  )
}

export async function DownloadPanel({
  block,
  locale,
  loaded,
}: ProductBlockProps<ProductDownloadBlock>) {
  const release = loaded.latest[block.channel]
  if (!release || loaded.product.status === 'coming-soon') return null
  const t = await getTranslations('ui.release')
  const { slug, hostingMode } = loaded.product
  return (
    <Section
      title={block.heading}
      intro={block.note}
      id="download"
      className="scroll-mt-28"
      size="prose"
    >
      <ReleaseDetails
        release={release}
        locale={locale}
        href={`/api/v1/downloads/${slug}/latest?channel=${block.channel}`}
      />
      {hostingMode === 'hosted' && (
        <Link
          href={`/products/${slug}/download`}
          className="mt-6 inline-flex min-h-10 items-center gap-1.5 font-medium text-fg underline-offset-4 hover:underline"
        >
          {t('allDownloads')}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </Section>
  )
}

export async function ChangelogPreview({
  block,
  locale,
  loaded,
}: ProductBlockProps<ProductChangelogPreviewBlock>) {
  const items = await getChangelogFeed(locale, { productId: loaded.product.id, limit: block.limit })
  if (!items.length) return null
  const t = await getTranslations('ui.latest')
  const { slug, hostingMode } = loaded.product
  return (
    <Section title={block.heading} size="prose">
      <ChangelogList items={items} locale={locale} headingLevel={3} />
      <Link
        href={hostingMode === 'hosted' ? `/products/${slug}/changelog` : '/changelog'}
        className="mt-8 inline-flex min-h-10 items-center gap-1.5 font-medium text-fg underline-offset-4 hover:underline"
      >
        {t('allChanges')}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Section>
  )
}

export async function ProductFaq({ block, locale, loaded }: ProductBlockProps<ProductFaqBlock>) {
  const chosen = docs<Faq>(block.faqs)
  const faqs = chosen.length ? chosen : await getFaqs(locale, { productId: loaded.product.id })
  return <FaqList heading={block.heading} faqs={faqs} />
}

export async function ProductTestimonials({
  block,
  locale,
  loaded,
}: ProductBlockProps<ProductTestimonialsBlock>) {
  const chosen = docs<Testimonial>(block.items)
  const items = chosen.length ? chosen : await getTestimonials(locale, loaded.product.id)
  if (!items.length) return null
  return (
    <Section title={block.heading}>
      <QuoteGrid items={items} />
    </Section>
  )
}

export async function Comparison({ block }: ProductBlockProps<ProductComparisonBlock>) {
  const columns = block.columns ?? []
  if (!columns.length || !block.rows?.length) return null
  const t = await getTranslations('ui.comparison')
  return (
    <Section title={block.heading}>
      <Table caption={block.heading || t('caption')}>
        <thead>
          <tr>
            <th scope="col">{t('feature')}</th>
            {columns.map((c) => (
              <th
                key={c.id ?? c.label}
                scope="col"
                className={cn(c.highlight && 'text-product-accent-text')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.id ?? row.feature}>
              <th scope="row">{row.feature}</th>
              {columns.map((c, i) => (
                <td key={c.id ?? i}>{row.cells?.[i]?.value || '–'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Section>
  )
}

export function CtaBand({ block, locale, loaded }: ProductBlockProps<ProductCtaBandBlock>) {
  const { product, buttons } = loaded
  const custom = !block.useProductButtons
  if (!block.heading && !(custom ? block.primary?.label : buttons.length)) return null
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-xl border border-border bg-surface px-6 py-14 text-center shadow-md sm:px-16">
          <div aria-hidden className="absolute inset-0 -z-10 bg-product-accent opacity-10" />
          {block.heading && (
            <h2 className="font-display text-3xl font-bold text-balance text-fg sm:text-4xl">
              {block.heading}
            </h2>
          )}
          {block.text && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-fg-muted">{block.text}</p>
          )}
          <div className="mt-8 flex justify-center">
            {custom ? (
              <ButtonRow>
                <LinkButton link={block.primary} magnetic />
                <LinkButton link={block.secondary} variant="secondary" />
              </ButtonRow>
            ) : (
              <ProductButtons
                buttons={buttons}
                name={product.name}
                slug={product.slug}
                locale={locale}
              />
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

export function ProductRichText({ block, locale }: ProductBlockProps<ProductRichTextBlock>) {
  return (
    <Section size="prose">
      <RichText data={block.content} locale={locale} />
    </Section>
  )
}

export async function StatStrip({ block, locale }: ProductBlockProps<ProductStatStripBlock>) {
  const stats = await resolveStats(block.stats, locale)
  if (!stats.length) return null
  return (
    <section className="border-y border-border bg-bg-subtle py-12">
      <Container>
        <StatGrid stats={stats} />
      </Container>
    </section>
  )
}

const RATIO = { '16:9': 'aspect-video', '4:3': 'aspect-[4/3]', '1:1': 'aspect-square' } as const

export function Embed({ block }: ProductBlockProps<ProductEmbedBlock>) {
  // Re-checked here: the allow-list may have shrunk since the block was saved.
  if (!isAllowedEmbedUrl(block.url)) return null
  return (
    <Section>
      <iframe
        src={block.url}
        title={block.title ?? ''}
        loading="lazy"
        allow="fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        className={cn(
          'w-full rounded-xl border border-border bg-bg-subtle',
          RATIO[block.aspectRatio],
        )}
      />
    </Section>
  )
}
