import type { Block } from 'payload'

export const Principles: Block = {
  slug: 'principles',
  interfaceName: 'PagePrinciplesBlock',
  labels: { singular: 'Principles', plural: 'Principles' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'icon',
          type: 'text',
          admin: { description: 'Lucide icon name, e.g. shield-check.' },
        },
        { name: 'title', type: 'text', localized: true, required: true },
        { name: 'text', type: 'textarea', localized: true },
      ],
    },
  ],
}
