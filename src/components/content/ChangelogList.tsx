import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/Badge'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { formatDate } from '@/lib/format'
import type { FeedItem } from '@/lib/queries'

import { RichText } from './RichText'

const TYPE_TONE = { new: 'success', improved: 'info', fixed: 'neutral' } as const

/**
 * Changelog entries and releases, grouped by month (spec §8.12). `showProduct` labels each item
 * with its product (the company-wide feed); product pages leave it off.
 */
export async function ChangelogList({
  items,
  locale,
  showProduct = false,
  headingLevel = 2,
}: {
  items: FeedItem[]
  locale: Locale
  showProduct?: boolean
  headingLevel?: 2 | 3
}) {
  const t = await getTranslations('ui.changelog')
  const months = new Map<string, FeedItem[]>()
  for (const item of items) {
    const month = formatDate(locale, item.date, { month: 'long', year: 'numeric' })
    months.set(month, [...(months.get(month) ?? []), item])
  }
  const MonthHeading = `h${headingLevel}` as const
  const ItemHeading = `h${headingLevel + 1}` as 'h3' | 'h4'

  return (
    <div className="space-y-12">
      {[...months].map(([month, entries]) => (
        <section key={month} aria-label={month}>
          <MonthHeading className="font-display text-lg font-semibold text-fg">
            {month}
          </MonthHeading>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {entries.map((item) => (
              <li
                key={item.id}
                className="grid gap-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
              >
                <time dateTime={item.date} className="text-sm text-fg-muted tabular-nums">
                  {formatDate(locale, item.date)}
                </time>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kind === 'release' ? (
                      <Badge tone="primary">
                        {item.channel === 'beta' ? t('beta') : t('release')}
                      </Badge>
                    ) : (
                      <Badge tone={TYPE_TONE[item.type]}>{t(item.type)}</Badge>
                    )}
                    {showProduct && item.product && (
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="text-sm font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                      >
                        {item.product.name}
                      </Link>
                    )}
                  </div>
                  <ItemHeading className="mt-2 font-semibold text-fg">
                    {item.kind === 'release' ? t('version', { version: item.version }) : item.title}
                  </ItemHeading>
                  {item.kind === 'release' && item.notes && (
                    <p className="mt-2 whitespace-pre-line text-fg-muted">{item.notes}</p>
                  )}
                  {item.kind === 'entry' && (
                    <RichText data={item.body} locale={locale} className="mt-2 text-fg-muted" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
