import type { ReactNode } from 'react'

import { CountUp } from '@/components/motion/CountUp'
import { Stat } from '@/components/ui/Stat'
import type { Locale } from '@/i18n/routing'
import type { Stats as StatsField } from '@/payload-types'
import { getDownloadTotal } from '@/lib/queries'

export type ShownStat = { key: string; label: string; value: ReactNode }

/**
 * Stats with `source: downloads` show the real download total (spec §8.2). Only real numbers:
 * a downloads stat with no downloads yet is left out.
 */
export async function resolveStats(
  stats: StatsField | null | undefined,
  locale: Locale,
): Promise<ShownStat[]> {
  const total = stats?.some((s) => s.source === 'downloads') ? await getDownloadTotal() : 0
  return (stats ?? []).flatMap((s, i): ShownStat[] => {
    const key = s.id ?? String(i)
    if (s.source === 'downloads')
      return total > 0 && s.label
        ? [{ key, label: s.label, value: <CountUp value={total} locale={locale} /> }]
        : []
    return s.value && s.label ? [{ key, label: s.label, value: s.value }] : []
  })
}

export function StatGrid({ stats }: { stats: ShownStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
      {stats.map((s) => (
        <Stat key={s.key} value={s.value} label={s.label} />
      ))}
    </div>
  )
}
