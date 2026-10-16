import 'server-only'

import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer'

import { formatDate, numberFormat } from '@/lib/format'
import type { Invoice } from '@/payload-types'
import { tokens } from '@/styles/tokens.generated'

/** The invoice a credit note corrects (spec §11.4: "Against invoice {number} dated {date}"). */
export type OriginalInvoice = { number: string; issuedAt: string }

// GSTINs, invoice numbers and amounts must never break mid-word with a hyphen.
Font.registerHyphenationCallback((word) => [word])

// Print is light; colors come from the tokens like everywhere else.
const c = tokens.light

// Built-in Helvetica (WinAnsi, Latin only: spec §11.3 keeps billing fields Latin). It has no ₹
// glyph, so amounts read "INR 1,234.56". Intl puts a no-break space after the code: \s matches
// it, and a plain space keeps copied amounts and text search simple.
const money = (currency: string, paise: number) =>
  numberFormat('en', { style: 'currency', currency, currencyDisplay: 'code' })
    .format(paise / 100)
    .replace(/\s/g, ' ')
const percent = (rate: number) =>
  `${numberFormat('en', { maximumFractionDigits: 2 }).format(rate)}%`
const date = (value: string) => formatDate('en', value)

export const invoiceTitle = (invoice: Pick<Invoice, 'kind' | 'taxMode'>) =>
  invoice.kind === 'credit-note'
    ? 'Credit Note'
    : invoice.taxMode === 'none'
      ? 'Invoice'
      : 'Tax Invoice'

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.4,
    color: c.fg,
    backgroundColor: c.bg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  right: { textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: c['fg-muted'] },
  label: {
    marginBottom: 4,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: c['fg-muted'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seller: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: c.primary, marginBottom: 8 },
  section: { marginTop: 24 },
  table: { marginTop: 24, borderTopWidth: 1, borderColor: c.border },
  head: { backgroundColor: c['bg-subtle'], fontFamily: 'Helvetica-Bold', color: c['fg-muted'] },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: c.border },
  td: { paddingVertical: 6, paddingHorizontal: 4, fontSize: 8.5 },
  totals: { marginTop: 12, marginLeft: 'auto', width: 240 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grand: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderColor: c['border-strong'] },
  footer: { marginTop: 48, flexDirection: 'row', justifyContent: 'space-between' },
  signature: { width: 220, paddingTop: 6, borderTopWidth: 1, borderColor: c['border-strong'] },
})

// Line table columns (A4 content width 515pt); amounts fit "INR 99,99,999.00" on one line.
const amount = { width: 80, textAlign: 'right' } as const
const cols = [
  { head: 'Description', style: { flex: 1 } },
  { head: 'Qty', style: { width: 28, textAlign: 'right' } },
  { head: 'Unit price', style: amount },
  { head: 'Discount', style: amount },
  { head: 'Taxable value', style: amount },
  { head: 'Total', style: amount },
] as const

