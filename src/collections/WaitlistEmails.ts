import type { CollectionConfig } from 'payload'

import { leadHandlers, nobody, ownerOnly } from '@/access/roles'

/** Written only by server code: staff can't set or change it through the admin or REST. */
const fixed = { create: () => false, update: () => false }
const readOnly = { readOnly: true } as const

/**
 * "Email this waitlist" (spec §10, §13): the Owner writes a plain-text message for one product's
 * waitlist and sends it. It goes only to leads whose marketing consent is given, not withdrawn
 * and not unsubscribed, once per address, with a one-click unsubscribe link.
 */
export const WaitlistEmails: CollectionConfig = {
  slug: 'waitlist-emails',
  labels: { singular: 'Waitlist email', plural: 'Waitlist emails' },
  admin: {
    group: 'Leads',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'product', 'status', 'sent', 'sentAt'],
  },
  defaultSort: '-createdAt',
  access: { read: leadHandlers, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    { name: 'subject', type: 'text', localized: true, required: true, maxLength: 150 },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      required: true,
      maxLength: 5000,
      admin: {
        rows: 12,
        description:
          'Plain text; a blank line starts a new paragraph. The greeting and the unsubscribe link are added.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'sending', 'sent'],
      index: true,
      access: fixed,
      admin: { ...readOnly, position: 'sidebar' },
    },
    {
      name: 'recipients',
      type: 'number',
      access: fixed,
      admin: { ...readOnly, position: 'sidebar', description: 'Addresses when sending started.' },
    },
    {
      name: 'sent',
      type: 'number',
      defaultValue: 0,
      access: fixed,
      admin: { ...readOnly, position: 'sidebar' },
    },
    { name: 'sentAt', type: 'date', access: fixed, admin: { ...readOnly, position: 'sidebar' } },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      access: fixed,
      admin: { ...readOnly, position: 'sidebar' },
    },
  ],
}

/**
 * One row per waitlist email and address (a hash: one address can have several waitlist leads),
 * claimed before the send, so a retried job never emails anyone twice.
 */
export const WaitlistDeliveries: CollectionConfig = {
  slug: 'waitlist-deliveries',
  admin: { group: 'Leads', hidden: true },
  access: { read: ownerOnly, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['email', 'addressHash'], unique: true }],
  fields: [
    {
      name: 'email',
      type: 'relationship',
      relationTo: 'waitlist-emails',
      required: true,
      index: true,
    },
    { name: 'lead', type: 'relationship', relationTo: 'leads' },
    { name: 'addressHash', type: 'text', required: true },
    { name: 'claimedAt', type: 'date', required: true },
    { name: 'sentAt', type: 'date' },
  ],
}
