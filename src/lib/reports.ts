import 'server-only'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, type Payload, type PayloadHandler, type PayloadRequest } from 'payload'
import { z } from 'zod'

import { hasRole, type Role } from '@/access/roles'
import { toCsv } from '@/lib/csv'
import { istDate } from '@/lib/format'
import { istMonthStart } from '@/lib/licensing/dates'
import type { Invoice } from '@/payload-types'

/** Monthly reports for the CA and for leads (spec §10, §20 Phase 9). Business months are IST. */

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const monthQuery = z.object({ month: z.string().regex(MONTH) })

/** 'YYYY-MM' → the IST month as UTC instants [start, end). */
export function monthBounds(month: string): [Date, Date] {
  if (!MONTH.test(month)) throw new Error(`Not a month: ${month}`)
  const [year, mon] = month.split('-').map(Number) as [number, number]
  // Any instant well inside the month: istMonthStart finds its IST midnight on the 1st.
  const inside = new Date(Date.UTC(year, mon - 1, 15))
  return [istMonthStart(inside), istMonthStart(inside, 1)]
}

/** The IST month before `now`, as 'YYYY-MM' (the reports view's default). */
export const previousMonth = (now = new Date()) => istDate(istMonthStart(now, -1)).slice(0, 7)

/** Integer paise → rupees with exactly two decimals: 1 → "0.01", -99900 → "-999.00". */
export function rupees(paise: number): string {
  if (!Number.isSafeInteger(paise)) throw new Error(`Not whole paise: ${paise}`)
  const abs = Math.abs(paise)
  return `${paise < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

const AMOUNTS = ['taxable', 'cgst', 'sgst', 'igst', 'total'] as const
type Amounts = Record<(typeof AMOUNTS)[number], number>

export type CaRow = {
  kind: Invoice['kind']
  number: string
  issuedAt: string
  againstNumber: string | null
  againstIssuedAt: string | null
  buyer: Invoice['buyer']
  sacCode: string | null
  /** Signed paise: credit notes are negative, so every column nets out. */
  amounts: Amounts
}

/** Invoices and credit notes issued in the IST month, by issue time then number. */
export async function caReport(payload: Payload, month: string): Promise<CaRow[]> {
  const [start, end] = monthBounds(month)
  // ponytail: one query holds the month's invoices in memory; page through them past ~50k a month.
  const { docs } = await payload.find({
    collection: 'invoices',
    where: {
      and: [
        { issuedAt: { greater_than_equal: start.toISOString() } },
        { issuedAt: { less_than: end.toISOString() } },
      ],
    },
    sort: ['issuedAt', 'number'],
    select: {
      kind: true,
      number: true,
      issuedAt: true,
      originalInvoice: true,
      buyer: true,
      sacCode: true,
      totals: true,
    },
    populate: { invoices: { number: true, issuedAt: true } },
    pagination: false,
    depth: 1,
    overrideAccess: true,
  })
  return docs.map((doc) => {
    const original = typeof doc.originalInvoice === 'object' ? doc.originalInvoice : null
    // Credit notes store positive amounts, like invoices; the report gives them the minus sign.
    const sign = doc.kind === 'credit-note' ? -1 : 1
    return {
      kind: doc.kind,
      number: doc.number,
      issuedAt: doc.issuedAt,
      againstNumber: original?.number ?? null,
      againstIssuedAt: original?.issuedAt ?? null,
      buyer: doc.buyer,
      sacCode: doc.sacCode || null,
      amounts: Object.fromEntries(AMOUNTS.map((key) => [key, sign * doc.totals[key]])) as Amounts,
    }
  })
}

const NO_SAC = 'SAC not set'
const money = (amounts: Amounts) => AMOUNTS.map((key) => rupees(amounts[key]))
const zero = (): Amounts => ({ taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })

/** The CA's CSV: one line per document, then a SAC-wise summary that nets credit notes. */
export function caReportCsv(rows: CaRow[]): string {
  type Summary = { invoices: number; creditNotes: number; amounts: Amounts }
  const bySac = new Map<string, Summary>()
  const total: Summary = { invoices: 0, creditNotes: 0, amounts: zero() }
  for (const row of rows) {
    const sac = row.sacCode ?? NO_SAC
    const summary = bySac.get(sac) ?? { invoices: 0, creditNotes: 0, amounts: zero() }
    bySac.set(sac, summary)
    for (const s of [summary, total]) {
      if (row.kind === 'credit-note') s.creditNotes++
      else s.invoices++
      for (const key of AMOUNTS) s.amounts[key] += row.amounts[key]
    }
  }
  const summaryLine = (label: string, s: Summary) => [
    label,
    s.invoices,
    s.creditNotes,
    ...money(s.amounts),
  ]
  return toCsv([
    [
      'Type',
      'Number',
      'Date',
      'Against invoice',
      'Against invoice date',
      'Buyer',
      'Business name',
      'State',
      'State code',
      'GSTIN',
      'SAC',
      'Taxable',
      'CGST',
      'SGST',
      'IGST',
      'Total',
    ],
    ...rows.map((row) => [
      row.kind === 'credit-note' ? 'Credit note' : 'Invoice',
      row.number,
      istDate(new Date(row.issuedAt)),
      row.againstNumber,
      row.againstIssuedAt && istDate(new Date(row.againstIssuedAt)),
      row.buyer.name,
      row.buyer.businessName,
      row.buyer.stateName,
      row.buyer.stateCode,
      row.buyer.gstin,
      row.sacCode ?? NO_SAC,
      ...money(row.amounts),
    ]),
    [],
    ['SAC summary'],
    ['SAC', 'Invoices', 'Credit notes', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'],
    ...[...bySac.keys()].sort().map((sac) => summaryLine(sac, bySac.get(sac)!)),
    summaryLine('Total', total),
  ])
}

type LeadsRow = {
  type: string
  product: string | null
  leads: number
  new: number
  contacted: number
  qualified: number
  won: number
  lost: number
  spam: number
  consent: number
}

/** Leads created in the IST month, counted by type and product. */
export async function leadsReportCsv(payload: Payload, month: string): Promise<string> {
  const [start, end] = monthBounds(month)
  const db = (payload.db as unknown as PostgresAdapter).drizzle
  const { rows } = await db.execute(sql`
    SELECT l.type::text AS type, p.name AS product, COUNT(*)::int AS leads,
      COUNT(*) FILTER (WHERE l.status = 'new')::int AS "new",
      COUNT(*) FILTER (WHERE l.status = 'contacted')::int AS contacted,
      COUNT(*) FILTER (WHERE l.status = 'qualified')::int AS qualified,
      COUNT(*) FILTER (WHERE l.status = 'won')::int AS won,
      COUNT(*) FILTER (WHERE l.status = 'lost')::int AS lost,
      COUNT(*) FILTER (WHERE l.status = 'spam')::int AS spam,
      COUNT(*) FILTER (
        WHERE l.marketing_consent_given AND l.marketing_consent_withdrawn_at IS NULL
          AND l.unsubscribed_at IS NULL
      )::int AS consent
    FROM leads l LEFT JOIN products p ON p.id = l.product_id
    WHERE l.created_at >= ${start.toISOString()} AND l.created_at < ${end.toISOString()}
    GROUP BY l.type, p.id, p.name
    ORDER BY l.type, p.name NULLS FIRST
  `)
  return toCsv([
    [
      'Type',
      'Product',
      'Leads',
      'New',
      'Contacted',
      'Qualified',
      'Won',
      'Lost',
      'Spam',
      'Marketing consent',
    ],
    ...(rows as LeadsRow[]).map((r) => [
      r.type,
      r.product,
      r.leads,
      r.new,
      r.contacted,
      r.qualified,
      r.won,
      r.lost,
      r.spam,
      r.consent,
    ]),
  ])
}

function monthOf(req: PayloadRequest): string {
  const parsed = monthQuery.safeParse(req.query)
  if (!parsed.success) throw new APIError('Choose a month as YYYY-MM.', 400)
  return parsed.data.month
}

const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })

/** GET /api/reports/<name>?month=YYYY-MM for the given roles. Payload checks no access here. */
const reportEndpoint =
  (
    roles: Role[],
    name: string,
    build: (payload: Payload, month: string) => Promise<string>,
  ): PayloadHandler =>
  async (req) => {
    if (!hasRole(req.user, ...roles)) throw new APIError('You are not allowed to do this.', 403)
    const month = monthOf(req)
    return csvResponse(await build(req.payload, month), `${name}-${month}.csv`)
  }

/** Financial: Owner only (spec §9.3). */
export const caReportEndpoint = reportEndpoint(['owner'], 'ca-report', async (payload, month) =>
  caReportCsv(await caReport(payload, month)),
)
export const leadsReportEndpoint = reportEndpoint(
  ['owner', 'support'],
  'leads-report',
  leadsReportCsv,
)
