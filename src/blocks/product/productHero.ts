import type { Block } from 'payload'

export const ProductHero: Block = {
  slug: 'productHero',
  interfaceName: 'ProductHeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'eyebrow', type: 'text', localized: true },
    { name: 'heading', type: 'text', localized: true },
    { name: 'subheading', type: 'textarea', localized: true },
    { name: 'media', type: 'upload', relationTo: 'media' },
    {
      name: 'animation',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'MenuMesh', value: 'menumesh' },
        { label: 'VYRO', value: 'vyro' },
        { label: 'Baby', value: 'baby' },
      ],
      admin: { description: 'Signature animation in place of the media.' },
    },
    {
      // "Hear Baby speak" (spec §14): played on click only.
      name: 'samples',
      label: 'Voice samples',
      type: 'array',
      maxRows: 4,
      admin: {
        condition: (_, siblingData) => siblingData?.animation === 'baby',
        description: 'Short audio clips of the assistant speaking, played on click.',
      },
      fields: [
        { name: 'label', type: 'text', localized: true, required: true },
        { name: 'audio', type: 'upload', relationTo: 'media', required: true },
        { name: 'transcript', type: 'textarea', localized: true },
      ],
    },
  ],
}
