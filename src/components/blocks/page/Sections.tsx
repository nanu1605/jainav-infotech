import { ArrowRight, Check, Quote as QuoteMark } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Fragment } from 'react'

import { Icon } from '@/components/content/Icon'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { RichText } from '@/components/content/RichText'
import { Grid } from '@/components/layout/Grid'
import { Section } from '@/components/layout/Section'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { ProductCard } from '@/components/product/ProductCard'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Quote } from '@/components/ui/Quote'
import { Steps } from '@/components/ui/Steps'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type {
  Media,
  PageCompanyFactsBlock,
  PageCtaBlock,
  PageLatestBlock,
  PagePrinciplesBlock,
  PageProcessBlock,
  PageProductShowcaseBlock,
  PageProofBlock,
  PageRichTextBlock,
  PageServicesOverviewBlock,
  PageTeamBlock,
  PageTimelineBlock,
  Product,
  Service,
  Team,
  Testimonial,
} from '@/payload-types'
import { formatDate, formatYearMonth } from '@/lib/format'
import {
  getChangelogFeed,
  getPosts,
  getProducts,
  getServices,
  getSettings,
  getTeam,
} from '@/lib/queries'

import { resolveStats, StatGrid } from '../Stats'
import { ButtonRow, docs, LinkButton, media, type BlockProps } from '../shared'

