import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** A lucide icon element, e.g. `<Inbox />`. */
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Usually a Button. */
  action?: ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-border-strong/50 px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          aria-hidden
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-bg-subtle text-fg-subtle [&_svg]:size-6"
        >
          {icon}
        </span>
      )}
      <p className="font-display text-lg leading-snug font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
