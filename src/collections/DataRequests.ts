import type { CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'

import { leadHandlers, nobody, ownerOnly } from '@/access/roles'
import { routing } from '@/i18n/routing'
import { DATA_REQUEST_TYPES } from '@/lib/forms/schemas'

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

/**
 * DPDP rights requests and grievances (spec §16): handled by Support or Owner, created only by the
 * Phase 4 form. The form sets the ticket number and the due dates the legal pages publish; staff
 * correct the dates if a complaint reached us before it was entered.
 */
export const DataRequests: CollectionConfig = {
  slug: 'data-requests',
  admin: {
    group: 'Leads',
    useAsTitle: 'ticketNumber',
    defaultColumns: ['ticketNumber', 'email', 'type', 'status', 'dueAt', 'createdAt'],
    listSearchableFields: ['ticketNumber', 'email'],
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
      name: 'ticketNumber',
      type: 'text',
      unique: true,
      access: record,
      admin: { readOnly: true, description: 'Quoted in the acknowledgement email.' },
    },
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
      options: [...DATA_REQUEST_TYPES],
      required: true,
      access: record,
      admin: { readOnly: true },
    },
    { name: 'details', type: 'textarea', access: record, admin: { readOnly: true } },
    {
      name: 'locale',
      type: 'select',
      options: [...routing.locales],
      access: record,
      admin: { readOnly: true, description: 'The language of the page it was sent from.' },
    },
    {
      name: 'status',
      type: 'select',
      options: ['new', 'in-progress', 'completed', 'rejected'],
      defaultValue: 'new',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'dueAt',
      label: 'Answer by',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'One month from receipt. A daily reminder goes out until it is closed. Correct it if the request arrived before it was entered.',
      },
    },
    {
      name: 'acknowledgeBy',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Grievances: 48 hours from receipt. Correct it if the complaint arrived before it was entered.',
      },
    },
    {
      name: 'acknowledgedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Set when the automatic email goes out. If it failed, reply by hand with the ticket number and enter the time.',
      },
    },
    // The acknowledgement job's claim, so parallel runs send it once.
    {
      name: 'ackClaimedAt',
      type: 'date',
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'handledBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    { name: 'handledAt', type: 'date', admin: { position: 'sidebar' } },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      access: record,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Set when the request was sent while signed in to a store account.',
      },
    },
  ],
}
