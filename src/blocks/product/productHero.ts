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
  ],
}
