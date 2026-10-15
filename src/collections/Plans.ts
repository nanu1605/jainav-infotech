import type {
  CollectionConfig,
  NumberFieldSingleValidation,
  TextFieldSingleValidation,
} from 'payload'
import { text as validateText } from 'payload/shared'

import { anyone, contentEditors } from '@/access/roles'
import { integer } from '@/fields/validators'
import { revalidateCollection } from '@/hooks/revalidate'

// The code appears in checkout URLs and license tokens (spec §11, §12.3).
const planCode: TextFieldSingleValidation = (value, options) =>
  value && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? 'Use lowercase letters, digits and hyphens, e.g. pro'
    : validateText(value, options)

const priceRequiredWhenActive: NumberFieldSingleValidation = (value, options) =>
  value == null && (options.siblingData as { active?: boolean }).active
    ? 'Active plans need an INR price'
    : integer(value, options)

export const Plans: CollectionConfig = {
  slug: 'plans',
  admin: {
    group: 'Products',
    useAsTitle: 'name',
    defaultColumns: ['name', 'product', 'code', 'billing', 'priceINR', 'active'],
    listSearchableFields: ['name', 'code'],
    description: 'Prices are whole numbers in the smallest unit: paise for INR, cents for USD.',
  },
  defaultSort: 'sortOrder',
  indexes: [{ fields: ['product', 'code'], unique: true }],
  access: {
    read: anyone,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  hooks: {
    ...revalidateCollection({ tag: 'plans' }),
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'code',
          type: 'text',
          required: true,
          validate: planCode,
          admin: { width: '50%', description: 'Unique per product, e.g. free or pro.' },
        },
        { name: 'name', type: 'text', localized: true, required: true, admin: { width: '50%' } },
      ],
    },
    { name: 'description', type: 'textarea', localized: true },
    {
      type: 'row',
      fields: [
        {
          name: 'billing',
          type: 'select',
          required: true,
          defaultValue: 'one_time',
          options: [
            { label: 'One-time', value: 'one_time' },
            { label: 'Yearly', value: 'yearly' },
            { label: 'Monthly', value: 'monthly' },
          ],
          admin: { width: '34%' },
        },
        {
          name: 'priceINR',
          label: 'Price (INR, paise)',
          type: 'number',
          min: 0,
          validate: priceRequiredWhenActive,
          admin: { width: '33%', step: 1, description: 'GST-inclusive. ₹999 = 99900 paise.' },
        },
        {
          name: 'priceUSD',
          label: 'Price (USD, cents)',
          type: 'number',
          min: 0,
          validate: integer,
          admin: { width: '33%', step: 1, description: 'Optional. $9.99 = 999 cents.' },
        },
      ],
    },
    {
      name: 'features',
      type: 'array',
      fields: [{ name: 'text', type: 'text', localized: true, required: true }],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'maxActivations',
          type: 'number',
          defaultValue: 2,
          min: 1,
          validate: integer,
          admin: { width: '50%', step: 1, description: 'Devices per license.' },
        },
        {
          name: 'updatesForMonths',
          type: 'number',
          min: 1,
          validate: integer,
          admin: { width: '50%', step: 1, description: 'Leave empty for lifetime updates.' },
        },
      ],
    },
    {
      name: 'highlight',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Emphasise on the pricing table.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Inactive plans are hidden and cannot be bought.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      validate: integer,
      admin: { position: 'sidebar', step: 1 },
    },
  ],
}
