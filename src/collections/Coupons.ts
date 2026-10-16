import type { CollectionConfig, FieldHook, NumberFieldSingleValidation } from 'payload'

import { ownerOnly, storeStaff } from '@/access/roles'
import { integer } from '@/fields/validators'

const upper: FieldHook = ({ value }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value

const couponValue: NumberFieldSingleValidation = (value, options) => {
  const { kind } = options.siblingData as { kind?: string }
  if (value != null && kind === 'percent' && (value < 1 || value > 100)) {
    return 'A percentage from 1 to 100'
  }
  if (value != null && value < 1) return 'Must be at least 1'
  return integer(value, options)
}

/**
 * Discount codes (spec §11.5), checked on the server at checkout and applied before tax. The
 * fulfilment transaction counts redemptions; a code can't take an order under ₹1, so free copies
 * are complimentary licenses instead (Phase 8).
 */
export const Coupons: CollectionConfig = {
  slug: 'coupons',
  admin: {
    group: 'Store',
    useAsTitle: 'code',
    defaultColumns: ['code', 'kind', 'value', 'redemptions', 'validTo', 'active'],
  },
  access: { read: storeStaff, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'code',
          type: 'text',
          required: true,
          unique: true,
          hooks: { beforeValidate: [upper] },
          validate: (value: string | null | undefined) =>
            !value || /^[A-Z0-9-]{3,32}$/.test(value) ? true : '3–32 letters, digits or hyphens',
          admin: { width: '40%' },
        },
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'percent',
          options: [
            { label: 'Percent off', value: 'percent' },
            { label: 'Fixed amount off', value: 'fixed' },
          ],
          admin: { width: '30%' },
        },
        {
          name: 'value',
          type: 'number',
          required: true,
          validate: couponValue,
          admin: { width: '30%', step: 1, description: 'Percent, or paise for a fixed amount.' },
        },
      ],
    },
    {
      name: 'currency',
      type: 'select',
      options: ['INR'],
      defaultValue: 'INR',
      required: true,
      admin: { condition: (_, sibling) => sibling.kind === 'fixed' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'products',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          admin: { width: '50%', description: 'Empty: every product.' },
        },
        {
          name: 'plans',
          type: 'relationship',
          relationTo: 'plans',
          hasMany: true,
          admin: { width: '50%', description: 'Empty: every plan.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'validFrom',
          type: 'date',
          admin: { width: '50%', description: 'First day it works (India time).' },
        },
        {
          name: 'validTo',
          type: 'date',
          admin: { width: '50%', description: 'Last day it works (India time).' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'maxRedemptions',
          type: 'number',
          min: 1,
          validate: integer,
          admin: { width: '33%', step: 1, description: 'Empty: unlimited.' },
        },
        {
          name: 'perCustomerLimit',
          type: 'number',
          min: 1,
          validate: integer,
          admin: { width: '33%', step: 1, description: 'Empty: unlimited.' },
        },
        {
          name: 'redemptions',
          type: 'number',
          defaultValue: 0,
          access: { create: () => false, update: () => false },
          admin: { width: '34%', readOnly: true },
        },
      ],
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
