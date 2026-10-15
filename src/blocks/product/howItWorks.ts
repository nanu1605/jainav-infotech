import type { Block } from 'payload'

export const HowItWorks: Block = {
  slug: 'howItWorks',
  interfaceName: 'ProductHowItWorksBlock',
  labels: { singular: 'How it works', plural: 'How it works' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true, required: true },
        { name: 'text', type: 'textarea', localized: true },
        { name: 'media', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
