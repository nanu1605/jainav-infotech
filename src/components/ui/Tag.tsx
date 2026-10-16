import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export type TagProps = ComponentProps<'span'> & {
  /** Render the child (a Link, or a filter `<button aria-pressed>`) with tag styles. */
  asChild?: boolean
}

/**
 * Blog tag or filter chip. Links and buttons get a 40px target and hover state; a selected
 * filter is marked with `aria-pressed` (or `aria-current="page"` on a link), never color alone:
 * selected tags also turn bold, and callers can add a check icon.
 */
export function Tag({ asChild = false, className, ...props }: TagProps) {
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-fg-muted [&_svg]:size-3.5 [&_svg]:shrink-0',
        '[&:is(a,button)]:min-h-10 [&:is(a,button)]:px-4',
        '[&:is(a,button)]:transition-colors [&:is(a,button)]:duration-[var(--duration-fast)] [&:is(a,button)]:hover:border-border-strong [&:is(a,button)]:hover:text-fg',
        'disabled:pointer-events-none disabled:opacity-50',
        'aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold aria-pressed:text-fg',
        'aria-[current=page]:border-primary aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-fg',
        className,
      )}
      {...props}
    />
  )
}
