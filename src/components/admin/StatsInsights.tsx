import type { BeforeListTableServerProps } from 'payload'

import { statsInsights, type StatKind } from '@/lib/stats'

const KINDS: { kind: StatKind; label: string }[] = [
  { kind: 'go-click', label: 'Link clicks (/go/)' },
  { kind: 'download', label: 'Downloads' },
]

const UMAMI_URL = process.env.NEXT_PUBLIC_UMAMI_URL

/** Page views and events live in Umami (spec §17). */
export function UmamiLink() {
  if (!UMAMI_URL) return <>Umami is not configured.</>
  return (
    <a href={UMAMI_URL} target="_blank" rel="noreferrer">
      Open Umami
    </a>
  )
}

const cell = { padding: '4px 12px 4px 0', textAlign: 'left' } as const
const number = { ...cell, textAlign: 'right' } as const

/** Above the daily-stats list (spec §10 Insights): 7- and 30-day totals and the top keys. */
export async function StatsInsights({ payload }: BeforeListTableServerProps) {
  const rows = await statsInsights(payload)
  return (
    <section style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40 }}>
        {KINDS.map(({ kind, label }) => {
          const top = rows.filter((row) => row.kind === kind)
          return (
            <table key={kind} style={{ borderCollapse: 'collapse' }}>
              <caption style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 8 }}>
                {label}
              </caption>
              <thead>
                <tr>
                  <th style={cell}>Top keys (30 days)</th>
                  <th style={number}>7 days</th>
                  <th style={number}>30 days</th>
                </tr>
              </thead>
              <tbody>
                {top.length === 0 && (
                  <tr>
                    <td style={cell} colSpan={3}>
                      Nothing in the last 30 days.
                    </td>
                  </tr>
                )}
                {top.map((row) => (
                  <tr key={row.key}>
                    <td style={cell}>{row.key}</td>
                    <td style={number}>{row.last7}</td>
                    <td style={number}>{row.last30}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th style={cell}>All keys</th>
                  <th style={number}>{top[0]?.total7 ?? 0}</th>
                  <th style={number}>{top[0]?.total30 ?? 0}</th>
                </tr>
              </tfoot>
            </table>
          )
        })}
      </div>
      <p style={{ margin: 0 }}>
        Days are India time, today included. <UmamiLink />
      </p>
    </section>
  )
}
