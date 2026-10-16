import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

/** Press feedback (spec §14): a slight shrink while held, on `scale` only; none with reduced motion. */
const PRESS = 'motion-safe:active:scale-98'

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap select-none',
    'transition-[background-color,color,border-color,box-shadow,opacity,scale] duration-[var(--duration-fast)] ease-out',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-[1.1em] [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: ['bg-primary text-primary-fg shadow-sm hover:bg-primary-hover', PRESS],
        secondary: ['border border-border-strong bg-surface text-fg hover:bg-hover', PRESS],
        ghost: ['text-fg hover:bg-hover', PRESS],
        link: 'text-fg underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 rounded-md px-3 text-sm',
        md: 'h-11 rounded-md px-5 text-sm',
        lg: 'h-12 rounded-lg px-6 text-base',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Link) with button styles instead of a <button>. */
    asChild?: boolean
  }

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      // Default to type="button" so buttons never submit a surrounding form by accident.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
