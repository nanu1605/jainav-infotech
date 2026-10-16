import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode }

/** Native checkbox: 20px box, the whole ≥40px row is the label. */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex min-h-10 cursor-pointer items-start gap-3 py-2 text-sm text-fg',
        'has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      {/* 1lh tall so the box centres on the first line of a wrapping label, in any script. */}
      <span className="flex h-[1lh] shrink-0 items-center">
        <input type="checkbox" className="size-5 cursor-[inherit] accent-primary" {...props} />
      </span>
      <span className="min-w-0">{label}</span>
    </label>
  )
}
