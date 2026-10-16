import type { Channel } from './releases'

type Button =
  | {
      type?: 'visit' | 'download' | 'buy' | 'demo' | 'contact' | null
      labelOverride?: string | null
      plan?: number | { name?: string | null; code?: string | null } | null
      channel?: Channel | null
      url?: string | null
    }
  | null
  | undefined

type Product = {
  slug: string
  status: 'live' | 'beta' | 'coming-soon' | 'retired'
  hostingMode: 'external' | 'hosted'
  externalUrl?: string | null
}

type Release = { version: string; sizeBytes?: number | null }

export type ResolvedButton = { label: string | null; href: string } & (
  | { kind: 'waitlist' }
  | { kind: 'visit'; external: true }
  | { kind: 'download'; version: string; sizeBytes: number | null }
  | { kind: 'buy'; plan: string | null; disabled: boolean }
  | { kind: 'demo'; external: true }
  | { kind: 'contact' }
)

/**
 * Spec §8.5 resolution order. `releases` holds the latest published release per channel; the
 * label is the editor's override (null → the component's default label for the kind).
 * Returns null when there is nothing to show (no button configured).
 */
export function resolveProductButton(
  button: Button,
  product: Product,
  ctx: {
    releases: Partial<Record<Channel, Release | null>>
    storeEnabled: boolean
    schedulerUrl?: string | null
  },
): ResolvedButton | null {
  const label = button?.labelOverride || null
  const waitlist = { kind: 'waitlist', label, href: `/products/${product.slug}#waitlist` } as const
  if (!button?.type) return product.status === 'coming-soon' ? waitlist : null
  if (product.status === 'coming-soon') return waitlist

  switch (button.type) {
    case 'visit':
      if (!product.externalUrl) return null
      return { kind: 'visit', label, href: `/go/${product.slug}`, external: true }
    case 'download': {
      const channel = button.channel ?? 'stable'
      const release = ctx.releases[channel]
      if (!release) return waitlist
      return {
        kind: 'download',
        label,
        href: `/api/v1/downloads/${product.slug}/latest?channel=${channel}`,
        version: release.version,
        sizeBytes: release.sizeBytes ?? null,
      }
    }
    case 'buy': {
      if (product.hostingMode !== 'hosted') return null
      const plan = typeof button.plan === 'object' ? button.plan : null
      return {
        kind: 'buy',
        label,
        href: `/products/${product.slug}/pricing${plan?.code ? `#plan-${plan.code}` : ''}`,
        plan: plan?.name ?? null,
        disabled: !ctx.storeEnabled,
      }
    }
    case 'demo': {
      const href = button.url || ctx.schedulerUrl
      // No scheduler configured yet: "Talk to us" still reaches a person.
      if (!href) return { kind: 'contact', label, href: `/contact?product=${product.slug}` }
      return { kind: 'demo', label, href, external: true }
    }
    case 'contact':
      return { kind: 'contact', label, href: `/contact?product=${product.slug}` }
  }
}