function InvoiceDocument({
  invoice,
  original,
}: {
  invoice: Invoice
  original: OriginalInvoice | null
}) {
  const { seller, buyer, totals, currency } = invoice
  const title = invoiceTitle(invoice)
  const inr = (paise: number) => money(currency, paise)
  const buyerState = `${buyer.stateName} (${buyer.stateCode})`

  // Tax summary per rate: one line per tax head and rate (one rate today, from commerceSettings).
  const byRate = new Map<number, { cgst: number; sgst: number; igst: number }>()
  for (const line of invoice.lines) {
    const sum = byRate.get(line.ratePercent) ?? { cgst: 0, sgst: 0, igst: 0 }
    sum.cgst += line.cgst
    sum.sgst += line.sgst
    sum.igst += line.igst
    byRate.set(line.ratePercent, sum)
  }
  const taxLines: [string, number][] = [...byRate].flatMap(([rate, sum]): [string, number][] =>
    invoice.taxMode === 'cgst_sgst'
      ? [
          [`CGST @ ${percent(rate / 2)}`, sum.cgst],
          [`SGST @ ${percent(rate / 2)}`, sum.sgst],
        ]
      : invoice.taxMode === 'igst'
        ? [[`IGST @ ${percent(rate)}`, sum.igst]]
        : [],
  )

  return (
    <Document
      title={`${title} ${invoice.number}`}
      author={seller.legalName}
      subject={title}
      language="en-IN"
    >
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View style={s.half}>
            <Text style={s.seller}>{seller.legalName}</Text>
            <Text>{seller.address || '{{REGISTERED_ADDRESS}}'}</Text>
            <Text>
              State: {seller.stateName} ({seller.stateCode})
            </Text>
            {seller.gstin && <Text>GSTIN: {seller.gstin}</Text>}
            <Text>CIN: {seller.cin || '{{CIN}}'}</Text>
          </View>
          <View style={[s.half, s.right]}>
            <Text style={s.title}>{title}</Text>
            <Text>
              {invoice.kind === 'credit-note' ? 'Credit note no.' : 'Invoice no.'}{' '}
              <Text style={s.bold}>{invoice.number}</Text>
            </Text>
            <Text>Date: {date(invoice.issuedAt)}</Text>
            {original && (
              <Text>
                Against invoice {original.number} dated {date(original.issuedAt)}
              </Text>
            )}
          </View>
        </View>

        <View style={[s.row, s.section]}>
          <View style={s.half}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.bold}>{buyer.name}</Text>
            {buyer.businessName && <Text>{buyer.businessName}</Text>}
            {buyer.gstin && <Text>GSTIN: {buyer.gstin}</Text>}
            <Text>State: {buyerState}</Text>
          </View>
          <View style={[s.half, s.right]}>
            <Text style={s.label}>Supply</Text>
            <Text>Place of supply: {buyerState}</Text>
            <Text>Reverse charge: {invoice.reverseCharge ? 'Yes' : 'No'}</Text>
            {/* One SAC per invoice (commerceSettings); empty prints as its placeholder (spec §21). */}
            <Text>SAC: {invoice.sacCode || '{{SAC_CODE}}'}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.tr, s.head]} fixed>
            {cols.map((col) => (
              <Text key={col.head} style={[s.td, col.style]}>
                {col.head}
              </Text>
            ))}
          </View>
          {invoice.lines.map((line, i) => (
            <View key={line.id ?? i} style={s.tr} wrap={false}>
              {[
                line.description,
                String(line.qty),
                inr(line.unitPrice),
                inr(line.discount),
                inr(line.taxable),
                inr(line.total),
              ].map((value, j) => (
                <Text key={cols[j]!.head} style={[s.td, cols[j]!.style]}>
                  {value}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          {invoice.taxMode !== 'none' && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Taxable value</Text>
              <Text>{inr(totals.taxable)}</Text>
            </View>
          )}
          {taxLines.map(([label, amount]) => (
            <View key={label} style={s.totalRow}>
              <Text style={s.muted}>{label}</Text>
              <Text>{inr(amount)}</Text>
            </View>
          ))}
          <View style={[s.totalRow, s.grand]}>
            <Text style={s.bold}>Total</Text>
            <Text style={s.bold}>{inr(totals.total)}</Text>
          </View>
        </View>

        {/* {{CONFIRM_WITH_CA}}: the signature line and its wording (spec §11.4). */}
        <View style={s.footer} wrap={false}>
          <Text style={[s.muted, { alignSelf: 'flex-end' }]}>
            This is a computer-generated document.
          </Text>
          <Text style={s.signature}>Authorised signatory, {seller.legalName}</Text>
        </View>
      </Page>
    </Document>
  )
}

/**
 * The invoice or credit note as an A4 PDF (spec §11.4), from the invoice's own snapshot: nothing
 * is read from settings, so a re-render matches the issued document. Credit notes need the
 * invoice they correct: `opts.original`, or `originalInvoice` populated (depth ≥ 1).
 */
export async function renderInvoicePdf(
  invoice: Invoice,
  opts: { original?: OriginalInvoice } = {},
): Promise<Buffer> {
  let original: OriginalInvoice | null = null
  if (invoice.kind === 'credit-note') {
    const populated = typeof invoice.originalInvoice === 'object' ? invoice.originalInvoice : null
    original = opts.original ?? populated ?? null
    if (!original) throw new Error(`Credit note ${invoice.number}: the original invoice is missing`)
  }
  return renderToBuffer(<InvoiceDocument invoice={invoice} original={original} />)
}
