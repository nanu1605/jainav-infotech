import type { Block } from 'payload'

export const ProductShowcase: Block = {
  slug: 'productShowcase',
  interfaceName: 'PageProductShowcaseBlock',
  labels: { singular: 'Product showcase', plural: 'Product showcases' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    { name: 'intro', type: 'textarea', localized: true },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'featured',
      options: [
        { label: 'Featured products (admin order)', value: 'featured' },
        { label: 'Selected products', value: 'selected' },
      ],
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: { condition: (_, siblingData) => siblingData?.mode === 'selected' },
    },
  ],
}
