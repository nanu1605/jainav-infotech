import type { Block } from 'payload'

export const Process: Block = {
  slug: 'process',
  interfaceName: 'PageProcessBlock',
  labels: { singular: 'Process', plural: 'Processes' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true, required: true },
        { name: 'text', type: 'textarea', localized: true },
      ],
    },
  ],
}
