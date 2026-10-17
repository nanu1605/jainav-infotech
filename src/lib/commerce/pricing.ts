import { istDate } from '@/lib/format'
import { computeTax, divRoundHalfUp, type Tax, type TaxSettings } from '@/lib/tax/gst'

/** Razorpay's smallest charge: a coupon can't bring the total under ₹1 (spec §11.5). */
export const MIN_TOTAL = 100

export type CouponTerms = {
  kind: 'percent' | 'fixed'
  /** Whole percent (1–100) or paise. */
  value: number
  active?: boolean | null
  validFrom?: string | null
  validTo?: string | null
  maxRedemptions?: number | null
  redemptions?: number | null
  /** Ids the coupon is limited to; empty means every product / plan. */
  products?: (number | { id: number })[] | null
  plans?: (number | { id: number })[] | null
}

export type CouponProblem = 'invalid' | 'expired' | 'not_applicable' | 'used_up' | 'too_large'

const ids = (list: CouponTerms['products']) =>
  (list ?? []).map((item) => (typeof item === 'object' ? item.id : item))

/** Why a coupon can't be used on this plan right now, or null. Per-customer limits need the DB. */
export function couponProblem(
  coupon: CouponTerms,
  { productId, planId, now = new Date() }: { productId: number; planId: number; now?: Date },
): CouponProblem | null {
  if (!coupon.active) return 'invalid'
  // Whole days in India time: the admin's date picker stores a day, not an instant (spec §3).
  const today = istDate(now)
  if (coupon.validFrom && today < istDate(new Date(coupon.validFrom))) return 'invalid'
  if (coupon.validTo && today > istDate(new Date(coupon.validTo))) return 'expired'
  const products = ids(coupon.products)
  const plans = ids(coupon.plans)
  if (products.length && !products.includes(productId)) return 'not_applicable'
  if (plans.length && !plans.includes(planId)) return 'not_applicable'
  if (coupon.maxRedemptions != null && (coupon.redemptions ?? 0) >= coupon.maxRedemptions) {
    return 'used_up'
  }
  return null
}

/** Applied before tax (spec §11.5), never more than the price. */
export const discountFor = (subtotal: number, coupon: CouponTerms | null) =>
  !coupon
    ? 0
    : Math.min(
        subtotal,
        coupon.kind === 'percent' ? divRoundHalfUp(subtotal * coupon.value, 100) : coupon.value,
      )

export type Quote = { subtotal: number; discount: number; tax: Tax; total: number }

/** The price breakdown for one unit of a plan (quantity is fixed at 1, spec §11.3). */
export function quote(
  unitPrice: number,
  coupon: CouponTerms | null,
  buyerStateCode: string,
  settings: TaxSettings,
): Quote {
  const discount = discountFor(unitPrice, coupon)
  const tax = computeTax(unitPrice - discount, buyerStateCode, settings)
  return { subtotal: unitPrice, discount, tax, total: tax.total }
}
