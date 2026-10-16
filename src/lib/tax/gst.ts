/** What the tax engine reads from commerceSettings (spec §9.2). */
export type TaxSettings = {
  gstEnabled: boolean
  /** e.g. 18; decimals to two places are allowed. */
  ratePercent: number
  /** Spec default: prices are GST-inclusive. */
  pricesIncludeGst: boolean
  homeStateCode: string
}

/** `cgst_sgst` within the home state, `igst` for other states, `none` while GST is off. */
export type TaxMode = 'cgst_sgst' | 'igst' | 'none'

/** Amounts in paise (spec §3). `total` is what the buyer pays. */
export type Tax = {
  mode: TaxMode
  ratePercent: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

/** n ÷ d rounded half up, for non-negative integers (exact: no floating-point division). */
export function divRoundHalfUp(n: number, d: number): number {
  const q = Math.floor(n / d)
  return 2 * (n - q * d) >= d ? q + 1 : q
}

/**
 * GST on `amount` (paise, after any discount) for a buyer in `buyerStateCode` (spec §11.4).
 * Inclusive prices: taxable = amount ÷ (1 + rate) to the paisa, tax = amount − taxable.
 * CGST = tax ÷ 2 rounded half up, SGST = the rest.
 */
export function computeTax(amount: number, buyerStateCode: string, s: TaxSettings): Tax {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('amount must be whole paise')
  if (!s.gstEnabled) {
    return {
      mode: 'none',
      ratePercent: 0,
      taxable: amount,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: amount,
    }
  }
  const bp = Math.round(s.ratePercent * 100) // basis points: 18% = 1800
  const taxable = s.pricesIncludeGst ? divRoundHalfUp(amount * 10_000, 10_000 + bp) : amount
  const tax = s.pricesIncludeGst ? amount - taxable : divRoundHalfUp(amount * bp, 10_000)
  const total = taxable + tax
  const base = { ratePercent: s.ratePercent, taxable, total }
  if (buyerStateCode === s.homeStateCode) {
    const cgst = Math.ceil(tax / 2)
    return { ...base, mode: 'cgst_sgst', cgst, sgst: tax - cgst, igst: 0 }
  }
  return { ...base, mode: 'igst', cgst: 0, sgst: 0, igst: tax }
}
