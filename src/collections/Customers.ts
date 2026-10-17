import { APIError, type CollectionBeforeDeleteHook, type CollectionConfig } from 'payload'

import { ownerOnly, ownerOnlyField, storeStaff } from '@/access/roles'
import { routing } from '@/i18n/routing'
import { gstinState } from '@/lib/tax/gstin'
import { GST_STATES } from '@/lib/tax/states'

import { normalizeEmail } from './Leads'

/** What the customer agreed to is a record: the API ignores staff input to it, on create too. */
const record = { create: () => false, update: () => false }

/**
 * Orders and invoices must be kept for the tax period (spec §11.2): such customers are anonymized
 * instead. Others go with their sessions (the sessions' customer column can't be emptied).
 */
const keepBuyers: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'orders',
    where: { customer: { equals: id } },
    overrideAccess: true,
    req,
  })
  if (totalDocs) {
    throw new APIError(
      'This customer has orders, which tax law requires keeping: anonymize the profile instead of deleting it.',
      400,
    )
  }
  const licenses = await req.payload.count({
    collection: 'licenses',
    where: { customer: { equals: id } },
    overrideAccess: true,
    req,
  })
  if (licenses.totalDocs) {
    throw new APIError('This customer has licenses: revoke or keep them instead of deleting.', 400)
  }
  await req.payload.delete({
    collection: 'customer-sessions',
    where: { customer: { equals: id } },
    overrideAccess: true,
    req,
  })
}

/**
 * Store customers (spec §9.1, §11.2): a plain collection, not Payload auth. They sign in with an
 * email code (customer-sessions); only server code creates them. Owner + Support read; Support's
 * edits are limited to contact details.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: {
    group: 'Store',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'state', 'status', 'createdAt'],
    listSearchableFields: ['email', 'name', 'businessName'],
  },
  access: {
    read: storeStaff,
    // The Owner adds someone new to give them a complimentary license (Store → Licenses).
    create: ownerOnly,
    update: storeStaff,
    delete: ownerOnly,
  },
  // A copy would carry the source's consent record (group subfields escape create access).
  disableDuplicate: true,
  hooks: { beforeDelete: [keepBuyers] },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      access: { update: ownerOnlyField },
      hooks: { beforeValidate: [normalizeEmail] },
    },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', maxLength: 100, admin: { width: '50%' } },
        { name: 'phone', type: 'text', maxLength: 25, admin: { width: '50%' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Billing',
      fields: [
        {
          name: 'country',
          type: 'text',
          defaultValue: 'IN',
          access: { update: ownerOnlyField },
          admin: { description: 'ISO code. India only while international sales are off.' },
        },
        {
          name: 'state',
          type: 'select',
          options: Object.entries(GST_STATES).map(([value, label]) => ({ label, value })),
          admin: { description: 'Place of supply. A GSTIN sets it.' },
        },
        { name: 'businessName', type: 'text', maxLength: 100 },
        {
          name: 'gstin',
          label: 'GSTIN',
          type: 'text',
          validate: (value: string | null | undefined) =>
            !value || gstinState(value) ? true : 'Not a valid GSTIN',
        },
      ],
    },
    {
      name: 'preferredLocale',
      type: 'select',
      options: routing.locales.map((value) => ({ label: value, value })),
      defaultValue: routing.defaultLocale,
      required: true,
      admin: { position: 'sidebar', description: 'Emails are sent in this language.' },
    },
    {
      name: 'status',
      type: 'select',
      options: ['active', 'deleted'],
      defaultValue: 'active',
      required: true,
      index: true,
      access: { update: ownerOnlyField },
      admin: { position: 'sidebar' },
    },
    { name: 'deletedAt', type: 'date', access: record, admin: { position: 'sidebar' } },
    {
      name: 'marketingConsent',
      type: 'group',
      access: record,
      admin: { description: 'Changed by the customer on their account page.' },
      fields: [
        { name: 'given', type: 'checkbox' },
        { name: 'at', type: 'date' },
        { name: 'textVersion', type: 'text' },
        { name: 'withdrawnAt', type: 'date' },
      ],
    },
  ],
}
