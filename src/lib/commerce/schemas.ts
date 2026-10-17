// zod/mini: also validates in the browser (see lib/forms/schemas.ts). Error messages are keys
// into `forms.errors` or `checkout.errors`; the forms translate them.
import * as z from 'zod/mini'

import { routing } from '@/i18n/routing'
import { gstinState, normalizeGstin } from '@/lib/tax/gstin'
import { isStateCode } from '@/lib/tax/states'

/** Version of the marketing-consent wording on the account settings page (`account.settings`). */
export const ACCOUNT_MARKETING_VERSION = '2026-10-17'

/** Payload's email rule (lib/forms/schemas.ts). */
const PAYLOAD_EMAIL =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

export const emailSchema = z.pipe(
  z.string().check(z.trim(), z.toLowerCase(), z.maxLength(254, 'tooLong')),
  z.email('email').check(z.regex(PAYLOAD_EMAIL, 'email')),
)

/**
 * Invoices use a Latin font (spec §11.3): billing text is limited to the characters it has
 * (printable ASCII and Latin-1, e.g. é, ü). The form shows a hint instead of failing silently.
 */
export const LATIN = /^[\x20-\x7E -ÿ]*$/
const latin = (max: number, min = 0) =>
  z
    .string()
    .check(
      z.trim(),
      z.maxLength(max, 'tooLong'),
      z.minLength(min, 'required'),
      z.regex(LATIN, 'latinOnly'),
    )

const phone = z.string().check(z.trim(), z.regex(/^$|^\+?[\d\s()-]{7,20}$/, 'phone'))
const state = z.string().check(z.refine(isStateCode, 'choose'))
const gstin = z.pipe(
  // Spaces anywhere go (a pasted "27 AAPFU 0939F1ZV"); stored and printed as 15 characters.
  z.string().check(z.overwrite(normalizeGstin)),
  z.string().check(z.refine((v) => v === '' || gstinState(v) !== null, 'gstin')),
)
const couponCode = z.string().check(z.trim(), z.toUpperCase(), z.maxLength(32, 'tooLong'))
const slug = z.string().check(z.regex(/^[a-z0-9-]{1,100}$/, 'invalid'))
const locale = z.enum(routing.locales)

// ─── Account (spec §11.2) ──────────────────────────────────────────────────────────────────

/** POST /api/v1/account/otp/request → `{ ok: true, resendIn }` (seconds until another code). */
export const otpRequestSchema = z.object({ email: emailSchema, locale, turnstile: z.string() })

/** POST /api/v1/account/otp/verify → `{ ok: true }` and the session cookie. */
export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().check(z.regex(/^\d{6}$/, 'code')),
})

/**
 * POST /api/v1/account/licenses/deactivate → `{ ok: true }`, or 409 `deactivationLimit` with
 * `resetsAt` (an ISO instant: midnight IST on the 1st of next month).
 */
export const deactivateDeviceSchema = z.object({
  activationId: z.number().check(z.int(), z.positive()),
})

/** POST /api/v1/account/profile → `{ ok: true }`. A valid GSTIN sets (and locks) the state. */
export const profileSchema = z.object({
  name: latin(100),
  phone,
  preferredLocale: locale,
  state: z.union([z.literal(''), state]),
  businessName: latin(100),
  gstin,
  marketing: z.boolean(),
})

// ─── Checkout (spec §11.3) ─────────────────────────────────────────────────────────────────

export const billingSchema = z.object({
  name: latin(100, 2),
  phone,
  state,
  businessName: latin(100),
  gstin,
})
export type Billing = z.infer<typeof billingSchema>

/** POST /api/v1/checkout/quote → `{ ok: true, quote: QuoteView }` or `{ error: 'coupon', reason }`. */
export const quoteSchema = z.object({
  product: slug,
  plan: slug,
  coupon: couponCode,
  state,
  gstin,
})

/** POST /api/v1/checkout/create → `{ ok: true, order, razorpay: CheckoutOptions }`. */
export const createSchema = z.object({
  product: slug,
  plan: slug,
  coupon: couponCode,
  billing: billingSchema,
  /** The required "I accept the Terms and the EULA" box (spec §11.3 step 2). */
  accept: z.literal(true, 'accept'),
  locale,
})

/** POST /api/v1/checkout/verify (Razorpay Checkout's success handler) → `{ ok: true, status }`. */
export const verifySchema = z.object({
  razorpay_order_id: z.string().check(z.regex(/^order_\w{1,40}$/)),
  razorpay_payment_id: z.string().check(z.regex(/^pay_\w{1,40}$/)),
  razorpay_signature: z.string().check(z.regex(/^[a-f0-9]{64}$/)),
})

// ─── Responses ─────────────────────────────────────────────────────────────────────────────

/** Paise. `mode` none: GST is off, so no "incl. GST" and no tax lines (spec §11.1, §11.4). */
export type QuoteView = {
  subtotal: number
  discount: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  total: number
  mode: 'cgst_sgst' | 'igst' | 'none'
  ratePercent: number
  /** The coupon applied, normalized; null without one. */
  coupon: string | null
}

/** What the browser needs to open Razorpay Checkout (spec §11.3 step 4). */
export type CheckoutOptions = {
  /** checkout.js, or the development gateway's stand-in when no Razorpay keys are set. */
  script: string
  key: string
  order_id: string
  amount: number
  currency: 'INR'
  name: string
  description: string
  prefill: { name: string; email: string; contact: string }
  notes: { order: string }
}

export type CreateResponse = {
  ok: true
  order: { number: string; total: number }
  razorpay: CheckoutOptions
}

/** Errors every store endpoint can answer with, besides `invalid` (with an optional field). */
export type StoreError =
  | 'invalid'
  | 'verification'
  | 'rateLimited'
  | 'cooldown'
  | 'invalidCode'
  | 'codeExpired'
  | 'signedOut'
  | 'coupon'
  | 'unavailable'
  | 'mismatch'
  | 'notFound'
  | 'deactivationLimit'
  | 'server'
