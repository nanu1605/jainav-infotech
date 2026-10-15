import type { Block, Condition } from 'payload'

import { linkField } from '@/fields/link'

const customButtons: Condition = (_, siblingData) => !siblingData?.useProductButtons

export const CtaBand: Block = {
  slug: 'ctaBand',
  interfaceName: 'ProductCtaBandBlock',
  labels: { singular: 'Call to action band', plural: 'Call to action bands' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'text', type: 'textarea', localized: true },
    {
      name: 'useProductButtons',
      label: "Use the product's buttons",
      type: 'checkbox',
      defaultValue: true,
    },
    {
      ...linkField({ name: 'primary', label: 'Primary button' }),
      admin: { condition: customButtons },
    },
    {
      ...linkField({ name: 'secondary', label: 'Secondary button' }),
      admin: { condition: customButtons },
    },
  ],
}