export function Principles({ block }: BlockProps<PagePrinciplesBlock>) {
  if (!block.items?.length) return null
  return (
    <Section title={block.heading}>
      <Stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {block.items.map((item) => (
          <StaggerItem as="li" key={item.id ?? item.title}>
            <Icon name={item.icon} className="text-primary" />
            <h3 className="mt-4 font-display text-lg font-semibold text-fg">{item.title}</h3>
            {item.text && <p className="mt-2 text-sm text-fg-muted">{item.text}</p>}
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  )
}

export function Process({ block }: BlockProps<PageProcessBlock>) {
  if (!block.steps?.length) return null
  return (
    <Section title={block.heading} tone="subtle">
      <Steps steps={block.steps.map((s) => ({ title: s.title, description: s.text }))} />
    </Section>
  )
}

export function Timeline({ block, locale }: BlockProps<PageTimelineBlock>) {
  if (!block.items?.length) return null
  return (
    <Section title={block.heading} size="prose">
      <ol className="relative space-y-8 border-s border-border ps-6">
        {block.items.map((item) => (
          <li key={item.id ?? item.title} className="relative">
            <span
              aria-hidden
              className="absolute -start-[1.85rem] top-1.5 size-3 rounded-full border-2 border-bg bg-primary"
            />
            {item.date && (
              <p className="text-sm font-medium text-fg-muted tabular-nums">
                {formatYearMonth(locale, item.date)}
              </p>
            )}
            <h3 className="mt-1 font-display text-lg font-semibold text-fg">{item.title}</h3>
            {item.text && <p className="mt-1 text-fg-muted">{item.text}</p>}
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function RichTextBlock({ block, locale }: BlockProps<PageRichTextBlock>) {
  return (
    <Section size="prose">
      <RichText data={block.content} locale={locale} />
    </Section>
  )
}

export function Cta({ block }: BlockProps<PageCtaBlock>) {
  return (
    <Section align="center" title={block.heading} intro={block.text} tone="subtle">
      <div className="flex justify-center">
        <ButtonRow>
          <LinkButton link={block.primary} magnetic />
          <LinkButton link={block.secondary} variant="secondary" />
        </ButtonRow>
      </div>
      {block.showNewsletter && (
        <div className="mx-auto mt-12 max-w-lg rounded-xl border border-border bg-surface p-6 shadow-sm">
          <NewsletterForm level={3} />
        </div>
      )}
    </Section>
  )
}

export async function CompanyFacts({ block, locale }: BlockProps<PageCompanyFactsBlock>) {
  const [{ company }, t] = await Promise.all([getSettings(locale), getTranslations('ui.company')])
  const facts = [
    [t('legalName'), company?.legalName],
    [t('cin'), company?.cin],
    [t('gstin'), company?.gstin],
    [
      t('incorporated'),
      company?.incorporationDate &&
        formatDate(locale, company.incorporationDate, { dateStyle: 'long' }),
    ],
    [t('office'), company?.registeredAddress],
  ].filter((f): f is [string, string] => !!f[1])
  if (!facts.length) return null
  return (
    <Section title={block.heading} size="prose">
      <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
            <dt lang={locale} className="text-sm font-medium text-fg-muted">
              {label}
            </dt>
            <dd className="whitespace-pre-line text-fg sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

export async function Proof({ block, locale }: BlockProps<PageProofBlock>) {
  const stats = await resolveStats(block.stats, locale)
  const quotes = docs<Testimonial>(block.testimonials)
  if (!stats.length && !quotes.length) return null
  return (
    <Section title={block.heading}>
      {stats.length > 0 && <StatGrid stats={stats} />}
      {quotes.length > 0 && <Testimonials items={quotes} className={stats.length ? 'mt-16' : ''} />}
    </Section>
  )
}

export function Testimonials({ items, className }: { items: Testimonial[]; className?: string }) {
  return (
    <Grid cols={items.length > 1 ? 2 : 1} className={className}>
      {items.map((t) => (
        <Quote
          key={t.id}
          name={t.name}
          role={t.role ?? undefined}
          company={t.company}
          image={media(t.avatar)}
        >
          {t.quote}
        </Quote>
      ))}
    </Grid>
  )
}

export async function ProductShowcase({ block, locale }: BlockProps<PageProductShowcaseBlock>) {
  const products =
    block.mode === 'selected'
      ? docs<Product>(block.products).map((p) => ({
          ...p,
          logo: media(p.logo),
          preview: media(p.cardPreview),
        }))
      : (await getProducts(locale, { retired: false })).filter((p) => p.featured)
  if (!products.length) return null
  return (
    <Section title={block.heading} intro={block.intro}>
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <StaggerItem key={p.slug}>
            <ProductCard product={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  )
}

export async function ServicesOverview({ block, locale }: BlockProps<PageServicesOverviewBlock>) {
  const chosen = docs<Service>(block.services)
  const services = chosen.length ? chosen : await getServices(locale)
  if (!services.length) return null
  return (
    <Section title={block.heading} intro={block.intro} tone="subtle">
      <ServiceCards services={services} />
    </Section>
  )
}

/**
 * The service pillars (spec §8.7): summary, the main capabilities and our own products as proof.
 * Deliverables are on each pillar's page. The title link covers the card; product links sit above.
 */
export function ServiceCards({ services }: { services: Service[] }) {
  const t = useTranslations('services')
  return (
    <Grid cols={services.length % 3 === 0 ? 3 : 2}>
      {services.map((s) => {
        const capabilities = (s.capabilities ?? []).flatMap((c) => (c.text ? [c.text] : []))
        const proof = docs<Product>(s.relatedProducts)
        return (
          <Card key={s.id} variant="interactive" className="flex flex-col">
            <Icon name={s.icon} className="text-primary" />
            <CardTitle href={`/services/${s.slug}`} className="mt-4">
              {s.title}
            </CardTitle>
            <CardDescription>{s.summary}</CardDescription>
            {capabilities.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-fg">
                {capabilities.slice(0, 4).map((text) => (
                  <li key={text} className="flex gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                    {text}
                  </li>
                ))}
              </ul>
            )}
            {proof.length > 0 && (
              <p className="relative z-10 mt-4 text-sm text-fg-muted">
                {t('proof')}:{' '}
                {proof.map((p, i) => (
                  <Fragment key={p.slug}>
                    {i > 0 && ', '}
                    <Link
                      href={`/products/${p.slug}`}
                      className="font-medium text-fg underline underline-offset-4 hover:no-underline"
                    >
                      {p.name}
                    </Link>
                  </Fragment>
                ))}
              </p>
            )}
            <ArrowRight aria-hidden className="mt-auto size-4 pt-4 text-fg-muted" />
          </Card>
        )
      })}
    </Grid>
  )
}

function MemberLinks({ links, className }: { links: Team['links']; className?: string }) {
  if (!links?.length) return null
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-sm', className)}>
      {links.map((l) => (
        <li key={l.id ?? l.url}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener me"
            className="font-medium text-fg underline underline-offset-4 hover:no-underline"
          >
            {l.label || new URL(l.url).hostname}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Founders with a photo: a large portrait with their quote on it, the bio beside it. */
function FounderFeature({
  member: m,
  photo,
  label,
}: {
  member: Team
  photo: Media
  label: string
}) {
  return (
    <article className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div className="mx-auto w-full max-w-md lg:max-w-none">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-bg-subtle shadow-md">
          {/* Decorative: the name is the caption and the heading right next to it. */}
          <ResponsiveImage
            media={photo}
            decorative
            fill
            // The column stops at 480px once the container reaches its max width.
            sizes="(min-width: 1280px) 480px, (min-width: 1024px) 38vw, (min-width: 480px) 28rem, 100vw"
            className="object-cover"
          />
        </div>
        {m.quote && (
          <figure className="relative mx-4 -mt-20 rounded-lg border border-border bg-surface p-6 shadow-lg sm:mx-8">
            <QuoteMark aria-hidden className="size-7 text-primary" />
            <blockquote className="mt-3 font-display text-lg leading-relaxed text-pretty text-fg">
              {m.quote}
            </blockquote>
            <figcaption className="mt-4 text-sm font-medium text-fg-muted">{m.name}</figcaption>
          </figure>
        )}
      </div>
      <div className="min-w-0">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-fg-muted">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
          {label}
        </p>
        <h3 className="font-display text-3xl font-bold text-fg sm:text-4xl [&:not(:lang(hi))]:tracking-tight">
          {m.name}
        </h3>
        {m.role && <p className="mt-2 text-lg text-fg-muted">{m.role}</p>}
        {m.bio && (
          <div className="mt-6 space-y-4 text-lg text-pretty text-fg-muted">
            {m.bio
              .trim()
              .split(/\s*\n\s*\n\s*/)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        )}
        <MemberLinks links={m.links} className="mt-6 text-base" />
      </div>
    </article>
  )
}

export async function TeamBlock({ block, locale }: BlockProps<PageTeamBlock>) {
  const chosen = docs<Team>(block.members)
  const [members, t] = await Promise.all([
    chosen.length ? chosen : getTeam(locale),
    getTranslations('ui.team'),
  ])
  if (!members.length) return null
  const featured = members.flatMap((m) => {
    const photo = m.founder ? media(m.photo) : null
    return photo ? [{ member: m, photo }] : []
  })
  const rest = members.filter((m) => !featured.some((f) => f.member.id === m.id))
  return (
    <Section title={block.heading}>
      <div className="space-y-20">
        {featured.map((f) => (
          <FounderFeature key={f.member.id} {...f} label={t('aboutFounder')} />
        ))}
        {rest.length > 0 && (
          <ul className="grid gap-10 sm:grid-cols-2">
            {rest.map((m) => (
              <li key={m.id} className="flex gap-5">
                <Avatar name={m.name} image={media(m.photo)} size="lg" decorative />
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-fg">{m.name}</h3>
                  {m.role && <p className="text-sm text-fg-muted">{m.role}</p>}
                  {m.bio && <p className="mt-3 whitespace-pre-line text-fg-muted">{m.bio}</p>}
                  <MemberLinks links={m.links} className="mt-3" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}

export async function Latest({ block, locale }: BlockProps<PageLatestBlock>) {
  const [posts, changes, t] = await Promise.all([
    getPosts(locale, { limit: block.postsCount }),
    getChangelogFeed(locale, { limit: block.changelogCount }),
    getTranslations('ui.latest'),
  ])
  if (!posts.docs.length && !changes.length) return null
  return (
    <Section title={block.heading}>
      <div className="grid gap-12 lg:grid-cols-2">
        {posts.docs.length > 0 && (
          <div>
            <h3 lang={locale} className="font-display text-xl font-semibold text-fg">
              {t('posts')}
            </h3>
            <ul className="mt-6 space-y-6">
              {posts.docs.map((post) => (
                <li key={post.id}>
                  <Card variant="interactive">
                    {post.publishedAt && (
                      <p className="text-sm text-fg-muted">
                        {formatDate(locale, post.publishedAt)}
                      </p>
                    )}
                    <CardTitle as="h4" href={`/blog/${post.slug}`} className="mt-1">
                      {post.title}
                    </CardTitle>
                    {post.excerpt && <CardDescription>{post.excerpt}</CardDescription>}
                  </Card>
                </li>
              ))}
            </ul>
            <MoreLink href="/blog" lang={locale}>
              {t('allPosts')}
            </MoreLink>
          </div>
        )}
        {changes.length > 0 && (
          <div>
            <h3 lang={locale} className="font-display text-xl font-semibold text-fg">
              {t('changelog')}
            </h3>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {changes.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-4">
                  <time dateTime={item.date} className="w-full text-sm text-fg-muted tabular-nums">
                    {formatDate(locale, item.date)}
                  </time>
                  {item.product && <Badge tone="neutral">{item.product.name}</Badge>}
                  <span className="font-medium text-fg">
                    {item.kind === 'release' ? t('release', { version: item.version }) : item.title}
                  </span>
                </li>
              ))}
            </ul>
            <MoreLink href="/changelog" lang={locale}>
              {t('allChanges')}
            </MoreLink>
          </div>
        )}
      </div>
    </Section>
  )
}

function MoreLink({ href, lang, children }: { href: string; lang: string; children: string }) {
  return (
    <Link
      href={href}
      lang={lang}
      className="mt-6 inline-flex min-h-10 items-center gap-1.5 font-medium text-fg underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  )
}
