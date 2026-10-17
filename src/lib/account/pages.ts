import 'server-only'

import { notFound } from 'next/navigation'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { getCustomer } from '@/lib/account/session'
import { storeOpen } from '@/lib/commerce/store'
import type { Customer, Order } from '@/payload-types'

/** Orders a customer sees: paid at some point. `created` and `expired` never show. */
export const PAID_STATUSES = ['paid', 'refunded', 'partially-refunded', 'disputed'] as const

const SIGN_IN = '/account/sign-in'

/**
 * Where to go after signing in (open-redirect guard): a local, locale-less path such as
 * `/checkout/vyro/pro`, else `/account`. No `//` or `/\` (other hosts), no whitespace or control
 * characters (browsers drop tabs and newlines, which would turn `/\t/x` into `//x`), and never the
 * sign-in page itself, which would redirect to itself.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?![/\\])[^\\\s\p{Cc}]*$/u.test(value)) return '/account'
  return value === SIGN_IN || value.startsWith(`${SIGN_IN}?`) || value.startsWith(`${SIGN_IN}/`)
    ? '/account'
    : value
}

/**
 * The signed-in customer for an account page at `path`. A closed store is a 404; a signed-out
 * visitor goes to sign-in and comes back here.
 */
export async function requireCustomer(locale: Locale, path: string): Promise<Customer> {
  if (!(await storeOpen())) notFound()
  const customer = await getCustomer()
  if (!customer) return redirect({ href: { pathname: SIGN_IN, query: { next: path } }, locale })
  return customer
}

/** "VYRO Pro" per item, as the customer bought it (the invoice text when a name is missing). */
export const orderLabel = (order: Order) =>
  order.items
    .map((item) => {
      const product = typeof item.product === 'object' ? item.product.name : ''
      const plan = typeof item.plan === 'object' ? (item.plan.name ?? '') : ''
      return [product, plan].filter(Boolean).join(' ') || item.description
    })
    .join(', ')
