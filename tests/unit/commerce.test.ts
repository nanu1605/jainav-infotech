import { describe, expect, it } from 'vitest'

import {
  couponProblem,
  discountFor,
  MIN_TOTAL,
  quote,
  type CouponTerms,
} from '@/lib/commerce/pricing'
import { financialYear, invoiceNumber } from '@/lib/invoices/numbering'
import { computeTax, divRoundHalfUp, type TaxSettings } from '@/lib/tax/gst'
import { gstinCheckChar, gstinState } from '@/lib/tax/gstin'
import { GST_STATES, STATE_OPTIONS } from '@/lib/tax/states'

const GST: TaxSettings = {
  gstEnabled: true,
  ratePercent: 18,
  pricesIncludeGst: true,
  homeStateCode: '23',
}

describe('GST (spec §11.4)', () => {
  it('splits CGST and SGST inside Madhya Pradesh, rounding the taxable value to the paisa', () => {
    // ₹999 incl. 18%: 99900 ÷ 1.18 = 84661.02 → 84661; tax 15239 → CGST 7620 (half up), SGST 7619.
    expect(computeTax(99_900, '23', GST)).toEqual({
      mode: 'cgst_sgst',
      ratePercent: 18,
      taxable: 84_661,
      cgst: 7_620,
      sgst: 7_619,
      igst: 0,
      total: 99_900,
    })
    expect(computeTax(118_000, '23', GST)).toMatchObject({
      taxable: 100_000,
      cgst: 9_000,
      sgst: 9_000,
    })
  })

  it('charges IGST to other states', () => {
    expect(computeTax(99_900, '27', GST)).toEqual({
      mode: 'igst',
      ratePercent: 18,
      taxable: 84_661,
      cgst: 0,
      sgst: 0,
      igst: 15_239,
      total: 99_900,
    })
  })

  it('has no tax lines while GST is off', () => {
    expect(computeTax(99_900, '23', { ...GST, gstEnabled: false })).toEqual({
      mode: 'none',
      ratePercent: 0,
      taxable: 99_900,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 99_900,
    })
  })

  it('adds tax on top when prices exclude GST', () => {
    expect(computeTax(84_661, '23', { ...GST, pricesIncludeGst: false })).toMatchObject({
      taxable: 84_661,
      cgst: 7_620,
      sgst: 7_619,
      total: 99_900,
    })
  })

  it('always adds up, whatever the amount and rate', () => {
    for (const ratePercent of [5, 12, 18, 28, 0.25]) {
      for (let amount = 100; amount < 5_000; amount += 37) {
        const t = computeTax(amount, '23', { ...GST, ratePercent })
        expect(t.taxable + t.cgst + t.sgst).toBe(amount)
        expect(t.cgst - t.sgst).toBeGreaterThanOrEqual(0)
        expect(t.cgst - t.sgst).toBeLessThanOrEqual(1)
      }
    }
  })

  it('rounds half up exactly', () => {
    expect([
      divRoundHalfUp(5, 2),
      divRoundHalfUp(4, 2),
      divRoundHalfUp(1, 3),
      divRoundHalfUp(2, 3),
    ]).toEqual([3, 2, 0, 1])
  })

  it('refuses fractional paise', () => {
    expect(() => computeTax(99.5, '23', GST)).toThrow()
  })
})

describe('GSTIN (spec §11.4)', () => {
  it('accepts valid GSTINs and derives the state', () => {
    expect(gstinState('27AAPFU0939F1ZV')).toBe('27')
    expect(gstinState(' 29aagcb7383j1z4 ')).toBe('29')
    expect(gstinState(`23AAACJ1234A1Z${gstinCheckChar('23AAACJ1234A1Z')}`)).toBe('23')
  })

  it('rejects a wrong check character, a bad shape or an unknown state', () => {
    expect(gstinState('27AAPFU0939F1ZW')).toBeNull()
    expect(gstinState('27AAPFU0939F1Z')).toBeNull()
    expect(gstinState('27AAPF00939F1ZV')).toBeNull()
    const unknown = '99AAPFU0939F1Z'
    expect(gstinState(unknown + gstinCheckChar(unknown))).toBeNull()
  })

  it('lists every state for billing except "Other Territory"', () => {
    expect(STATE_OPTIONS).toHaveLength(Object.keys(GST_STATES).length - 1)
    expect(STATE_OPTIONS.find((s) => s.code === '23')?.name).toBe('Madhya Pradesh')
  })
})

