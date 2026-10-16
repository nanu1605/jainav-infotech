import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

export const cardVariants = cva('relative rounded-lg border border-border p-6 text-fg', {
  variants: {
    variant: {
      default: 'bg-surface',
      raised: 'bg-surface-raised shadow-md',
      interactive: [
        'bg-surface-raised shadow-sm transition-transform duration-[var(--duration-base)] ease-out',
        'hover:-translate-y-1 motion-reduce:hover:translate-y-0',
        // The deeper shadow fades in on a pseudo-element: only transform and opacity animate.
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 after:shadow-lg',
        'after:transition-opacity after:duration-[var(--duration-base)] hover:after:opacity-100',
        // The stretched CardTitle link draws its focus ring around the whole card.
        'outline-offset-2 outline-ring has-[[data-card-link]:focus-visible]:outline-2',
      ],
    },
  },
  defaultVariants: { variant: 'default' },
})

export type CardProps = ComponentProps<'div'> & VariantProps<typeof cardVariants>

/**
 * Surface container. For a clickable card use `variant="interactive"` with a `CardTitle href`:
 * the title link stretches over the card, so other controls inside need `relative z-10`.
 */
export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />
}

type CardTitleProps = ComponentProps<'h3'> & {
  as?: 'h2' | 'h3' | 'h4'
  /** Makes the whole card a link (pair with `variant="interactive"`). */
  href?: string
}

export function CardTitle({
  as: Heading = 'h3',
  href,
  className,
  children,
  ...props
}: CardTitleProps) {
  return (
    <Heading
      className={cn('font-display text-lg leading-snug font-semibold text-fg', className)}
      {...props}
    >
      {href ? (
        <Link
          href={href}
          data-card-link
          className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
        >
          {children}
        </Link>
      ) : (
        children
      )}
    </Heading>
  )
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('mt-2 text-sm text-fg-muted', className)} {...props} />
}
