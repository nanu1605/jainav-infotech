import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, Link } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { hasRole } from '@/access/roles'
import { previousMonth } from '@/lib/reports'

import { ReportDownloads } from './ReportDownloads'
import { UmamiLink } from './StatsInsights'

/**
 * /admin/reports (spec §10): the monthly CA report (Owner) and leads report (Owner, Support),
 * plus links to the insights. A custom view gets no template or auth check from Payload.
 */
export function ReportsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  if (!hasRole(req.user, 'owner', 'support')) redirect('/admin')
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      // Copied: React 19 refuses the read-only original (as Payload's own views do).
      visibleEntities={{
        collections: [...visibleEntities.collections],
        globals: [...visibleEntities.globals],
      }}
    >
      <Gutter>
        <h1 style={{ marginBlock: 24 }}>Reports</h1>
        <section style={{ display: 'grid', gap: 16, marginBottom: 40 }}>
          <h2>Monthly reports</h2>
          <p>
            Months follow India time. The CA report lists the month’s invoices and credit notes with
            a SAC-wise summary; credit notes are negative, so each column nets out. The leads report
            counts the month’s leads by type, product, status and marketing consent. Both are CSV
            files with a byte-order mark, so Excel opens Hindi text correctly.
          </p>
          <ReportDownloads defaultMonth={previousMonth()} ca={hasRole(req.user, 'owner')} />
        </section>
        <section style={{ display: 'grid', gap: 16 }}>
          <h2>Insights</h2>
          <p>
            <Link href="/admin/collections/daily-stats" prefetch={false}>
              Daily stats
            </Link>{' '}
            count /go/ link clicks and downloads on the server: the numbers of record, with 7- and
            30-day totals above the list. Page views and events are in Umami.
          </p>
          <p>
            <UmamiLink />
          </p>
        </section>
      </Gutter>
    </DefaultTemplate>
  )
}
