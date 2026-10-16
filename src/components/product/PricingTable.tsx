import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Plan } from '@/payload-types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { LoadedProduct } from '@/lib/product'

type Tier = {
  key: string
  name: string
  description?: string | null
  price: string
  period?: string
  features: string[]
  highlight?: boolean | null
  action?: { label: string; href: string | null; note?: string }
}

/**
 * Pricing tiers. Hosted products show their active plans (spec §11.1, INR only while
 * international sales are off): a free plan offers the download, paid plans "Buy", disabled with
 * "Available soon" until the store opens. External products pass manual tiers.
 */
export async function PricingTable({ tiers }: { tiers: Tier[] }) {
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
            <h3 className="font-display text-xl font-semibold text-fg">{tier.name}</h3>
            {tier.highlight && <Badge tone="primary">{t('recommended')}</Badge>}
          </div>
          {tier.description && <p className="mt-2 text-sm text-fg-muted">{tier.description}</p>}
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold text-fg tabular-nums">
              {tier.price}
            </span>
            {tier.period && <span className="text-sm text-fg-muted">{tier.period}</span>}
          </p>
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
  const t = await getTranslations('ui.pricing')
  const { product, plans, latest, settings } = loaded
  const period = (p: Plan) =>
    p.billing === 'yearly' ? t('perYear') : p.billing === 'monthly' ? t('perMonth') : t('oneTime')
  return plans.map((plan): Tier => {
    const free = (plan.priceINR ?? 0) === 0
    const download = latest.stable && `/api/v1/downloads/${product.slug}/latest?channel=stable`
    return {
      key: plan.code,
      name: plan.name ?? plan.code,
      description: plan.description,
      price: free ? t('free') : formatINR(locale, plan.priceINR ?? 0),
      period: free ? undefined : period(plan),
      features: (plan.features ?? []).flatMap((f) => (f.text ? [f.text] : [])),
      highlight: plan.highlight,
      action: free
        ? download
          ? { label: t('downloadFree'), href: download }
          : { label: t('waitlist'), href: `/products/${product.slug}#waitlist` }
        : settings.storeEnabled
          ? {
              label: t('buy', { plan: plan.name ?? '' }),
              href: `/checkout/${product.slug}/${plan.code}`,
            }
          : { label: t('buy', { plan: plan.name ?? '' }), href: null, note: t('soon') },
    }
  })
}
