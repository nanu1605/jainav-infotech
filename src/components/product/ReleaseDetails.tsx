import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Tracked } from '@/components/Tracked'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Locale } from '@/i18n/routing'
import type { Release } from '@/payload-types'
import { formatBytes, formatDate } from '@/lib/format'

/**
 * One release's facts (spec §12.5): version, date, size, SHA-256, minimum OS and a download link
 * through the counting endpoint.
 */
export async function ReleaseDetails({
  release,
  locale,
  href,
}: {
  release: Release
  locale: Locale
  /** Download URL; defaults to this release's counting endpoint. */
  href?: string
}) {
  const t = await getTranslations('ui.release')
  const facts = [
    [t('released'), formatDate(locale, release.releasedAt, { dateStyle: 'long' })],
    [t('size'), release.sizeBytes ? formatBytes(locale, release.sizeBytes) : null],
    [t('minOs'), release.minOs],
  ].filter((f): f is [string, string] => !!f[1])

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-2xl font-semibold text-fg tabular-nums">
          {t('version', { version: release.version })}
        </p>
        {release.channel === 'beta' && <Badge tone="info">{t('beta')}</Badge>}
      </div>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-fg-muted">{label}</dt>
            <dd className="mt-0.5 font-medium text-fg tabular-nums">{value}</dd>
          </div>
        ))}
        {release.sha256 && (
          <div className="sm:col-span-3">
            <dt className="text-fg-muted">{t('sha256')}</dt>
            <dd className="mt-0.5 font-mono text-xs break-all text-fg">{release.sha256}</dd>
          </div>
        )}
      </dl>
      <Tracked event="download" data={{ version: release.version }}>
        <Button asChild size="lg" className="mt-8">
          <a href={href ?? `/api/v1/downloads/release/${release.id}`}>
            <Download aria-hidden />
            {t('download')}
          </a>
        </Button>
      </Tracked>
    </div>
  )
}
