import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const COLS = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const

export type GridProps = ComponentProps<'div'> & { cols?: keyof typeof COLS }

/** Responsive grid: one column on phones, `cols` from large screens. */
export function Grid({ cols = 3, className, ...props }: GridProps) {
  return <div className={cn('grid grid-cols-1 gap-6 lg:gap-8', COLS[cols], className)} {...props} />
}
