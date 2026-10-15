import type { CollectionConfig, FieldAccess, FieldHook } from 'payload'

import { leadHandlers, nobody, ownerOnly, staff } from '@/access/roles'
import { routing } from '@/i18n/routing'

/** Emails are matched across leads and data requests, so store them normalized. */
export const normalizeEmail: FieldHook = ({ value }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value

// Only server code (Local API, overrideAccess) ever reads or writes the token hash.
const noFieldAccess: FieldAccess = () => false
/**
 * What the visitor submitted and agreed to is a record: the API ignores staff edits to it
 * (admin readOnly only hides the inputs). Server code writes it with overrideAccess.
 */
const record = { update: noFieldAccess }

/**
 * Form submissions (spec §9.1, §13). Personal data: staff-only reads, and never created through
 * REST — the Phase 4 forms API writes through the Local API.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    group: 'Leads',
    useAsTitle: 'email',
    defaultColumns: ['email', 'type', 'product', 'status', 'createdAt'],
    listSearchableFields: ['email', 'name', 'company'],
  },
  access: {
    read: staff,
    create: nobody,
    update: leadHandlers,
    delete: ownerOnly,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      options: ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'],
      defaultValue: 'new',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    { name: 'notes', type: 'textarea', admin: { position: 'sidebar' } },
    {
      // What the visitor submitted and agreed to is a record: those fields deny updates (and so
      // render read-only); withdrawnAt and unsubscribedAt stay editable for staff.
      type: 'collapsible',
      label: 'Submission',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            'contact',
            'project',
            'waitlist',
            'newsletter',
            'demo',
            'careers',
            'partnership',
          ],
          required: true,
          index: true,
          access: record,
        },
        { name: 'product', type: 'relationship', relationTo: 'products', access: record },
        { name: 'name', type: 'text', access: record },
        {
          name: 'email',
          type: 'email',
          required: true,
          index: true,
          access: record,
          hooks: { beforeValidate: [normalizeEmail] },
        },
        { name: 'phone', type: 'text', access: record },
        { name: 'company', type: 'text', access: record },
        { name: 'message', type: 'textarea', access: record },
        { name: 'details', type: 'json', access: record },
        { name: 'locale', type: 'select', options: [...routing.locales], access: record },
        {
          name: 'source',
          type: 'group',
          access: record,
          fields: [
            { name: 'page', type: 'text' },
            { name: 'referrer', type: 'text' },
            {
              name: 'utm',
              label: 'UTM',
              type: 'group',
              fields: [
                { name: 'source', type: 'text' },
                { name: 'medium', type: 'text' },
                { name: 'campaign', type: 'text' },
                { name: 'term', type: 'text' },
                { name: 'content', type: 'text' },
              ],
            },
          ],
        },
        {
          name: 'consent',
          type: 'group',
          access: record,
          fields: [
            { name: 'textVersion', type: 'text' },
            { name: 'givenAt', type: 'date' },
            { name: 'ipHash', label: 'IP hash', type: 'text' },
          ],
        },
        {
          name: 'marketingConsent',
          type: 'group',
          fields: [
            { name: 'given', type: 'checkbox', access: record },
            { name: 'at', type: 'date', access: record },
            { name: 'textVersion', type: 'text', access: record },
            // Staff may record a withdrawal (spec §16: withdrawing is as easy as giving).
            { name: 'withdrawnAt', type: 'date' },
          ],
        },
        {
          name: 'confirmTokenHash',
          type: 'text',
          index: true, // Phase 4 newsletter confirm looks leads up by this hash
          access: { read: noFieldAccess, create: noFieldAccess, update: noFieldAccess },
          admin: { hidden: true },
        },
        { name: 'confirmedAt', type: 'date', access: record },
        { name: 'unsubscribedAt', type: 'date' },
      ],
    },
  ],
}
