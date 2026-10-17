import { istDate } from '@/lib/format'

/** The Indian financial year (1 April – 31 March, IST) a moment falls in, e.g. "2026-27". */
export function financialYear(date: Date): string {
  const [year, month] = istDate(date).split('-').map(Number) as [number, number]
  const start = month >= 4 ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** GST allows at most 16 characters (spec §11.4). */
export const MAX_INVOICE_NUMBER = 16

/** `{prefix}/{YY-YY}/{seq}`, e.g. JI/26-27/00001. Throws past 16 characters. */
export function invoiceNumber(prefix: string, fy: string, seq: number): string {
  if (!/^[A-Z0-9]{1,4}$/.test(prefix)) throw new Error('Invoice prefix: 1–4 letters or digits')
  if (!/^\d{4}-\d{2}$/.test(fy)) throw new Error(`Bad financial year: ${fy}`)
  if (!Number.isInteger(seq) || seq < 1) throw new Error(`Bad invoice sequence: ${seq}`)
  const number = `${prefix}/${fy.slice(2)}/${String(seq).padStart(5, '0')}`
  if (number.length > MAX_INVOICE_NUMBER) throw new Error(`Invoice number too long: ${number}`)
  return number
}
