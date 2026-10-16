import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

import { fieldClassName } from './Input'

// Grows with its content where `field-sizing` is supported; resizable everywhere.
const textareaVariants = cva(
  [fieldClassName, 'max-h-96 resize-y field-sizing-content read-only:bg-bg-subtle'],
  {
    variants: {
      size: {
        sm: 'min-h-20 px-3 py-2 text-base sm:text-sm',
        md: 'min-h-28 px-3.5 py-2.5 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export type TextareaProps = ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>

export function Textarea({ className, size, ...props }: TextareaProps) {
  return <textarea className={cn(textareaVariants({ size }), className)} {...props} />
}
