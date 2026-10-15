import type { VariantProps } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

import { inputVariants } from './Input'

export type SelectProps = Omit<ComponentProps<'select'>, 'size'> &
  VariantProps<typeof inputVariants>

/** Native <select> (best keyboard, screen reader and mobile picker support) with token styling. */
export function Select({ className, size, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(inputVariants({ size }), 'cursor-pointer appearance-none pe-10', className)}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  )
}
