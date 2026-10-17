/**
 * Phase 9 reports (spec §10, §20 Phase 9): the monthly CA report reconciles with orders and credit
 * notes, IST month boundaries, the leads report, role checks, and the daily-stats insights.
 * Fixtures sit in 2023–2024 months that no other suite writes to.
 */
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { REST_GET } from '@payloadcms/next/routes'
import {
  createLocalReq,
  getPayload,
  type Payload,
  type PayloadHandler,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { monthBounds } from '@/lib/reports'
import { statsInsights } from '@/lib/stats'
import type { Invoice, Order, User } from '@/payload-types'
import config from '@/payload.config'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

let payload: Payload
const tag = Date.now().toString(36).slice(-6)
const run = `rp${tag}`
const DOMAIN = '@reports.test'
const KEY = 'reports-test-'
const db = () => (payload.db as unknown as PostgresAdapter).drizzle
const users: Record<'owner' | 'support' | 'editor', User> = {} as never
const ids: { product?: number; plan?: number; customer?: number } = {}
const invoices: Record<string, Invoice> = {}
const orders: Record<string, Order> = {}

type Tax = {
  mode: 'cgst_sgst' | 'igst' | 'none'
  taxable: number
  cgst: number
  sgst: number
  igst: number
}
// ₹999 incl. 18% GST: taxable 846.61, tax 152.39 split 76.20 + 76.19 (spec §11.4).
const MP: Tax = { mode: 'cgst_sgst', taxable: 84_661, cgst: 7_620, sgst: 7_619, igst: 0 }
const GJ: Tax = { mode: 'igst', taxable: 84_661, cgst: 0, sgst: 0, igst: 15_239 }
const total = (t: Tax) => t.taxable + t.cgst + t.sgst + t.igst

type Buyer = {
  name: string
  businessName?: string
  stateCode: string
  stateName: string
  gstin?: string
}
const PRIYA: Buyer = { name: 'Priya Sharma', stateCode: '23', stateName: 'Madhya Pradesh' }
const RAVI: Buyer = {
  name: 'Ravi Patel',
  businessName: 'Patel Traders',
  stateCode: '24',
  stateName: 'Gujarat',
  gstin: '24AAACP1234A1Z5',
}
const EVIL: Buyer = {
  name: '=HYPERLINK("http://evil")',
  stateCode: '23',
  stateName: 'Madhya Pradesh',
}

async function cleanup() {
  const like = `%${DOMAIN}`
  await db().execute(sql`
    UPDATE orders SET invoice_id = NULL WHERE billing_email LIKE ${like}`)
  await db().execute(sql`DELETE FROM invoices WHERE buyer_email LIKE ${like}`)
  await db().execute(sql`DELETE FROM orders WHERE billing_email LIKE ${like}`)
  await db().execute(sql`DELETE FROM customers WHERE email LIKE ${like}`)
  await db().execute(sql`DELETE FROM leads WHERE email LIKE ${like}`)
  await db().execute(sql`DELETE FROM daily_stats WHERE key LIKE ${`${KEY}%`}`)
}

/** A paid order and its invoice, as fulfilment writes them. */
async function sale(
  name: string,
  issuedAt: string,
  tax: Tax,
  buyer: Buyer,
  {
    status = 'paid',
    amountRefunded = 0,
    sacCode = '998431',
  }: { status?: Order['status']; amountRefunded?: number; sacCode?: string | null } = {},
) {
  const amount = total(tax)
  const billing = { email: `${name}.${run}${DOMAIN}`, country: 'IN', ...buyer }
  const data: RequiredDataFromCollectionSlug<'orders'> = {
    orderNumber: `${run}-${name}`,
    customer: ids.customer!,
    status,
    amountRefunded,
    paidAt: issuedAt,
    locale: 'en',
    items: [
      { product: ids.product!, plan: ids.plan!, qty: 1, unitPrice: amount, description: 'App' },
    ],
    currency: 'INR',
    subtotal: amount,
    discount: 0,
    total: amount,
    tax: { ...tax, ratePercent: tax.mode === 'none' ? 0 : 18 },
    billing,
    acceptance: { termsVersion: '1.0', eulaVersion: '1.0', at: issuedAt },
  }
  const order = await payload.create({ collection: 'orders', data, depth: 0, overrideAccess: true })
  orders[name] = order
  invoices[name] = await document(name, 'invoice', order, issuedAt, tax, sacCode)
  return order
}

async function document(
  name: string,
  kind: Invoice['kind'],
  order: Order,
  issuedAt: string,
  tax: Tax,
  sacCode: string | null,
  originalInvoice?: Invoice,
) {
  const amount = total(tax)
  const data: RequiredDataFromCollectionSlug<'invoices'> = {
    number: `${kind === 'invoice' ? 'I' : 'C'}${tag}-${name}`,
    kind,
    financialYear: '23-24',
    order: order.id,
    issuedAt,
    originalInvoice: originalInvoice?.id,
    seller: { legalName: 'Jainav Infotech', stateCode: '23', stateName: 'Madhya Pradesh' },
    buyer: (({ name, businessName, email, country, stateCode, stateName, gstin }) => ({
      name,
      businessName,
      email,
      country,
      stateCode,
      stateName,
      gstin,
    }))(order.billing),
    taxMode: tax.mode,
    sacCode,
    currency: 'INR',
    lines: [
      {
        description: 'App',
        qty: 1,
        unitPrice: amount,
        discount: 0,
        ratePercent: tax.mode === 'none' ? 0 : 18,
        ...tax,
        total: amount,
      },
    ],
    totals: { subtotal: amount, discount: 0, ...tax, total: amount },
  }
  const doc = await payload.create({ collection: 'invoices', data, depth: 0, overrideAccess: true })
  invoices[name] = doc
  return doc
}

const creditNote = (name: string, of: string, issuedAt: string, tax: Tax) =>
  document(
    name,
    'credit-note',
    orders[of]!,
    issuedAt,
    tax,
    invoices[of]!.sacCode ?? null,
    invoices[of],
  )

const endpoint = (path: string): PayloadHandler =>
  payload.config.endpoints.find((e) => e.path === path && e.method === 'get')!.handler

async function call(path: string, query: Record<string, unknown>, user?: User) {
  const req = await createLocalReq(user ? { user: { ...user, collection: 'users' } } : {}, payload)
  req.query = query
  return endpoint(path)(req)
}

async function csvLines(res: Response) {
  expect(res.status).toBe(200)
  const bytes = new Uint8Array(await res.arrayBuffer())
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  return new TextDecoder().decode(bytes.slice(3)).trimEnd().split('\r\n')
}

const caLines = async (month: string) => csvLines(await call('/reports/ca', { month }, users.owner))
const leadsLines = async (month: string) =>
  csvLines(await call('/reports/leads', { month }, users.owner))
const totalRow = (lines: string[]) => lines.at(-1)!.split(',')

beforeAll(async () => {
  payload = await getPayload({ config })
  await cleanup()
  for (const role of ['owner', 'support', 'editor'] as const) {
    users[role] = await payload.create({
      collection: 'users',
      data: { email: `${role}-${run}@jainav.test`, password: `pw-${run}`, roles: [role] },
      depth: 0,
      overrideAccess: true,
    })
  }
  const context = { disableRevalidate: true }
  const product = await payload.create({
    collection: 'products',
    data: {
      name: `Reports test ${run}`,
      slug: `${run}-app`,
      tagline: 'Tagline',
      type: 'desktop',
      category: 'other',
      status: 'live',
      hostingMode: 'hosted',
      accentColor: '#123456',
      primaryButton: { type: 'contact' },
      hiStatus: 'missing',
      _status: 'published',
    },
    depth: 0,
    overrideAccess: true,
    context,
  })
  ids.product = product.id
  ids.plan = (
    await payload.create({
      collection: 'plans',
      data: {
        product: product.id,
        code: 'pro',
        name: 'Pro',
        billing: 'one_time',
        priceINR: 99_900,
        active: true,
      },
      depth: 0,
      overrideAccess: true,
      context,
    })
  ).id
  ids.customer = (
    await payload.create({
      collection: 'customers',
      data: { email: `buyer.${run}${DOMAIN}`, preferredLocale: 'en', status: 'active' },
      depth: 0,
      overrideAccess: true,
    })
  ).id

  // October 2023: A fully refunded, B partly, C paid at 23:59 IST on the 31st (no SAC, no GST).
  await sale('A', '2023-10-05T04:30:00.000Z', MP, PRIYA, {
    status: 'refunded',
    amountRefunded: total(MP),
  })
  await sale('B', '2023-10-10T04:30:00.000Z', GJ, RAVI, {
    status: 'partially-refunded',
    amountRefunded: 40_000,
  })
  const none = (paise: number): Tax => ({ mode: 'none', taxable: paise, cgst: 0, sgst: 0, igst: 0 })
  await sale('C', '2023-10-31T18:29:00.000Z', none(59_001), EVIL, {
    status: 'partially-refunded',
    amountRefunded: 1,
    sacCode: null,
  })
  // ₹400 of B's ₹999 back: taxable 338.98 + IGST 61.02.
  await creditNote('CB', 'B', '2023-10-20T04:30:00.000Z', {
    mode: 'igst',
    taxable: 33_898,
    cgst: 0,
    sgst: 0,
    igst: 6_102,
  })
  await creditNote('CA', 'A', '2023-10-25T04:30:00.000Z', MP)
  // November 2023: D at 00:01 IST on the 1st (still 31 Oct in UTC); a 1-paisa credit note on C.
  await sale('D', '2023-10-31T18:31:00.000Z', MP, PRIYA)
  await creditNote('CC', 'C', '2023-11-02T04:30:00.000Z', none(1))
  // The financial year's edge: 31 Mar 23:59 IST and 1 Apr 00:01 IST.
  await sale('E', '2024-03-31T18:29:00.000Z', MP, PRIYA)
  await sale('F', '2024-03-31T18:31:00.000Z', MP, PRIYA)
}, 120_000)

afterAll(async () => {
  await cleanup()
  const context = { disableRevalidate: true }
  if (ids.plan)
    await payload.delete({ collection: 'plans', id: ids.plan, overrideAccess: true, context })
  if (ids.product)
    await payload.delete({ collection: 'products', id: ids.product, overrideAccess: true, context })
  for (const user of Object.values(users))
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
})

describe('CA report', () => {
  it('lists the IST month’s invoices and credit notes, credit notes negative', async () => {
    const n = (name: string) => invoices[name]!.number
    const lines = await caLines('2023-10')
    expect(lines.slice(0, 6)).toEqual([
      'Type,Number,Date,Against invoice,Against invoice date,Buyer,Business name,State,State code,GSTIN,SAC,Taxable,CGST,SGST,IGST,Total',
      `Invoice,${n('A')},2023-10-05,,,Priya Sharma,,Madhya Pradesh,23,,998431,846.61,76.20,76.19,0.00,999.00`,
      `Invoice,${n('B')},2023-10-10,,,Ravi Patel,Patel Traders,Gujarat,24,24AAACP1234A1Z5,998431,846.61,0.00,0.00,152.39,999.00`,
      `Credit note,${n('CB')},2023-10-20,${n('B')},2023-10-10,Ravi Patel,Patel Traders,Gujarat,24,24AAACP1234A1Z5,998431,-338.98,0.00,0.00,-61.02,-400.00`,
      `Credit note,${n('CA')},2023-10-25,${n('A')},2023-10-05,Priya Sharma,,Madhya Pradesh,23,,998431,-846.61,-76.20,-76.19,0.00,-999.00`,
      // 23:59 IST on the 31st is October; the formula in the name is defused.
      `Invoice,${n('C')},2023-10-31,,,"'=HYPERLINK(""http://evil"")",,Madhya Pradesh,23,,SAC not set,590.01,0.00,0.00,0.00,590.01`,
    ])
    expect(lines.slice(6)).toEqual([
      '',
      'SAC summary',
      'SAC,Invoices,Credit notes,Taxable,CGST,SGST,IGST,Total',
      '998431,2,2,507.63,0.00,0.00,91.37,599.00',
      'SAC not set,1,0,590.01,0.00,0.00,0.00,590.01',
      'Total,3,2,1097.64,0.00,0.00,91.37,1189.01',
    ])
  })

  it('puts 00:01 IST on 1 November in November, with credit notes against October', async () => {
    const lines = await caLines('2023-11')
    expect(lines[1]).toBe(
      `Invoice,${invoices.D!.number},2023-11-01,,,Priya Sharma,,Madhya Pradesh,23,,998431,846.61,76.20,76.19,0.00,999.00`,
    )
    expect(lines[2]).toBe(
      `Credit note,${invoices.CC!.number},2023-11-02,${invoices.C!.number},2023-10-31,"'=HYPERLINK(""http://evil"")",,Madhya Pradesh,23,,SAC not set,-0.01,0.00,0.00,0.00,-0.01`,
    )
    expect(lines).toHaveLength(3 + 6)
    expect(totalRow(lines)).toEqual([
      'Total',
      '1',
      '1',
      '846.60',
      '76.20',
      '76.19',
      '0.00',
      '998.99',
    ])
  })

  it('splits 31 March 23:59 and 1 April 00:01 IST between the financial years', async () => {
    const march = (await caLines('2024-03')).join('\n')
    const april = (await caLines('2024-04')).join('\n')
    expect(march).toContain(invoices.E!.number)
    expect(march).not.toContain(invoices.F!.number)
    expect(april).toContain(invoices.F!.number)
    expect(april).not.toContain(invoices.E!.number)
  })

  it('reconciles: net total = the month’s paid orders minus its credit notes', async () => {
    for (const month of ['2023-10', '2023-11', '2024-03', '2024-04']) {
      const [start, end] = monthBounds(month).map((d) => d.toISOString())
      const inMonth = { greater_than_equal: start, less_than: end }
      const paid = await payload.find({
        collection: 'orders',
        where: {
          paidAt: inMonth,
          status: { in: ['paid', 'refunded', 'partially-refunded', 'disputed'] },
        },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      const credited = await payload.find({
        collection: 'invoices',
        where: { issuedAt: inMonth, kind: { equals: 'credit-note' } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      const net =
        paid.docs.reduce((sum, o) => sum + o.total, 0) -
        credited.docs.reduce((sum, c) => sum + c.totals.total, 0)
      const reported = totalRow(await caLines(month)).at(-1)!
      expect(Math.round(Number(reported) * 100), month).toBe(net)
    }
    // October by hand: 999 + 999 + 590.01 paid, 999 + 400 credited.
    expect(totalRow(await caLines('2023-10')).at(-1)).toBe('1189.01')
  })

  it('downloads as an attachment that is never cached', async () => {
    const res = await call('/reports/ca', { month: '2023-10' }, users.owner)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="ca-report-2023-10.csv"',
    )
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('leads report', () => {
  beforeAll(async () => {
    const at = '2023-10-12T06:00:00.000Z'
    const given = { given: true, at }
    const fixtures: (Omit<RequiredDataFromCollectionSlug<'leads'>, 'email'> & {
      createdAt?: string
    })[] = [
      { type: 'contact', status: 'new', marketingConsent: given },
      { type: 'contact', status: 'contacted', marketingConsent: { ...given, withdrawnAt: at } },
      {
        type: 'waitlist',
        status: 'new',
        product: ids.product,
        marketingConsent: given,
        unsubscribedAt: at,
      },
      { type: 'waitlist', status: 'won', product: ids.product, marketingConsent: given },
      { type: 'waitlist', status: 'spam', product: ids.product },
      { type: 'newsletter', status: 'qualified', marketingConsent: { given: false } },
      // 23:59 IST on 31 October, then 00:01 IST on 1 November.
      { type: 'contact', status: 'new', createdAt: '2023-10-31T18:29:00.000Z' },
      { type: 'contact', status: 'lost', createdAt: '2023-10-31T18:31:00.000Z' },
    ]
    let i = 0
    for (const { createdAt = at, ...data } of fixtures) {
      const lead = await payload.create({
        collection: 'leads',
        data: { ...data, email: `lead${++i}.${run}${DOMAIN}` },
        depth: 0,
        overrideAccess: true,
      })
      await db().execute(sql`UPDATE leads SET created_at = ${createdAt} WHERE id = ${lead.id}`)
    }
  })

  it('counts the IST month’s leads by type, product, status and live consent', async () => {
    expect(await leadsLines('2023-10')).toEqual([
      'Type,Product,Leads,New,Contacted,Qualified,Won,Lost,Spam,Marketing consent',
      'contact,,3,2,1,0,0,0,0,1',
      `waitlist,Reports test ${run},3,1,0,0,1,0,1,1`,
      'newsletter,,1,0,0,1,0,0,0,0',
    ])
    expect(await leadsLines('2023-11')).toEqual([
      'Type,Product,Leads,New,Contacted,Qualified,Won,Lost,Spam,Marketing consent',
      'contact,,1,0,0,0,0,1,0,0',
    ])
  })

  it('names the file by month', async () => {
    const res = await call('/reports/leads', { month: '2023-10' }, users.support)
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="leads-report-2023-10.csv"',
    )
  })
})

describe('report access', () => {
  const month = { month: '2023-10' }

  it('gives the CA report to the Owner only', async () => {
    expect((await call('/reports/ca', month, users.owner)).status).toBe(200)
    for (const user of [users.support, users.editor, undefined])
      await expect(call('/reports/ca', month, user)).rejects.toMatchObject({ status: 403 })
  })

  it('gives the leads report to the Owner and Support', async () => {
    expect((await call('/reports/leads', month, users.owner)).status).toBe(200)
    expect((await call('/reports/leads', month, users.support)).status).toBe(200)
    for (const user of [users.editor, undefined])
      await expect(call('/reports/leads', month, user)).rejects.toMatchObject({ status: 403 })
  })

  it('refuses a malformed month with 400', async () => {
    for (const query of [{}, { month: '2023-13' }, { month: '2023-1' }, { month: ['2023-10'] }]) {
      await expect(call('/reports/ca', query, users.owner)).rejects.toMatchObject({ status: 400 })
      await expect(call('/reports/leads', query, users.support)).rejects.toMatchObject({
        status: 400,
      })
    }
  })

  it('is mounted at /api/reports/* and checks the session', async () => {
    const rest = (path: string, init?: RequestInit) =>
      REST_GET(config)(new Request(`http://localhost:3000/api${path}`, init), {
        params: Promise.resolve({
          slug: new URL(path, 'http://x').pathname.split('/').filter(Boolean),
        }),
      })
    expect((await rest('/reports/ca?month=2023-10')).status).toBe(403)
    expect((await rest('/reports/leads?month=2023-10')).status).toBe(403)
    const { token } = await payload.login({
      collection: 'users',
      data: { email: users.owner.email, password: `pw-${run}` },
    })
    const headers = { Authorization: `JWT ${token}` }
    const res = await rest('/reports/ca?month=2023-10', { headers })
    expect(res.status).toBe(200)
    expect(totalRow(await csvLines(res)).at(-1)).toBe('1189.01')
    expect((await rest('/reports/ca?month=2023-1', { headers })).status).toBe(400)
  })
})

describe('daily-stats insights', () => {
  it('totals each kind over 7 and 30 IST days and ranks the top 10 keys', async () => {
    const rows: [string, string, string, number][] = [
      ...Array.from({ length: 11 }, (_, i): [string, string, string, number] => [
        '2023-10-31',
        'go-click',
        `${KEY}k${String(i + 1).padStart(2, '0')}`,
        i + 1,
      ]),
      ['2023-10-10', 'go-click', `${KEY}k01`, 100], // in 30 days, not 7
      ['2023-09-01', 'go-click', `${KEY}k02`, 50], // older than 30 days
      ['2023-11-01', 'go-click', `${KEY}k03`, 1000], // after "today"
      ['2023-10-02', 'download', `${KEY}dl`, 5], // the 30th day back
      ['2023-10-01', 'download', `${KEY}dl`, 7], // the 31st
    ]
    for (const [date, kind, key, count] of rows)
      await db().execute(
        sql`INSERT INTO daily_stats (date, kind, key, count) VALUES (${date}, ${kind}, ${key}, ${count})`,
      )
    // Noon IST on 31 October 2023.
    const insights = await statsInsights(payload, new Date('2023-10-31T06:30:00Z'))
    const clicks = insights.filter((r) => r.kind === 'go-click')
    expect(clicks.map((r) => r.key)).toEqual([
      `${KEY}k01`,
      ...[11, 10, 9, 8, 7, 6, 5, 4, 3].map((i) => `${KEY}k${String(i).padStart(2, '0')}`),
    ])
    expect(clicks[0]).toMatchObject({ last7: 1, last30: 101, total7: 66, total30: 166 })
    expect(clicks[1]).toMatchObject({ last7: 11, last30: 11 })
    expect(insights.filter((r) => r.kind === 'download')).toEqual([
      { kind: 'download', key: `${KEY}dl`, last7: 0, last30: 5, total7: 0, total30: 5 },
    ])
  })
})
