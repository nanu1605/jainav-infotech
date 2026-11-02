import { describe, expect, it } from 'vitest'

import { caReportCsv, monthBounds, previousMonth, rupees, type CaRow } from '@/lib/reports'

describe('monthBounds', () => {
  it('gives the IST month as UTC instants', () => {
    const [start, end] = monthBounds('2026-10')
    expect(start.toISOString()).toBe('2026-09-30T18:30:00.000Z')
    expect(end.toISOString()).toBe('2026-10-31T18:30:00.000Z')
  })

  it('crosses the year and the financial year', () => {
    expect(monthBounds('2026-12').map((d) => d.toISOString())).toEqual([
      '2026-11-30T18:30:00.000Z',
      '2026-12-31T18:30:00.000Z',
    ])
    expect(monthBounds('2027-03')[1].toISOString()).toBe('2027-03-31T18:30:00.000Z')
    expect(monthBounds('2024-02')[1].toISOString()).toBe('2024-02-29T18:30:00.000Z')
  })

  it('refuses anything but YYYY-MM', () => {
    for (const bad of ['2026-13', '2026-00', '2026-1', '26-10', '2026-10-01', ''])
      expect(() => monthBounds(bad)).toThrow()
  })

  it('defaults to the previous IST month', () => {
    // 1 Nov 00:01 IST is still 31 Oct in UTC: the previous IST month is October.
    expect(previousMonth(new Date('2026-10-31T18:31:00Z'))).toBe('2026-10')
    expect(previousMonth(new Date('2026-10-31T18:29:00Z'))).toBe('2026-09')
    expect(previousMonth(new Date('2027-01-15T00:00:00Z'))).toBe('2026-12')
  })
})

describe('rupees', () => {
  it('formats whole paise exactly with two decimals', () => {
    expect(rupees(0)).toBe('0.00')
    expect(rupees(1)).toBe('0.01')
    expect(rupees(99)).toBe('0.99')
    expect(rupees(99_900)).toBe('999.00')
    expect(rupees(59_001)).toBe('590.01')
    expect(rupees(-1)).toBe('-0.01')
    expect(rupees(-99_900)).toBe('-999.00')
    expect(rupees(-0)).toBe('0.00')
    expect(rupees(123_456_789_012)).toBe('1234567890.12')
  })

  it('refuses amounts that are not whole paise', () => {
    expect(() => rupees(0.5)).toThrow()
    expect(() => rupees(Number.NaN)).toThrow()
  })
})

const row = (extra: Partial<CaRow> & Pick<CaRow, 'kind' | 'number'>): CaRow => ({
  issuedAt: '2026-10-05T06:00:00.000Z',
  againstNumber: null,
  againstIssuedAt: null,
  buyer: { name: 'Priya', stateName: 'Madhya Pradesh', stateCode: '23', country: 'IN' },
  sacCode: '998431',
  amounts: { taxable: 84_661, cgst: 7_620, sgst: 7_619, igst: 0, total: 99_900 },
  ...extra,
})

describe('caReportCsv', () => {
  it('lists documents, then a SAC summary that nets credit notes', () => {
    const csv = caReportCsv([
      row({ kind: 'invoice', number: 'JI/26-27/00001' }),
      row({
        kind: 'invoice',
        number: 'JI/26-27/00002',
        sacCode: null,
        buyer: { name: '=cmd', stateName: 'Gujarat', stateCode: '24', country: 'IN' },
        amounts: { taxable: 1, cgst: 0, sgst: 0, igst: 0, total: 1 },
      }),
      row({
        kind: 'credit-note',
        number: 'JC/26-27/00001',
        issuedAt: '2026-10-31T18:31:00.000Z',
        againstNumber: 'JI/26-27/00001',
        againstIssuedAt: '2026-10-05T06:00:00.000Z',
        amounts: { taxable: -42_331, cgst: -3_810, sgst: -3_809, igst: 0, total: -49_950 },
      }),
    ])
    expect(csv.startsWith('﻿Type,Number,Date,Against invoice,Against invoice date,')).toBe(true)
    const lines = csv.slice(1).trimEnd().split('\r\n')
    expect(lines).toEqual([
      'Type,Number,Date,Against invoice,Against invoice date,Buyer,Business name,State,State code,GSTIN,SAC,Taxable,CGST,SGST,IGST,Total',
      'Invoice,JI/26-27/00001,2026-10-05,,,Priya,,Madhya Pradesh,23,,998431,846.61,76.20,76.19,0.00,999.00',
      "Invoice,JI/26-27/00002,2026-10-05,,,'=cmd,,Gujarat,24,,SAC not set,0.01,0.00,0.00,0.00,0.01",
      'Credit note,JC/26-27/00001,2026-11-01,JI/26-27/00001,2026-10-05,Priya,,Madhya Pradesh,23,,998431,-423.31,-38.10,-38.09,0.00,-499.50',
      '',
      'SAC summary',
      'SAC,Invoices,Credit notes,Taxable,CGST,SGST,IGST,Total',
      '998431,1,1,423.30,38.10,38.10,0.00,499.50',
      'SAC not set,1,0,0.01,0.00,0.00,0.00,0.01',
      'Total,2,1,423.31,38.10,38.10,0.00,499.51',
    ])
  })

  it('lists lost disputes after the totals, only when there are any', () => {
    const lines = caReportCsv(
      [],
      [
        {
          orderNumber: 'JO-1234ABCD',
          invoiceNumber: 'JI/26-27/00001',
          at: '2026-10-31T18:31:00.000Z',
          amount: 99_900,
        },
      ],
    )
      .slice(1)
      .trimEnd()
      .split('\r\n')
    expect(lines.slice(-5)).toEqual([
      'Total,0,0,0.00,0.00,0.00,0.00,0.00',
      '',
      'Disputes lost this month: no credit note and not in the totals above',
      'Order,Invoice,Date,Amount',
      'JO-1234ABCD,JI/26-27/00001,2026-11-01,999.00',
    ])
  })

  it('still has the summary for an empty month', () => {
    expect(caReportCsv([]).slice(1).trimEnd().split('\r\n').slice(-2)).toEqual([
      'SAC,Invoices,Credit notes,Taxable,CGST,SGST,IGST,Total',
      'Total,0,0,0.00,0.00,0.00,0.00,0.00',
    ])
  })
})
