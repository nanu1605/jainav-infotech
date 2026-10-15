import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Tone = 'info' | 'success' | 'warning' | 'danger'

// The icon sits on a solid status chip, so it meets contrast in both themes (light warning
// is too faint as a bare icon).
const TONES: Record<Tone, { icon: LucideIcon; box: string; chip: string }> = {
  info: { icon: Info, box: 'border-info/40 bg-info/10', chip: 'bg-info text-info-fg' },
  success: {
    icon: CircleCheck,
    box: 'border-success/40 bg-success/10',
    chip: 'bg-success text-success-fg',
  },
  warning: {
    icon: TriangleAlert,
    box: 'border-warning/50 bg-warning/10',
    chip: 'bg-warning text-warning-fg',
  },
  danger: {
    icon: CircleAlert,
    box: 'border-danger/40 bg-danger/10',
    chip: 'bg-danger text-danger-fg',
  },
}

export type CalloutProps = Omit<ComponentProps<'div'>, 'title'> & {
  tone?: Tone
  title?: ReactNode
}

/**
 * Highlighted note. Tone is carried by color, icon and a screen-reader prefix ("Warning:"),
 * never color alone. Static by default: pass `role="status"` or `role="alert"` for live messages.
 */
export function Callout({ tone = 'info', title, className, children, ...props }: CalloutProps) {
  const t = useTranslations('ui.callout')
  const { icon: Icon, box, chip } = TONES[tone]
  return (
    <div
      className={cn('flex gap-3 rounded-lg border p-4 text-sm text-fg', box, className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', chip)}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1 pt-0.5">
        <span className="sr-only">{t(tone)}: </span>
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-fg-muted">{children}</div>
      </div>
    </div>
  )
}
