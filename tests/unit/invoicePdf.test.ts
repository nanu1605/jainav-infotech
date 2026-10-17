import { inflateSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import { renderInvoicePdf } from '@/lib/invoices/pdf'
import { gstinCheckChar } from '@/lib/tax/gstin'
import type { Invoice } from '@/payload-types'

/**
 * Text drawn by the PDF's content streams: each FlateDecode stream inflated, then the strings of
 * every Tj / TJ operator (hex <…> or literal (…), WinAnsi bytes) joined in drawing order.
 * react-pdf draws one line as several runs and spaces as glyphs, so runs join with nothing (lines
 * run together too). Good enough for Helvetica text from react-pdf; not a general PDF parser.
 */
function pdfText(pdf: Buffer): string {
  const raw = pdf.toString('latin1')
  const runs: string[] = []
  const streams = /<<([^]*?)>>\s*stream\r?\n/g
  for (let m; (m = streams.exec(raw));) {
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    if (!m[1]!.includes('/FlateDecode')) continue
    const content = inflateSync(pdf.subarray(start, end)).toString('latin1')
    const ops = /\[((?:[^\]\\]|\\.)*)\]\s*TJ|(<[0-9a-fA-F\s]*>|\((?:[^)\\]|\\.)*\))\s*Tj/g
    for (let op; (op = ops.exec(content));) {
      const strings = op[1] ?? op[2]!
      const pieces = strings.match(/<[0-9a-fA-F\s]*>|\((?:[^)\\]|\\.)*\)/g) ?? []
      runs.push(pieces.map(decode).join(''))
    }
  }
  return runs.join('')
}

