import type { PayloadRequest } from 'payload'

import { hasRole } from '@/access/roles'

import { ActionButton } from './ActionButton'

type Props = { id?: number | string; user: PayloadRequest['user'] }

/** "Re-render PDF" above an invoice or credit note (spec §10): Owner only. Same number. */
export function InvoiceActions({ id, user }: Props) {
  if (!id || !hasRole(user, 'owner')) return null
  return (
    <ActionButton
      path={`/invoices/${id}/render-pdf`}
      label="Re-render PDF"
      done="A new PDF replaced the archived one. The number and amounts are unchanged."
    />
  )
}
