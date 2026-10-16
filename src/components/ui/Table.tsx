import { useId, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type TableProps = ComponentProps<'table'> & {
  /** Required: names the table and its scroll region for screen readers. */
  caption: ReactNode
}

/**
 * Semantic table (write `thead`/`tbody`/`th scope`/`td` as children). Wide tables scroll sideways
 * inside a focusable region, so keyboard users can scroll it too.
 */
export function Table({ caption, className, children, ...props }: TableProps) {
  const captionId = useId()
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border bg-surface"
    >
      <table
        className={cn(
          'w-full border-collapse text-start text-sm',
          '[&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:font-semibold [&_th]:text-fg',
          '[&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-fg-muted',
          '[&_thead_th]:border-b [&_thead_th]:border-border [&_thead_th]:bg-bg-subtle [&_thead_th]:whitespace-nowrap',
          '[&_tbody_tr]:border-b [&_tbody_tr]:border-border [&_tbody_tr:last-child]:border-0 [&_tbody_th]:align-top',
          className,
        )}
        {...props}
      >
        <caption id={captionId} className="px-4 py-3 text-start font-semibold text-fg">
          {caption}
        </caption>
        {children}
      </table>
    </div>
  )
}