const decode = (s: string) =>
  s.startsWith('<')
    ? Buffer.from(s.slice(1, -1).replace(/\s/g, ''), 'hex').toString('latin1')
    : s
        .slice(1, -1)
        .replace(/\\([0-7]{1,3}|.)/g, (_, e: string) =>
          /^[0-7]/.test(e)
            ? String.fromCharCode(parseInt(e, 8))
            : (({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' } as Record<string, string>)[e] ?? e),
        )

const gstin = (first14: string) => first14 + gstinCheckChar(first14)
const SELLER_GSTIN = gstin('23AABCJ1234A1Z')
const BUYER_GSTIN = gstin('24AABCT5678F1Z')

const line = { description: 'VYRO Pro (lifetime license)', qty: 1, unitPrice: 99_900, discount: 0 }

// ₹999 incl. 18% GST: taxable 84661, tax 15239 (spec §11.4 rounding, tests/unit/commerce.test.ts).
const madhyaPradesh: Invoice = {
  id: 1,
  number: 'JI/26-27/00001',
  kind: 'invoice',
  financialYear: '2026-27',
  order: 1,
  issuedAt: '2026-03-31T18:31:00.000Z', // 1 April 2026, 00:01 IST
  seller: {
    legalName: 'Seller Test Pvt Ltd',
    stateName: 'Madhya Pradesh',
    stateCode: '23',
    gstin: null,
    cin: null,
    address: null,
  },
  buyer: {
    name: 'Asha Verma',
    businessName: null,
    email: 'asha@example.com',
    country: 'IN',
    stateName: 'Madhya Pradesh',
    stateCode: '23',
    gstin: null,
  },
  taxMode: 'cgst_sgst',
  sacCode: null,
  reverseCharge: false,
  currency: 'INR',
  lines: [
    { ...line, taxable: 84_661, ratePercent: 18, cgst: 7_620, sgst: 7_619, igst: 0, total: 99_900 },
  ],
  totals: {
    subtotal: 99_900,
    discount: 0,
    taxable: 84_661,
    cgst: 7_620,
    sgst: 7_619,
    igst: 0,
    total: 99_900,
  },
  updatedAt: '2026-03-31T18:31:00.000Z',
  createdAt: '2026-03-31T18:31:00.000Z',
}

// ₹1,24,999.50 less ₹25,000 off, incl. 18% IGST: taxable 84,745.34, IGST 15,254.16.
const gujarat: Invoice = {
  ...madhyaPradesh,
  number: 'JI/26-27/00002',
  issuedAt: '2026-10-17T06:30:00.000Z',
  seller: {
    ...madhyaPradesh.seller,
    gstin: SELLER_GSTIN,
    cin: 'U62099MP2026PTC000001',
    address: '1 Test Road\nIndore 452001',
  },
  buyer: {
    ...madhyaPradesh.buyer,
    name: 'Ravi Patel',
    businessName: 'Patel Traders',
    stateName: 'Gujarat',
    stateCode: '24',
    gstin: BUYER_GSTIN,
  },
  taxMode: 'igst',
  sacCode: '998431',
  lines: [
    {
      ...line,
      unitPrice: 12_499_950,
      discount: 2_500_000,
      taxable: 8_474_534,
      ratePercent: 18,
      cgst: 0,
      sgst: 0,
      igst: 1_525_416,
      total: 9_999_950,
    },
  ],
  totals: {
    subtotal: 12_499_950,
    discount: 2_500_000,
    taxable: 8_474_534,
    cgst: 0,
    sgst: 0,
    igst: 1_525_416,
    total: 9_999_950,
  },
}

const gstOff: Invoice = {
  ...madhyaPradesh,
  number: 'JI/26-27/00003',
  taxMode: 'none',
  lines: [{ ...line, taxable: 99_900, ratePercent: 0, cgst: 0, sgst: 0, igst: 0, total: 99_900 }],
  totals: {
    subtotal: 99_900,
    discount: 0,
    taxable: 99_900,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 99_900,
  },
}

const creditNote: Invoice = {
  ...madhyaPradesh,
  number: 'JC/26-27/00001',
  kind: 'credit-note',
  issuedAt: '2026-04-10T05:00:00.000Z',
  originalInvoice: 1,
}
// 31 March 2026, 23:59 IST: the previous financial year.
const original = { number: 'JI/25-26/00042', issuedAt: '2026-03-31T18:29:00.000Z' }

/** A document-info string (/Title, /Author), which react-pdf writes as an object of its own. */
function info(pdf: Buffer, key: string): string | undefined {
  const raw = pdf.toString('latin1')
  const ref = raw.match(new RegExp(`/${key} (\\d+) 0 R`))?.[1]
  return raw.match(new RegExp(`\\n${ref} 0 obj\\n\\((.*)\\)\\nendobj`))?.[1]
}

async function render(invoice: Invoice, opts?: Parameters<typeof renderInvoicePdf>[1]) {
  const pdf = await renderInvoicePdf(invoice, opts)
  expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  return { text: pdfText(pdf), title: info(pdf, 'Title') }
}

describe('renderInvoicePdf (spec §11.4)', () => {
  it('prints every field for a Madhya Pradesh buyer with CGST + SGST', async () => {
    const { text, title } = await render(madhyaPradesh)
    expect(title).toBe('Tax Invoice JI/26-27/00001')
    for (const field of [
      'Tax Invoice',
      'Seller Test Pvt Ltd',
      // Unset settings show as placeholders until they are filled in.
      '{{REGISTERED_ADDRESS}}',
      'CIN: {{CIN}}',
      'SAC: {{SAC_CODE}}',
      'Invoice no. JI/26-27/00001',
      'Date: 1 Apr 2026',
      'Asha Verma',
      'State: Madhya Pradesh (23)',
      'VYRO Pro (lifetime license)',
      'Qty',
      'Taxable value',
      'INR 846.61',
      'CGST @ 9%',
      'INR 76.20',
      'SGST @ 9%',
      'INR 76.19',
      'Total',
      'INR 999.00',
      'Place of supply: Madhya Pradesh (23)',
      'Reverse charge: No',
      'Authorised signatory, Seller Test Pvt Ltd',
      'This is a computer-generated document.',
    ]) {
      expect(text).toContain(field)
    }
    expect(text).not.toContain('IGST')
    expect(text).not.toContain('GSTIN')
  })

  it('prints IGST, the GSTINs and the business name for another state', async () => {
    const { text } = await render(gujarat)
    for (const field of [
      'Tax Invoice',
      '1 Test Road',
      'Indore 452001',
      `GSTIN: ${SELLER_GSTIN}`,
      'CIN: U62099MP2026PTC000001',
      'Date: 17 Oct 2026',
      'Ravi Patel',
      'Patel Traders',
      `GSTIN: ${BUYER_GSTIN}`,
      'State: Gujarat (24)',
      'SAC: 998431',
      'INR 1,24,999.50',
      'INR 25,000.00',
      'INR 84,745.34',
      'IGST @ 18%',
      'INR 15,254.16',
      'INR 99,999.50',
      'Place of supply: Gujarat (24)',
      'Reverse charge: No',
    ]) {
      expect(text).toContain(field)
    }
    expect(text).not.toMatch(/CGST|SGST|\{\{/)
  })

  it('prints a plain invoice with no tax lines while GST is off', async () => {
    const { text, title } = await render(gstOff)
    expect(title).toBe('Invoice JI/26-27/00003')
    expect(text).toContain('{{CIN}}InvoiceInvoice no. JI/26-27/00003')
    expect(text).not.toContain('Tax Invoice')
    expect(text).not.toMatch(/CGST|SGST|IGST/)
    for (const field of [
      'INR 999.00',
      'Place of supply: Madhya Pradesh (23)',
      'Reverse charge: No',
      'SAC: {{SAC_CODE}}',
      'Authorised signatory, Seller Test Pvt Ltd',
    ]) {
      expect(text).toContain(field)
    }
  })

  it('titles a credit note and names the invoice it corrects, in IST', async () => {
    const { text, title } = await render(creditNote, { original })
    expect(title).toBe('Credit Note JC/26-27/00001')
    expect(text).toContain('Credit note no. JC/26-27/00001')
    expect(text).toContain('Against invoice JI/25-26/00042 dated 31 Mar 2026')
    await expect(renderInvoicePdf(creditNote)).rejects.toThrow(/original invoice/)
  })

  it('names the seller as author and the language as en-IN', async () => {
    const pdf = await renderInvoicePdf(madhyaPradesh)
    expect(info(pdf, 'Author')).toBe('Seller Test Pvt Ltd')
    expect(pdf.toString('latin1')).toContain('/Lang (en-IN)')
  })
})
