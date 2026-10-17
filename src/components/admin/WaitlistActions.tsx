import type { BeforeDocumentControlsServerProps } from 'payload'

import { hasRole } from '@/access/roles'

import { WaitlistSend } from './WaitlistSend'

/** "Email this waitlist" controls on a saved waitlist email, for the Owner only. */
export async function WaitlistActions({ id, payload, user }: BeforeDocumentControlsServerProps) {
  if (!id || !hasRole(user ?? null, 'owner')) return null
  const email = await payload.findByID({
    collection: 'waitlist-emails',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!email) return null
  return (
    <WaitlistSend
      id={email.id}
      status={email.status}
      recipients={email.recipients ?? 0}
      sent={email.sent ?? 0}
    />
  )
}
