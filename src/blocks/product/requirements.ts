import type { Block } from 'payload'

export const Requirements: Block = {
  slug: 'requirements',
  interfaceName: 'ProductRequirementsBlock',
  labels: { singular: 'System requirements', plural: 'System requirements' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'rows',
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
              admin: { width: '30%' },
            },
            { name: 'minimum', type: 'text', localized: true, admin: { width: '35%' } },
            { name: 'recommended', type: 'text', localized: true, admin: { width: '35%' } },
          ],
        },
      ],
    },
  ],
}
