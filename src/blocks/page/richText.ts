import type { Block } from 'payload'

export const RichText: Block = {
  slug: 'richText',
  interfaceName: 'PageRichTextBlock',
  labels: { singular: 'Rich text', plural: 'Rich text' },
  fields: [{ name: 'content', type: 'richText', localized: true, required: true }],
}
