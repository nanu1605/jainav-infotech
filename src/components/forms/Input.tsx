import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** Shared by Input, Textarea and Select: 3:1 border, focus ring, invalid and disabled states. */
export const fieldClassName = [
  'w-full min-w-0 rounded-md border border-border-strong bg-surface text-fg shadow-sm',
  'placeholder:text-fg-subtle',
  'transition-[border-color] duration-[var(--duration-fast)] ease-out',
  'focus-visible:border-ring focus-visible:outline-offset-0',
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger',
  'disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:opacity-50',
].join(' ')

// 16px text on phones so iOS doesn't zoom into the field on focus.
export const inputVariants = cva(fieldClassName, {
  variants: {
    size: {
      sm: 'h-9 px-3 text-base sm:text-sm',
      md: 'h-11 px-3.5 text-base',
    },
  },
  defaultVariants: { size: 'md' },
})

export type InputProps = Omit<ComponentProps<'input'>, 'size'> &
  VariantProps<typeof inputVariants> & {
    /** Decorative icon inside the start of the field. */
    leadingIcon?: ReactNode
  }

export function Input({ className, size, leadingIcon, ...props }: InputProps) {
  const input = (
    <input
      className={cn(
        inputVariants({ size }),
        'read-only:bg-bg-subtle',
        leadingIcon && 'ps-10',
        className,
      )}
      {...props}
    />
  )
  if (!leadingIcon) return input
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 flex w-10 items-center justify-center text-fg-subtle [&_svg]:size-4"
      >
        {leadingIcon}
      </span>
      {input}
    </div>
  )
}