describe('invoice numbers (spec §11.4)', () => {
  it('rolls the financial year over at midnight on 1 April, India time', () => {
    expect(financialYear(new Date('2027-03-31T23:59:00+05:30'))).toBe('2026-27')
    expect(financialYear(new Date('2027-04-01T00:01:00+05:30'))).toBe('2027-28')
    // 1 April 00:01 IST is still 31 March in UTC.
    expect(financialYear(new Date('2027-03-31T18:31:00Z'))).toBe('2027-28')
    expect(financialYear(new Date('2026-10-16T12:00:00+05:30'))).toBe('2026-27')
    expect(financialYear(new Date('2099-06-01T12:00:00+05:30'))).toBe('2099-00')
  })

  it('formats {prefix}/{YY-YY}/{seq} within 16 characters', () => {
    expect(invoiceNumber('JI', '2026-27', 1)).toBe('JI/26-27/00001')
    expect(invoiceNumber('JC', '2026-27', 123_456)).toBe('JC/26-27/123456')
    expect(invoiceNumber('JINV', '2026-27', 99_999)).toHaveLength(16)
    expect(() => invoiceNumber('JINV', '2026-27', 100_000)).toThrow(/too long/)
    expect(() => invoiceNumber('JINVX', '2026-27', 1)).toThrow()
    expect(() => invoiceNumber('JI', '2026-27', 0)).toThrow()
  })
})

describe('coupons (spec §11.5)', () => {
  const coupon = (terms: Partial<CouponTerms> = {}): CouponTerms => ({
    kind: 'percent',
    value: 10,
    active: true,
    ...terms,
  })
  const target = { productId: 1, planId: 2, now: new Date('2026-10-16T12:00:00Z') }

  it('applies percent and fixed discounts before tax', () => {
    expect(discountFor(99_900, coupon())).toBe(9_990)
    expect(discountFor(99_900, coupon({ kind: 'fixed', value: 20_000 }))).toBe(20_000)
    expect(discountFor(99_900, null)).toBe(0)
    const q = quote(99_900, coupon(), '27', GST)
    expect(q).toMatchObject({ subtotal: 99_900, discount: 9_990, total: 89_910 })
    expect(q.tax.taxable + q.tax.igst).toBe(89_910)
  })

  it('never discounts more than the price', () => {
    expect(discountFor(5_000, coupon({ kind: 'fixed', value: 9_000 }))).toBe(5_000)
    expect(quote(5_000, coupon({ kind: 'percent', value: 100 }), '23', GST).total).toBeLessThan(
      MIN_TOTAL,
    )
  })

  it('checks status, dates, limits and what the coupon applies to', () => {
    expect(couponProblem(coupon(), target)).toBeNull()
    expect(couponProblem(coupon({ active: false }), target)).toBe('invalid')
    expect(couponProblem(coupon({ validFrom: '2026-11-01T00:00:00Z' }), target)).toBe('invalid')
    expect(couponProblem(coupon({ validTo: '2026-10-01T00:00:00Z' }), target)).toBe('expired')
    expect(couponProblem(coupon({ products: [{ id: 9 }] }), target)).toBe('not_applicable')
    expect(couponProblem(coupon({ products: [1], plans: [3] }), target)).toBe('not_applicable')
    expect(couponProblem(coupon({ products: [1], plans: [{ id: 2 }] }), target)).toBeNull()
    expect(couponProblem(coupon({ maxRedemptions: 5, redemptions: 5 }), target)).toBe('used_up')
    expect(couponProblem(coupon({ maxRedemptions: 5, redemptions: 4 }), target)).toBeNull()
  })
})
