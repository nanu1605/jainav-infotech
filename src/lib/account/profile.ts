import 'server-only'

import type { Payload } from 'payload'
import type * as z from 'zod/mini'

import { ACCOUNT_MARKETING_VERSION, type profileSchema } from '@/lib/commerce/schemas'
import { gstinState } from '@/lib/tax/gstin'
import type { StateCode } from '@/lib/tax/states'
import type { Customer } from '@/payload-types'

/**
 * Saves the settings page (spec §11.2). A valid GSTIN sets the billing state (place of supply,
 * spec §11.4). Ticking marketing emails records the consent; unticking withdraws it (spec §16).
 */
export async function updateProfile(
  payload: Payload,
  customer: Customer,
  values: z.infer<typeof profileSchema>,
) {
  const now = new Date().toISOString()
  const consent = customer.marketingConsent
  const consenting = Boolean(consent?.given && !consent.withdrawnAt)
  const marketingConsent =
    values.marketing && !consenting
      ? { given: true, at: now, textVersion: ACCOUNT_MARKETING_VERSION, withdrawnAt: null }
      : !values.marketing && consenting
        ? { ...consent, withdrawnAt: now }
        : undefined
  const gstin = values.gstin || null
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: {
      name: values.name || null,
      phone: values.phone || null,
      preferredLocale: values.preferredLocale,
      businessName: values.businessName || null,
      gstin,
      state: (gstin && gstinState(gstin)) || (values.state as StateCode) || null,
      ...(marketingConsent && { marketingConsent }),
    },
    overrideAccess: true,
    depth: 0,
  })
}

/**
 * Deletes an account (spec §11.2): the profile is anonymized and every session ends. Orders and
 * invoices stay, with the billing details they were issued with, for the period tax law requires.
 */
export async function anonymizeCustomer(payload: Payload, customer: Customer) {
  const now = new Date().toISOString()
  const consent = customer.marketingConsent
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: {
      // `.invalid` can never receive mail, so nobody can sign in to the old account again.
      email: `deleted-${customer.id}@deleted.invalid`,
      name: null,
      phone: null,
      businessName: null,
      gstin: null,
      state: null,
      status: 'deleted',
      deletedAt: now,
      marketingConsent:
        consent?.given && !consent.withdrawnAt ? { ...consent, withdrawnAt: now } : consent,
    },
    overrideAccess: true,
    depth: 0,
  })
  await payload.delete({
    collection: 'customer-sessions',
    where: { customer: { equals: customer.id } },
    overrideAccess: true,
    depth: 0,
  })
}
