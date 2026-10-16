import { useTranslations } from 'next-intl'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export type SpinnerProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** Screen-reader text; defaults to "Loading". */
  label?: string
}

/**
 * Busy indicator with an accessible name. Static under reduced motion. It is not a live region: to
 * announce loading, keep a `role="status"` element mounted and change only its text. Inside a
 * button or next to a status that already says what's happening, pass `aria-hidden`.
 */
export function Spinner({ label, className, ...props }: SpinnerProps) {
  const t = useTranslations('ui.spinner')
  return (
    <span
      role="img"
      aria-label={label ?? t('loading')}
      className={cn('inline-flex size-5 text-fg-muted', className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="size-full animate-spin motion-reduce:animate-none"
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="3"
        />
        <path
          d="M21.5 12A9.5 9.5 0 0 0 12 2.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
