import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export const stackVariants = cva('flex', {
  variants: {
    // Rows wrap so longer Hindi labels move to the next line instead of overflowing.
    direction: { col: 'flex-col', row: 'flex-row flex-wrap' },
    gap: { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-10' },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
  },
  defaultVariants: { direction: 'col', gap: 'md' },
})

export type StackProps = ComponentProps<'div'> & VariantProps<typeof stackVariants>

export function Stack({ direction, gap, align, className, ...props }: StackProps) {
  return <div className={cn(stackVariants({ direction, gap, align }), className)} {...props} />
}
