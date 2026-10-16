import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

/** Loading placeholder: size it with className. Hidden from screen readers; pulses opacity only. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-hover motion-reduce:animate-none', className)}
      {...props}
    />
  )
}
