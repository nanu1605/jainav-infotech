import type { PayloadRequest } from 'payload'

import { hasRole } from '@/access/roles'

import { ActionButton } from './ActionButton'

type Props = { id?: number | string; user: PayloadRequest['user'] }

/** "Resend license email" above a license (spec §10): Owner and Support. */
export function LicenseActions({ id, user }: Props) {
  if (!id || !hasRole(user, 'owner', 'support')) return null
  return (
    <ActionButton
      path={`/licenses/${id}/resend-email`}
      label="Resend license email"
      done="The license email is on its way."
      confirm={{
        heading: 'Resend the license email?',
        body: 'The customer gets the license key by email again, in their language.',
        label: 'Send',
      }}
    />
  )
}
