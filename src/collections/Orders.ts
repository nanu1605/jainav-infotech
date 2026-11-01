import type { CollectionConfig, Field } from 'payload'

import { nobody, storeStaff } from '@/access/roles'
import { routing } from '@/i18n/routing'

export const ORDER_STATUSES = [
  'created',
  'paid',
  'refunded',
  'partially-refunded',
  'disputed',
  // A dispute lost: the bank returned the money. No credit note follows by itself.
  'chargeback',
  'expired',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Paise (spec §3). */
const money = (name: string, label?: string): Field => ({
  name,
  label,
  type: 'number',
  required: true,
  defaultValue: 0,
  admin: { step: 1 },
})

export const TAX_MODES = [
  { label: 'CGST + SGST (home state)', value: 'cgst_sgst' },
  { label: 'IGST (other state)', value: 'igst' },
  { label: 'No GST', value: 'none' },
]

/**
 * Store orders (spec §9.1, §11.3). Written only by the checkout, webhook and job code through the
 * Local API (and raw SQL inside the fulfilment transaction); Owner + Support read them. The
 * Owner's refund is a role-checked endpoint (spec §9.3) with its form above the document.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    group: 'Store',
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'status', 'total', 'paidAt', 'createdAt'],
    listSearchableFields: ['orderNumber', 'razorpayOrderId', 'razorpayPaymentId'],
    description: 'Amounts are in paise: 99900 = ₹999.',
    components: {
      edit: { beforeDocumentControls: ['@/components/admin/OrderActions#OrderActions'] },
    },
  },
  defaultSort: '-createdAt',
  access: { read: storeStaff, create: nobody, update: nobody, delete: nobody },
  endpoints: [
    {
      path: '/:id/refund',
      method: 'post',
      // Imported on use: server-only code can't load in the Payload CLI, which reads this config.
      handler: async (req) => (await import('@/lib/commerce/refunds')).refundEndpoint(req),
    },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'orderNumber',
          type: 'text',
          required: true,
          unique: true,
          admin: { width: '50%' },
        },
        {
          name: 'customer',
          type: 'relationship',
          relationTo: 'customers',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      options: [...ORDER_STATUSES],
      defaultValue: 'created',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'flags',
      type: 'select',
      hasMany: true,
      options: [{ label: 'Paid twice', value: 'paid-twice' }],
      admin: { position: 'sidebar' },
    },
    { name: 'paidAt', type: 'date', admin: { position: 'sidebar' } },
    {
      // Processed refunds of this order's payment (not of a duplicate one), in paise.
      name: 'amountRefunded',
      label: 'Refunded',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { position: 'sidebar', step: 1 },
    },
    {
      // Claimed in SQL before the confirmation is sent, so two job runs never send it twice.
      name: 'emailedAt',
      label: 'Confirmation emailed at',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'locale',
      type: 'select',
      options: routing.locales.map((value) => ({ label: value, value })),
      defaultValue: routing.defaultLocale,
      required: true,
      admin: { position: 'sidebar', description: 'Language of the order emails.' },
    },
    {
      // Quantity is fixed at 1 for now (spec §22).
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'product', type: 'relationship', relationTo: 'products', required: true },
            { name: 'plan', type: 'relationship', relationTo: 'plans', required: true },
            { name: 'qty', type: 'number', required: true, defaultValue: 1, min: 1 },
            money('unitPrice', 'Unit price'),
          ],
        },
        {
          name: 'description',
          type: 'text',
          required: true,
          admin: { description: 'As printed on the invoice.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'currency',
          type: 'select',
          options: ['INR'],
          defaultValue: 'INR',
          required: true,
        },
        money('subtotal'),
        money('discount'),
        money('total'),
      ],
    },
    { name: 'coupon', type: 'relationship', relationTo: 'coupons' },
    {
      name: 'tax',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'mode',
              type: 'select',
              options: TAX_MODES,
              required: true,
              defaultValue: 'none',
            },
            { name: 'ratePercent', type: 'number', required: true, defaultValue: 0 },
            money('taxable'),
          ],
        },
        {
          type: 'row',
          fields: [money('cgst', 'CGST'), money('sgst', 'SGST'), money('igst', 'IGST')],
        },
      ],
    },
    {
      name: 'billing',
      type: 'group',
      admin: { description: 'As entered at checkout; printed on the invoice.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'phone', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'country', type: 'text', required: true, defaultValue: 'IN' },
            { name: 'stateCode', type: 'text', required: true },
            { name: 'stateName', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'businessName', type: 'text' },
            { name: 'gstin', label: 'GSTIN', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'acceptance',
      type: 'group',
      admin: { description: 'The Terms and EULA versions the customer accepted at checkout.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'termsVersion', type: 'text', required: true },
            { name: 'eulaVersion', type: 'text', required: true },
            { name: 'at', type: 'date', required: true },
            { name: 'ipHash', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Razorpay',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'razorpayOrderId', type: 'text', unique: true, index: true },
            { name: 'razorpayPaymentId', type: 'text', unique: true },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'invoice', type: 'relationship', relationTo: 'invoices' },
        { name: 'creditNotes', type: 'relationship', relationTo: 'invoices', hasMany: true },
      ],
    },
    {
      // JSON so that concurrent writers (verify, webhooks, jobs) append atomically in SQL.
      name: 'events',
      type: 'json',
      defaultValue: [],
      admin: { description: 'What happened to this order, oldest first.' },
    },
  ],
}
