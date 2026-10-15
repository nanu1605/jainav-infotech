import type { CollectionConfig, FieldAccess, FieldHook } from 'payload'

import { leadHandlers, nobody, ownerOnly, staff } from '@/access/roles'
import { routing } from '@/i18n/routing'

/** Emails are matched across leads and data requests, so store them normalized. */
export const normalizeEmail: FieldHook = ({ value }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value

// Only server code (Local API, overrideAccess) ever reads or writes the token hash.
const noFieldAccess: FieldAccess = () => false

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
      // What the visitor submitted and agreed to is a record, not something staff edit.
      type: 'collapsible',
      label: 'Submission',
      admin: { readOnly: true },
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
        },
        { name: 'product', type: 'relationship', relationTo: 'products' },
        { name: 'name', type: 'text' },
        {
          name: 'email',
          type: 'email',
          required: true,
          index: true,
          hooks: { beforeValidate: [normalizeEmail] },
        },
        { name: 'phone', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'message', type: 'textarea' },
        { name: 'details', type: 'json' },
        { name: 'locale', type: 'select', options: [...routing.locales] },
        {
          name: 'source',
          type: 'group',
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
            { name: 'given', type: 'checkbox' },
            { name: 'at', type: 'date' },
            { name: 'textVersion', type: 'text' },
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
        { name: 'confirmedAt', type: 'date' },
        { name: 'unsubscribedAt', type: 'date' },
      ],
    },
  ],
}
