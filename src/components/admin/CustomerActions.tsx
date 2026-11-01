import type { Payload, PayloadRequest } from 'payload'

import { hasRole } from '@/access/roles'

import { ActionButton } from './ActionButton'

type Props = { id?: number | string; payload: Payload; user: PayloadRequest['user'] }

/**
 * "Delete account" above a customer: the Owner's way to do what the customer's own Settings page
 * does, for someone who can't use it. The endpoint checks the role again.
 */
export async function CustomerActions({ id, payload, user }: Props) {
  if (!id || !hasRole(user, 'owner')) return null
  const customer = await payload
    .findByID({ collection: 'customers', id, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!customer || customer.deletedAt) return null
  return (
    <ActionButton
      path={`/customers/${id}/delete-account`}
      label="Delete account"
      done="The account is deleted: the profile is anonymized and marketing consent withdrawn."
      confirm={{
        heading: 'Delete this customer’s account?',
        body: 'This replaces their email, clears their name, phone and billing details, withdraws their marketing consent and ends every session. Orders, invoices and licenses stay. It can’t be undone.',
        label: 'Delete account',
      }}
    />
  )
}
