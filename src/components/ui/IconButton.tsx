import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md',
    'transition-[background-color,color,border-color] duration-[var(--duration-fast)] ease-out',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-fg-muted hover:bg-hover hover:text-fg',
        secondary: 'border border-border-strong bg-surface text-fg hover:bg-hover',
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
      },
      size: {
        sm: 'size-9 [&_svg]:size-4',
        md: 'size-10 [&_svg]:size-5',
        lg: 'size-12 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export type IconButtonProps = ComponentProps<'button'> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: icon-only controls need an accessible name. */
    label: string
    asChild?: boolean
  }

export function IconButton({
  className,
  variant,
  size,
  label,
  asChild = false,
  type,
  ...props
}: IconButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : (type ?? 'button')}
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
