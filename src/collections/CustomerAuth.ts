import type { CollectionConfig } from 'payload'

import { nobody, ownerOnly } from '@/access/roles'

/**
 * Sign-in codes (spec §11.2): only keyed hashes of the email and the code are stored. Server code
 * reads and writes them; the owner can look, nobody edits.
 */
export const OtpChallenges: CollectionConfig = {
  slug: 'otp-challenges',
  admin: { group: 'System', hidden: true },
  access: { read: ownerOnly, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'emailHash', type: 'text', required: true, index: true },
    { name: 'codeHmac', type: 'text', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'attempts', type: 'number', defaultValue: 0, required: true },
    { name: 'ipHash', type: 'text' },
  ],
}

/** Customer sessions (spec §11.2): the cookie holds a random token; only its SHA-256 is stored. */
export const CustomerSessions: CollectionConfig = {
  slug: 'customer-sessions',
  admin: { group: 'System', hidden: true },
  access: { read: ownerOnly, create: nobody, update: nobody, delete: ownerOnly },
  fields: [
    { name: 'tokenHash', type: 'text', required: true, unique: true, index: true },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'userAgent', type: 'text' },
  ],
}
