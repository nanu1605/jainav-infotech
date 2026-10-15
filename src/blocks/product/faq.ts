import type { Block } from 'payload'

export const Faq: Block = {
  slug: 'faq',
  interfaceName: 'ProductFaqBlock',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      admin: { description: "Leave empty to show this product's FAQs." },
    },
  ],
}
