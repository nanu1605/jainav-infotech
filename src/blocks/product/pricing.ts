import type { Block, Condition } from 'payload'

import { httpUrl } from '@/fields/validators'

const manual: Condition = (_, siblingData) => siblingData?.source === 'manual'

export const Pricing: Block = {
  slug: 'pricing',
  interfaceName: 'ProductPricingBlock',
  labels: { singular: 'Pricing table', plural: 'Pricing tables' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'plans',
      options: [
        { label: 'Plans (hosted products)', value: 'plans' },
        { label: 'Manual tiers (external products)', value: 'manual' },
      ],
    },
    {
      name: 'tiers',
      type: 'array',
      admin: { condition: manual },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              localized: true,
              required: true,
              admin: { width: '50%' },
            },
            {
              name: 'price',
              type: 'text',
              localized: true,
              admin: { width: '50%', placeholder: '₹499/month', description: 'Display only.' },
            },
          ],
        },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'text', type: 'text', localized: true, required: true }],
        },
        { name: 'highlight', type: 'checkbox' },
      ],
    },
    {
      name: 'fullPricingUrl',
      label: '"See full pricing" URL',
      type: 'text',
      validate: httpUrl,
      admin: { condition: manual },
    },
  ],
}
