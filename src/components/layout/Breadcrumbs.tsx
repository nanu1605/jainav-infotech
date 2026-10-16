import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/cn'

export type BreadcrumbsProps = {
  /** Root first; the last item is the current page and is not linked. */
  items: { label: string; href?: string }[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const t = useTranslations('ui.breadcrumbs')
  if (items.length === 0) return null

  return (
    <nav aria-label={t('label')} className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-fg-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${i}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />}
              {last || !item.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('min-w-0 break-words', last && 'font-medium text-fg')}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="min-w-0 rounded-sm break-words underline-offset-4 transition-colors duration-(--duration-fast) hover:text-fg hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
