/** CSV for spreadsheet exports (RFC 4180). */

// Spreadsheets run a cell that starts with one of these as a formula (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/
// A plain negative amount ("-999.00", a credit note in the CA report) is no formula: keep it a number.
const NEGATIVE_NUMBER = /^-\d+(\.\d+)?$/

export function csvCell(value: unknown): string {
  if (value == null) return ''
  let text = String(value)
  if (FORMULA_START.test(text) && !NEGATIVE_NUMBER.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** Starts with a UTF-8 BOM so Excel reads Hindi text correctly. */
export const toCsv = (rows: readonly (readonly unknown[])[]): string =>
  `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`

const IST_DATE_TIME = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "YYYY-MM-DD HH:mm" in IST; empty for a missing date. */
export const istDateTime = (value: string | null | undefined): string =>
  value ? IST_DATE_TIME.format(new Date(value)) : ''
