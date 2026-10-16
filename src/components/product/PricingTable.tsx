import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Plan } from '@/payload-types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { getGstPricing } from '@/lib/queries'
import type { LoadedProduct } from '@/lib/product'

type Tier = {
  key: string
  name: string
  description?: string | null
  price: string
  period?: string
  /** "incl. GST" (or "+ GST") under a paid price while GST is charged (spec §11.1). */
  taxNote?: string
  features: string[]
  highlight?: boolean | null
  action?: { label: string; href: string | null; note?: string }
}

/**
 * Pricing tiers. Hosted products show their active plans (spec §11.1, INR only while
 * international sales are off): a free plan offers the download, paid plans "Buy", disabled with
 * "Available soon" until the store opens. External products pass manual tiers.
 */
export async function PricingTable({ tiers, level = 3 }: { tiers: Tier[]; level?: 2 | 3 }) {
  const Heading = `h${level}` as const
  const t = await getTranslations('ui.pricing')
  if (!tiers.length) return null
  return (
    <ul
      className={cn(
        'grid gap-6',
        tiers.length > 1 && 'md:grid-cols-2',
        tiers.length > 2 && 'lg:grid-cols-3',
      )}
    >
      {tiers.map((tier) => (
        <li
          key={tier.key}
          id={`plan-${tier.key}`}
          className={cn(
            'relative flex scroll-mt-32 flex-col rounded-xl border bg-surface p-8',
            tier.highlight ? 'border-primary shadow-lg' : 'border-border shadow-sm',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Heading className="font-display text-xl font-semibold text-fg">{tier.name}</Heading>
            {tier.highlight && <Badge tone="primary">{t('recommended')}</Badge>}
          </div>
          {tier.description && <p className="mt-2 text-sm text-fg-muted">{tier.description}</p>}
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold text-fg tabular-nums">
              {tier.price}
            </span>
            {tier.period && <span className="text-sm text-fg-muted">{tier.period}</span>}
          </p>
          {tier.taxNote && <p className="mt-1 text-xs text-fg-muted">{tier.taxNote}</p>}
          {tier.features.length > 0 && (
            <ul className="mt-6 space-y-3 text-sm">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-fg">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          {tier.action && (
            <div className="mt-8 flex flex-col gap-1.5 pt-2 [&>*:first-child]:w-full">
              {tier.action.href ? (
                <Button asChild variant={tier.highlight ? 'primary' : 'secondary'} size="lg">
                  {/^https?:/.test(tier.action.href) || tier.action.href.startsWith('/api/') ? (
                    <a href={tier.action.href}>{tier.action.label}</a>
                  ) : (
                    <Link href={tier.action.href}>{tier.action.label}</Link>
                  )}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="secondary"
                  aria-disabled
                  aria-describedby={`note-${tier.key}`}
                >
                  {tier.action.label}
                </Button>
              )}
              {tier.action.note && (
                <p id={`note-${tier.key}`} className="text-center text-xs text-fg-muted">
                  {tier.action.note}
                </p>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Tiers from a hosted product's plans. */
export async function planTiers(loaded: LoadedProduct, locale: Locale): Promise<Tier[]> {
  const [t, gst] = await Promise.all([getTranslations('ui.pricing'), getGstPricing()])
  const { product, plans, latest, settings, buttons } = loaded
  // The same build the product's own Download button offers (its channel), else any build.
  const download =
    buttons.find((b) => b.kind === 'download')?.href ??
    (latest.stable && `/api/v1/downloads/${product.slug}/latest?channel=stable`) ??
    (latest.beta && `/api/v1/downloads/${product.slug}/latest?channel=beta`)
  // #waitlist only exists on the overview when a button resolves to the waitlist.
  const waitlist = buttons.some((b) => b.kind === 'waitlist')
    ? `/products/${product.slug}#waitlist`
    : `/contact?product=${product.slug}`
  const period = (p: Plan) =>
    p.billing === 'yearly' ? t('perYear') : p.billing === 'monthly' ? t('perMonth') : t('oneTime')
  return plans.map((plan): Tier => {
    const free = (plan.priceINR ?? 0) === 0
    return {
      key: plan.code,
      name: plan.name ?? plan.code,
      description: plan.description,
      price: formatINR(locale, plan.priceINR ?? 0),
      period: free ? undefined : period(plan),
      taxNote: free || !gst ? undefined : gst === 'included' ? t('inclGst') : t('plusGst'),
      features: (plan.features ?? []).flatMap((f) => (f.text ? [f.text] : [])),
      highlight: plan.highlight,
      action: free
        ? download
          ? { label: t('downloadFree'), href: download }
          : { label: t('waitlist'), href: waitlist }
        : settings.storeEnabled
          ? {
              label: t('buy', { plan: plan.name ?? '' }),
              href: `/checkout/${product.slug}/${plan.code}`,
            }
          : { label: t('buy', { plan: plan.name ?? '' }), href: null, note: t('soon') },
    }
  })
}
