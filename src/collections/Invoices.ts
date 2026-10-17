import type { CollectionBeforeChangeHook, CollectionConfig, Field } from 'payload'

import { nobody, ownerOnly, storeStaff } from '@/access/roles'

import { TAX_MODES } from './Orders'

const money = (name: string, label?: string): Field => ({
  name,
  label,
  type: 'number',
  required: true,
  defaultValue: 0,
})

const party = (name: string, extra: Field[]): Field => ({
  name,
  type: 'group',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'stateName', type: 'text', required: true },
        { name: 'stateCode', type: 'text', required: true },
        { name: 'gstin', label: 'GSTIN', type: 'text' },
      ],
    },
    ...extra,
  ],
})

/**
 * Invoices never change after issue (spec §11.4); corrections are credit notes. Only the PDF link
 * may be set later (by the renderInvoicePdf job). This holds even for server code using
 * overrideAccess, which the API's `update: nobody` doesn't stop.
 */
const immutable: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) =>
  operation === 'update' && originalDoc
    ? { ...originalDoc, pdf: data.pdf ?? originalDoc.pdf }
    : data

/**
 * Tax invoices and credit notes (spec §9.1, §11.4). The fulfilment transaction writes them with a
 * number from invoice-counters; seller and buyer details are snapshots, so later settings or
 * profile changes never alter an issued invoice.
 */
export const Invoices: CollectionConfig = {
  slug: 'invoices',
  admin: {
    group: 'Store',
    useAsTitle: 'number',
    defaultColumns: ['number', 'kind', 'order', 'issuedAt', 'totals.total'],
    listSearchableFields: ['number'],
    description:
      'Amounts are in paise. Issued invoices are read-only: correct them with a credit note.',
  },
  defaultSort: '-issuedAt',
  access: { read: storeStaff, create: nobody, update: nobody, delete: nobody },
  hooks: { beforeChange: [immutable] },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'number', type: 'text', required: true, unique: true, maxLength: 16 },
        {
          name: 'kind',
          type: 'select',
          options: [
            { label: 'Invoice', value: 'invoice' },
            { label: 'Credit note', value: 'credit-note' },
          ],
          required: true,
          defaultValue: 'invoice',
        },
        { name: 'financialYear', type: 'text', required: true, index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
        { name: 'issuedAt', type: 'date', required: true, index: true },
        {
          name: 'originalInvoice',
          type: 'relationship',
          relationTo: 'invoices',
          admin: { description: 'Credit notes: the invoice they correct.' },
        },
      ],
    },
    { name: 'pdf', label: 'PDF', type: 'upload', relationTo: 'private-files' },
    party('seller', [
      {
        type: 'row',
        fields: [
          { name: 'legalName', type: 'text', required: true },
          { name: 'cin', label: 'CIN', type: 'text' },
        ],
      },
      { name: 'address', type: 'textarea' },
    ]),
    party('buyer', [
      {
        type: 'row',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'businessName', type: 'text' },
        ],
      },
      {
        type: 'row',
        fields: [
          { name: 'email', type: 'email' },
          { name: 'country', type: 'text', required: true, defaultValue: 'IN' },
        ],
      },
    ]),
    {
      type: 'row',
      fields: [
        { name: 'taxMode', type: 'select', options: TAX_MODES, required: true },
        { name: 'sacCode', label: 'SAC', type: 'text' },
        { name: 'reverseCharge', type: 'checkbox', defaultValue: false },
        { name: 'currency', type: 'text', required: true, defaultValue: 'INR' },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'description', type: 'text', required: true },
        {
          type: 'row',
          fields: [
            { name: 'qty', type: 'number', required: true, defaultValue: 1 },
            money('unitPrice', 'Unit price'),
            money('discount'),
            money('taxable'),
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'ratePercent', type: 'number', required: true, defaultValue: 0 },
            money('cgst', 'CGST'),
            money('sgst', 'SGST'),
            money('igst', 'IGST'),
            money('total'),
          ],
        },
      ],
    },
    {
      name: 'totals',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [money('subtotal'), money('discount'), money('taxable')],
        },
        {
          type: 'row',
          fields: [
            money('cgst', 'CGST'),
            money('sgst', 'SGST'),
            money('igst', 'IGST'),
            money('total'),
          ],
        },
      ],
    },
  ],
}

/** Consecutive invoice numbers per series (prefix) and financial year (spec §11.4). */
export const InvoiceCounters: CollectionConfig = {
  slug: 'invoice-counters',
  admin: {
    group: 'System',
    useAsTitle: 'series',
    defaultColumns: ['series', 'financialYear', 'next'],
  },
  access: { read: ownerOnly, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['series', 'financialYear'], unique: true }],
  fields: [
    { name: 'series', type: 'text', required: true },
    { name: 'financialYear', type: 'text', required: true },
    { name: 'next', type: 'number', required: true, defaultValue: 1 },
  ],
}
