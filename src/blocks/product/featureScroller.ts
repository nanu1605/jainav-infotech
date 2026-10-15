import type { Block } from 'payload'

export const FeatureScroller: Block = {
  slug: 'featureScroller',
  interfaceName: 'ProductFeatureScrollerBlock',
  labels: { singular: 'Feature scroller', plural: 'Feature scrollers' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'items',
      type: 'array',
      admin: { description: 'The media changes as each feature scrolls into view.' },
      fields: [
        { name: 'title', type: 'text', localized: true, required: true },
        { name: 'text', type: 'textarea', localized: true },
        { name: 'media', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
