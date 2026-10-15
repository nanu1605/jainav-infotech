import type { Block } from 'payload'

export const Comparison: Block = {
  slug: 'comparison',
  interfaceName: 'ProductComparisonBlock',
  labels: { singular: 'Comparison table', plural: 'Comparison tables' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'columns',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              localized: true,
              required: true,
              admin: { width: '70%' },
            },
            { name: 'highlight', type: 'checkbox', admin: { width: '30%' } },
          ],
        },
      ],
    },
    {
      name: 'rows',
      type: 'array',
      fields: [
        { name: 'feature', type: 'text', localized: true, required: true },
        {
          name: 'cells',
          type: 'array',
          admin: { description: 'One cell per column, in column order.' },
          fields: [{ name: 'value', type: 'text', localized: true }],
        },
      ],
    },
  ],
}
