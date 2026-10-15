import { cva, type VariantProps } from 'class-variance-authority'
import { useTranslations } from 'next-intl'
import type { ComponentProps } from 'react'

import type { Product } from '@/payload-types'
import { cn } from '@/lib/cn'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border font-medium whitespace-nowrap [&_svg]:size-3.5',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-bg-subtle text-fg-muted',
        primary: 'border-primary/30 bg-primary/10 text-fg',
        accent: 'border-brand-accent/40 bg-brand-accent/15 text-fg',
        success: 'border-success/40 bg-success/10 text-fg',
        warning: 'border-warning/50 bg-warning/15 text-fg',
        danger: 'border-danger/40 bg-danger/10 text-fg',
        info: 'border-info/40 bg-info/10 text-fg',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
)

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

type Status = Product['status']
const STATUS_TONE: Record<Status, NonNullable<BadgeProps['tone']>> = {
  live: 'success',
  beta: 'info',
  'coming-soon': 'warning',
  retired: 'neutral',
}

/** Product lifecycle badge (spec §8.3) with a dot so status isn't conveyed by color alone. */
export function StatusBadge({
  status,
  ...props
}: Omit<BadgeProps, 'tone' | 'children'> & { status: Status }) {
  const t = useTranslations('ui.status')
  return (
    <Badge tone={STATUS_TONE[status]} {...props}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  )
}

type Platform = NonNullable<Product['platforms']>[number]

export function PlatformBadge({
  platform,
  ...props
}: Omit<BadgeProps, 'children'> & { platform: Platform }) {
  const t = useTranslations('ui.platform')
  return <Badge {...props}>{t(platform)}</Badge>
}
