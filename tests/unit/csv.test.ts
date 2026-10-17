import { describe, expect, it } from 'vitest'

import { csvCell, istDateTime, toCsv } from '@/lib/csv'

describe('csv', () => {
  it('quotes cells with commas, quotes and line breaks (RFC 4180)', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(42)).toBe('42')
  })

  it('defuses cells a spreadsheet would run as formulas', () => {
    for (const start of ['=', '+', '-', '@', '\t', '\r']) {
      expect(csvCell(`${start}1+1`).replace(/^"/, '')).toMatch(/^'/)
    }
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('a=b')).toBe('a=b')
  })

  it('keeps plain negative numbers as numbers', () => {
    expect(csvCell('-999.00')).toBe('-999.00')
    expect(csvCell(-5)).toBe('-5')
    expect(csvCell('-1+1')).toBe(`'-1+1`)
    expect(csvCell('-2.5e3')).toBe(`'-2.5e3`)
  })

  it('starts with a BOM and ends rows with CRLF', () => {
    expect(
      toCsv([
        ['name', 'email'],
        ['राहुल', 'r@x.in'],
      ]),
    ).toBe('\uFEFFname,email\r\nराहुल,r@x.in\r\n')
  })

  it('formats dates in IST', () => {
    expect(istDateTime('2026-10-16T18:35:00.000Z')).toBe('2026-10-17 00:05')
    expect(istDateTime(null)).toBe('')
  })
})
