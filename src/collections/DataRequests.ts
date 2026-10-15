import type { CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'

import { leadHandlers, nobody, ownerOnly } from '@/access/roles'

import { normalizeEmail } from './Leads'

const CLOSED = ['completed', 'rejected']

/** The request as submitted is a record; the API ignores staff edits to it. */
const record: { update: FieldAccess } = { update: () => false }

/** Records who closed a request and when, unless staff filled it in already. */
const stampHandled: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (CLOSED.includes(data.status) && data.status !== originalDoc?.status) {
    data.handledAt ??= new Date().toISOString()
    data.handledBy ??= req.user?.id
  }
  return data
}

/** DPDP rights requests (spec §16): handled by Support or Owner, created only by the Phase 4 form. */
export const DataRequests: CollectionConfig = {
  slug: 'data-requests',
  admin: {
    group: 'Leads',
    useAsTitle: 'email',
    defaultColumns: ['email', 'type', 'status', 'createdAt'],
    listSearchableFields: ['email'],
  },
  access: {
    read: leadHandlers,
    create: nobody,
    update: leadHandlers,
    delete: ownerOnly,
  },
  hooks: { beforeChange: [stampHandled] },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      access: record,
      hooks: { beforeValidate: [normalizeEmail] },
      admin: { readOnly: true },
    },
    {
      name: 'type',
      type: 'select',
      options: ['access', 'correction', 'erasure', 'withdraw-consent', 'grievance'],
      required: true,
      access: record,
      admin: { readOnly: true },
    },
    { name: 'details', type: 'textarea', access: record, admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      options: ['new', 'in-progress', 'completed', 'rejected'],
      defaultValue: 'new',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'handledBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    { name: 'handledAt', type: 'date', admin: { position: 'sidebar' } },
  ],
}
