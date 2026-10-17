import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type FieldAccess,
  type PayloadHandler,
} from 'payload'

import { leadHandlers, nobody, ownerOnly } from '@/access/roles'

/** Written only by server code: staff can't set or change it through the admin or REST. */
const fixed = { create: () => false, update: () => false }
const readOnly = { readOnly: true } as const
/** The message can change only while it is a draft (also shows it read-only once sent). */
const draftOnly = { update: (({ doc }) => !doc || doc.status === 'draft') as FieldAccess }

const SENT = 'This email has been sent: only drafts can be changed or deleted.'

const changeDraftsOnly: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (operation === 'update' && req.user && originalDoc?.status !== 'draft') {
    throw new APIError(SENT, 409)
  }
  return data
}

// Deliveries keep their email (email_id is NOT NULL), so a sent email can't go anyway.
const deleteDraftsOnly: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doc = await req.payload.findByID({
    collection: 'waitlist-emails',
    id,
    select: { status: true },
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (doc.status !== 'draft') throw new APIError(SENT, 409)
}

// Server-only code, loaded on use: the Payload CLI reads this config too.
const lazy =
  (name: 'recipientsHandler' | 'sendHandler'): PayloadHandler =>
  async (req) =>
    (await import('@/lib/waitlist'))[name](req)

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
    description:
      'A message to one product’s waitlist. It goes once per address, only to people who ticked the box for launch emails and haven’t withdrawn or unsubscribed. People who signed up in Hindi get the Hindi version when its subject and message are both written, else the English one. Save, send yourself a test, then send.',
    components: {
      edit: { beforeDocumentControls: ['@/components/admin/WaitlistActions#WaitlistActions'] },
    },
  },
  defaultSort: '-createdAt',
  access: { read: leadHandlers, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  hooks: { beforeChange: [changeDraftsOnly], beforeDelete: [deleteDraftsOnly] },
  endpoints: [
    { path: '/:id/recipients', method: 'get', handler: lazy('recipientsHandler') },
    { path: '/:id/send', method: 'post', handler: lazy('sendHandler') },
  ],
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      access: draftOnly,
    },
    {
      name: 'subject',
      type: 'text',
      localized: true,
      required: true,
      maxLength: 150,
      access: draftOnly,
    },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      required: true,
      maxLength: 5000,
      access: draftOnly,
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
