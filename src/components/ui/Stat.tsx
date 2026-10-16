import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type StatProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** A ReactNode so callers can pass a CountUp. */
  value: ReactNode
  label: ReactNode
  description?: ReactNode
}

export function Stat({ value, label, description, className, ...props }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <p className="font-display text-4xl leading-snug font-semibold text-fg tabular-nums sm:text-5xl">
        {value}
      </p>
      <p className="font-medium text-fg">{label}</p>
      {description && <p className="text-sm text-fg-muted">{description}</p>}
    </div>
  )
}
