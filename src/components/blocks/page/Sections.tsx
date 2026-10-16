import { ArrowRight, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Fragment } from 'react'

import { Icon } from '@/components/content/Icon'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { RichText } from '@/components/content/RichText'
import { Grid } from '@/components/layout/Grid'
import { Section } from '@/components/layout/Section'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { ProductCard } from '@/components/product/ProductCard'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Quote } from '@/components/ui/Quote'
import { Steps } from '@/components/ui/Steps'
import { Link } from '@/i18n/navigation'
import type {
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
      ? docs<Product>(block.products).map((p) => ({ ...p, logo: media(p.logo) }))
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

export async function TeamBlock({ block, locale }: BlockProps<PageTeamBlock>) {
  const chosen = docs<Team>(block.members)
  const members = chosen.length ? chosen : await getTeam(locale)
  if (!members.length) return null
  return (
    <Section title={block.heading}>
      <ul className="grid gap-10 sm:grid-cols-2">
        {members.map((m) => (
          <li key={m.id} className="flex gap-5">
            <Avatar name={m.name} image={media(m.photo)} size="lg" decorative />
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold text-fg">{m.name}</h3>
              {m.role && <p className="text-sm text-fg-muted">{m.role}</p>}
              {m.bio && <p className="mt-3 text-fg-muted">{m.bio}</p>}
              {!!m.links?.length && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {m.links.map((l) => (
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
              )}
            </div>
          </li>
        ))}
      </ul>
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
