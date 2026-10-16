import type { Locale } from '@/i18n/routing'

/** Indian formats in both languages, always with Latin digits: ₹1,00,000 (spec §6). */
export const numberFormat = (locale: Locale, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(`${locale}-IN-u-nu-latn`, options)

/** Business dates are shown in IST whatever the server's time zone (CLAUDE.md). */
export const formatDate = (
  locale: Locale,
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) =>
  new Intl.DateTimeFormat(`${locale}-IN-u-nu-latn`, {
    timeZone: 'Asia/Kolkata',
    ...options,
  }).format(new Date(value))

/** "YYYY" or "YYYY-MM" from the Timeline block. */
export const formatYearMonth = (locale: Locale, value: string) =>
  value.length === 4
    ? value
    : formatDate(locale, `${value}-01T12:00:00+05:30`, { month: 'long', year: 'numeric' })

/** Paise → "₹1,999" (no decimals when whole rupees). */
export const formatINR = (locale: Locale, paise: number) =>
  numberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100)

/** 12_345_678 → "11.8 MB" (binary units, as Windows Explorer shows them). */
export function formatBytes(locale: Locale, bytes: number) {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return numberFormat(locale, {
    style: 'unit',
    unit: units[i],
    unitDisplay: 'short',
    maximumFractionDigits: i === 0 ? 0 : 1,
  }).format(value)
}

/** Today's date in IST as YYYY-MM-DD (daily-stats rows, spec §17). */
export const istDate = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)

type LexicalNode = { text?: unknown; children?: unknown[] }

/** Plain text of a Lexical rich text value (reading time, structured data, feeds). */
export function plainText(value: { root?: object } | null | undefined): string {
  const out: string[] = []
  const walk = (node: LexicalNode) => {
    if (typeof node.text === 'string') out.push(node.text)
    ;(node.children as LexicalNode[] | undefined)?.forEach(walk)
    if (node.children) out.push(' ')
  }
  if (value?.root) walk(value.root as LexicalNode)
  return out.join('').replace(/\s+/g, ' ').trim()
}

/** Minutes to read at ~200 words a minute, at least 1. */
export const readingMinutes = (text: string) =>
  Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200))
